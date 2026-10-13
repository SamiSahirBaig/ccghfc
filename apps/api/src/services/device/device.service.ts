import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { MQ135Service, MQ135Calibration } from './mq135.service.js';
import { sseService } from '../sse/sse.service.js';
import { slaService } from '../queue/sla-escalation.service.js';
import { config } from '../../config/index.js';

export interface DeviceReadingPayload {
  deviceId: string;
  ts?: number;
  readings: {
    mq135_raw: number;
    mq135_ppm?: number;
    temperature_c?: number;
    humidity?: number;
  };
  battery_v?: number;
  fw?: string;
}

export class DeviceService {
  // In-memory sliding window for consecutive high readings: deviceCode -> { warnCount, criticalCount, lastPpm }
  private readingWindows = new Map<string, { warnCount: number; criticalCount: number; lastPpm: number }>();

  /**
   * Authenticate hardware device via API key and optional HMAC signature
   */
  public async authenticateDevice(
    deviceCode: string,
    apiKey: string,
    bodyRaw?: string,
    signature?: string,
    timestamp?: string
  ): Promise<any | null> {
    try {
      const device = await prisma.device.findUnique({
        where: { deviceCode },
      });

      if (!device) {
        logger.warn({ deviceCode }, 'Device not found during authentication');
        return null;
      }

      // Verify API key (using bcrypt or crypto SHA256)
      const keyMatches =
        device.apiKeyHash === crypto.createHash('sha256').update(apiKey).digest('hex') ||
        (await bcrypt.compare(apiKey, device.apiKeyHash).catch(() => false));

      if (!keyMatches) {
        logger.warn({ deviceCode }, 'Invalid device API key provided');
        return null;
      }

      // Check HMAC signature if enabled
      if (config.device.enableHmac && signature && bodyRaw && timestamp) {
        const ts = parseInt(timestamp, 10);
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - ts) > config.device.clockSkewToleranceSeconds) {
          logger.warn({ deviceCode, skew: Math.abs(now - ts) }, 'Device timestamp clock skew rejected');
          return null;
        }

        const expectedSignature = crypto
          .createHmac('sha256', apiKey)
          .update(`${timestamp}.${bodyRaw}`)
          .digest('hex');

        if (signature !== expectedSignature) {
          logger.warn({ deviceCode }, 'Invalid HMAC signature provided');
          return null;
        }
      }

      return device;
    } catch (err) {
      logger.error({ err, deviceCode }, 'Error during device authentication');
      return null;
    }
  }

  /**
   * Process a single reading payload from an authenticated device
   */
  public async ingestReading(device: any, payload: DeviceReadingPayload): Promise<{ status: string; alert: boolean; next_interval_s: number }> {
    const rawValue = payload.readings.mq135_raw;
    let calibration: MQ135Calibration | undefined;

    try {
      if (device.calibration) {
        calibration = JSON.parse(device.calibration);
      }
    } catch (e) {
      // use default
    }

    // Compute PPM using MQ135 formula
    const computedPpm = payload.readings.mq135_ppm ?? MQ135Service.calculatePpm(rawValue, calibration);

    const recordedAt = payload.ts ? new Date(payload.ts * 1000) : new Date();

    // 1. Save reading to sensor_readings table
    await prisma.sensorReading.create({
      data: {
        deviceId: device.id,
        recordedAt,
        rawValue,
        ppm: computedPpm,
        temperatureC: payload.readings.temperature_c,
        humidity: payload.readings.humidity,
        batteryV: payload.battery_v,
      },
    });

    // 2. Update device last seen & status
    const newStatus = computedPpm >= device.criticalThresholdPpm ? 'CRITICAL' : computedPpm >= device.warnThresholdPpm ? 'WARNING' : 'ONLINE';
    await prisma.device.update({
      where: { id: device.id },
      data: {
        lastSeen: new Date(),
        status: newStatus,
        firmwareVersion: payload.fw || device.firmwareVersion,
      },
    });

    // 3. Broadcast real-time telemetry over SSE
    sseService.broadcastDeviceReading(device.id, {
      deviceId: device.id,
      deviceCode: device.deviceCode,
      recordedAt,
      raw: rawValue,
      ppm: computedPpm,
      temperatureC: payload.readings.temperature_c,
      humidity: payload.readings.humidity,
      status: newStatus,
    });

    // 4. Consecutive readings evaluation & Auto-Complaint generation
    const alertResult = await this.evaluateConsecutiveReadings(device, computedPpm);

    return {
      status: 'accepted',
      alert: alertResult,
      next_interval_s: device.sampleIntervalSec || 30,
    };
  }

  /**
   * Ingest array of offline-buffered batch readings (max 200)
   */
  public async ingestBatch(device: any, readings: DeviceReadingPayload[]): Promise<{ count: number; status: string }> {
    let count = 0;
    for (const item of readings.slice(0, 200)) {
      await this.ingestReading(device, item);
      count++;
    }
    return { count, status: 'batch_accepted' };
  }

  /**
   * Sliding window evaluator for consecutive thresholds (default 5 readings within 5 min)
   */
  private async evaluateConsecutiveReadings(device: any, currentPpm: number): Promise<boolean> {
    const key = device.deviceCode;
    let window = this.readingWindows.get(key);
    if (!window) {
      window = { warnCount: 0, criticalCount: 0, lastPpm: currentPpm };
      this.readingWindows.set(key, window);
    }

    if (currentPpm >= device.criticalThresholdPpm) {
      window.criticalCount++;
      window.warnCount++;
    } else if (currentPpm >= device.warnThresholdPpm) {
      window.warnCount++;
      window.criticalCount = 0; // reset critical streak
    } else {
      window.warnCount = 0;
      window.criticalCount = 0;
    }
    window.lastPpm = currentPpm;

    const thresholdStreak = 3; // N consecutive readings

    if (window.criticalCount >= thresholdStreak) {
      // Trigger critical alert and auto-complaint
      await this.triggerAutoComplaint(device, currentPpm, window.criticalCount);
      window.criticalCount = 0; // reset streak after complaint handled
      return true;
    } else if (window.warnCount >= thresholdStreak) {
      // Record warning alert
      await prisma.sensorAlert.create({
        data: {
          deviceId: device.id,
          severity: 'WARNING',
          ppm: currentPpm,
          message: `Sensor ${device.deviceCode} sustained elevated readings of ${currentPpm} PPM.`,
          complaintCreated: false,
        },
      });
      return true;
    }

    return false;
  }

  /**
   * Auto-create verified municipal complaint with source = SENSOR and 72h SLA
   */
  private async triggerAutoComplaint(device: any, ppm: number, consecutiveCount: number): Promise<void> {
    // Check Debounce / Cooldown:
    // Never open a second open sensor complaint for the same device;
    // append new data to the existing one and bump priority; cooldown 6h after resolution.
    const openSensorComplaint = await prisma.complaint.findFirst({
      where: {
        source: 'SENSOR',
        wardId: device.wardId,
        title: { contains: device.deviceCode },
        status: { notIn: ['RESOLVED', 'CLOSED', 'REJECTED_SPAM'] },
      },
    });

    if (openSensorComplaint) {
      // Debounce: update existing complaint priority and append description
      logger.info({ complaintId: openSensorComplaint.id, deviceCode: device.deviceCode }, 'Appending data to existing open sensor complaint');
      await prisma.complaint.update({
        where: { id: openSensorComplaint.id },
        data: {
          priorityScore: Math.min(100.0, openSensorComplaint.priorityScore + 10.0),
          priorityLabel: 'CRITICAL',
          description: `${openSensorComplaint.description}\n[UPDATE ${new Date().toLocaleTimeString()}]: Sustained spike at ${ppm} PPM.`,
        },
      });
      return;
    }

    // Check 6h cooldown after resolution
    const recentResolved = await prisma.complaint.findFirst({
      where: {
        source: 'SENSOR',
        wardId: device.wardId,
        title: { contains: device.deviceCode },
        status: 'RESOLVED',
        resolvedAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      },
    });

    if (recentResolved) {
      logger.info({ deviceCode: device.deviceCode }, 'Sensor complaint in 6h cooldown period, skipping duplicate creation');
      return;
    }

    // Find category for AIR_QUALITY_GAS_ODOR or fallback
    let category = await prisma.category.findFirst({
      where: { name: { contains: 'Air' } },
    });

    if (!category) {
      category = await prisma.category.findFirst();
    }

    if (!category) return;

    // Find assigned officer in ward
    const wardOfficer = await prisma.user.findFirst({
      where: { wardId: device.wardId, role: 'OFFICER' },
    });

    const publicCode = `CC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const slaDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const description = `Automated Environmental Alert: Sensor ${device.deviceCode} (${device.name}) recorded hazardous toxic gas/odor levels averaging ${ppm} PPM across ${consecutiveCount} consecutive intervals. Immediate ward inspection required.`;

    const complaint = await prisma.complaint.create({
      data: {
        publicCode,
        source: 'SENSOR',
        categoryId: category.id,
        title: `Hazardous Gas Spike: ${device.deviceCode} (${ppm} PPM)`,
        description,
        latitude: device.latitude,
        longitude: device.longitude,
        address: `IoT Node Location, Ward ${device.wardId}`,
        wardId: device.wardId,
        status: 'ASSIGNED',
        priorityScore: 88.0,
        priorityLabel: 'CRITICAL',
        aiSeverity: 9,
        slaDeadline,
        assignedOfficerId: wardOfficer?.id,
        upvoteCount: 0,
      },
    });

    // Record alert linked to complaint
    await prisma.sensorAlert.create({
      data: {
        deviceId: device.id,
        severity: 'CRITICAL',
        ppm,
        message: description,
        complaintCreated: true,
        complaintId: complaint.id,
      },
    });

    // Start 72-hour SLA schedule
    await slaService.scheduleSlaJobs(complaint.id, slaDeadline);

    // Broadcast complaint event to live feeds
    sseService.broadcastComplaintEvent({
      type: 'COMPLAINT_CREATED',
      complaint,
    });

    logger.info({ complaintId: complaint.id, publicCode, ppm }, 'Auto-complaint created successfully from IoT sensor alert');
  }

  /**
   * Periodic check: mark devices OFFLINE if silent > 3x sampleIntervalSec
   */
  public async checkOfflineDevices(): Promise<number> {
    try {
      const devices = await prisma.device.findMany({
        where: { status: { not: 'OFFLINE' } },
      });

      let markedOffline = 0;
      const now = Date.now();

      for (const d of devices) {
        if (!d.lastSeen) continue;
        const silenceThresholdMs = (d.sampleIntervalSec || 30) * 3 * 1000;
        if (now - d.lastSeen.getTime() > silenceThresholdMs) {
          await prisma.device.update({
            where: { id: d.id },
            data: { status: 'OFFLINE' },
          });
          markedOffline++;
          logger.warn({ deviceCode: d.deviceCode }, 'IoT Device silent > 3x interval, marked OFFLINE');
        }
      }
      return markedOffline;
    } catch (e) {
      return 0;
    }
  }
}

export const deviceService = new DeviceService();
