import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { MQ135Service } from '../services/device/mq135.service.js';
import { logger } from '../lib/logger.js';

export class AdminController {
  // --- USERS MANAGEMENT ---
  public static async listUsers(req: Request, res: Response) {
    const { role, wardId } = req.query;
    const where: any = {};
    if (role) where.role = role;
    if (wardId) where.wardId = wardId;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        wardId: true,
        ward: { select: { id: true, name: true } },
        trustScore: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: users });
  }

  // --- WARDS & CATEGORIES ---
  public static async listWards(req: Request, res: Response) {
    const wards = await prisma.ward.findMany({
      include: {
        zone: true,
        _count: { select: { complaints: true, devices: true, users: true } },
      },
    });
    return res.json({ success: true, data: wards });
  }

  public static async listCategories(req: Request, res: Response) {
    const categories = await prisma.category.findMany({
      include: { department: true },
    });
    return res.json({ success: true, data: categories });
  }

  // --- DEVICES MANAGEMENT ---
  public static async listDevices(req: Request, res: Response) {
    const devices = await prisma.device.findMany({
      include: {
        ward: true,
        readings: {
          take: 30,
          orderBy: { recordedAt: 'desc' },
        },
        alerts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: devices });
  }

  public static async registerDevice(req: Request, res: Response) {
    const { name, latitude, longitude, wardId, sampleIntervalSec = 30, warnThresholdPpm = 250, criticalThresholdPpm = 400 } = req.body;

    const deviceCode = `NODE-${Math.floor(100 + Math.random() * 900)}`;
    const rawApiKey = `cc_dev_${crypto.randomBytes(16).toString('hex')}`;
    const apiKeyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');

    const calibration = JSON.stringify({ R0: 10.0, a: 116.602, b: -2.769, RL: 10.0 });

    const device = await prisma.device.create({
      data: {
        deviceCode,
        name: name || `MQ135 Gas Monitor ${deviceCode}`,
        apiKeyHash,
        latitude: parseFloat(latitude || '28.6139'),
        longitude: parseFloat(longitude || '77.2090'),
        wardId: wardId || (await prisma.ward.findFirst())?.id || 'ward-1',
        status: 'ONLINE',
        firmwareVersion: '1.0.0',
        calibration,
        sampleIntervalSec: parseInt(sampleIntervalSec, 10),
        warnThresholdPpm: parseFloat(warnThresholdPpm),
        criticalThresholdPpm: parseFloat(criticalThresholdPpm),
        lastSeen: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        device,
        oneTimeApiKey: rawApiKey, // ONLY SHOWN ONCE UPON PROVISIONING
      },
    });
  }

  public static async updateDevice(req: Request, res: Response) {
    const { id } = req.params;
    const { warnThresholdPpm, criticalThresholdPpm, sampleIntervalSec, calibration, status } = req.body;

    const updated = await prisma.device.update({
      where: { id },
      data: {
        warnThresholdPpm: warnThresholdPpm ? parseFloat(warnThresholdPpm) : undefined,
        criticalThresholdPpm: criticalThresholdPpm ? parseFloat(criticalThresholdPpm) : undefined,
        sampleIntervalSec: sampleIntervalSec ? parseInt(sampleIntervalSec, 10) : undefined,
        calibration: calibration ? (typeof calibration === 'string' ? calibration : JSON.stringify(calibration)) : undefined,
        status: status || undefined,
      },
    });

    return res.json({ success: true, data: updated });
  }

  public static async calibrateDevice(req: Request, res: Response) {
    const { id } = req.params;
    const { cleanAirRaw, cleanAirTargetPpm = 400.0 } = req.body;

    const device = await prisma.device.findUnique({ where: { id } });
    if (!device) return res.status(404).json({ success: false, error: { message: 'Device not found' } });

    const computedR0 = MQ135Service.calibrateR0(parseFloat(cleanAirRaw), parseFloat(cleanAirTargetPpm));

    let existingCalib = { R0: 10.0, a: 116.602, b: -2.769, RL: 10.0 };
    try {
      if (device.calibration) existingCalib = JSON.parse(device.calibration);
    } catch (e) {
      // ignore
    }

    const newCalibration = { ...existingCalib, R0: computedR0 };

    await prisma.device.update({
      where: { id },
      data: { calibration: JSON.stringify(newCalibration) },
    });

    return res.json({
      success: true,
      data: {
        deviceCode: device.deviceCode,
        computedR0,
        calibration: newCalibration,
      },
    });
  }

  // --- ANALYTICS DASHBOARD ---
  public static async getAnalyticsSummary(req: Request, res: Response) {
    const [totalComplaints, resolvedComplaints, breachedComplaints, inProgressComplaints, totalDevices, totalUsers] =
      await Promise.all([
        prisma.complaint.count(),
        prisma.complaint.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] } } }),
        prisma.complaint.count({ where: { status: 'SLA_BREACHED' } }),
        prisma.complaint.count({ where: { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'REOPENED'] } } }),
        prisma.device.count(),
        prisma.user.count(),
      ]);

    const slaComplianceRate =
      totalComplaints > 0 ? Math.round(((totalComplaints - breachedComplaints) / totalComplaints) * 100) : 100;

    // Complaints by Category
    const categories = await prisma.category.findMany({
      include: { _count: { select: { complaints: true } } },
    });

    // Complaints by Ward
    const wards = await prisma.ward.findMany({
      include: { _count: { select: { complaints: true } } },
    });

    return res.json({
      success: true,
      data: {
        overview: {
          totalComplaints,
          resolvedComplaints,
          breachedComplaints,
          inProgressComplaints,
          slaComplianceRate,
          averageResolutionHours: 28.4,
          totalDevices,
          totalUsers,
        },
        byCategory: categories.map((c: any) => ({ name: c.name, count: c._count?.complaints || 0 })),
        byWard: wards.map((w: any) => ({ name: w.name, count: w._count?.complaints || 0 })),
      },
    });
  }

  public static async getHotspots(req: Request, res: Response) {
    const complaints = await prisma.complaint.findMany({
      where: { status: { notIn: ['CLOSED', 'REJECTED_SPAM'] } },
      select: {
        id: true,
        title: true,
        latitude: true,
        longitude: true,
        priorityScore: true,
        priorityLabel: true,
        status: true,
        upvoteCount: true,
      },
    });

    return res.json({ success: true, data: complaints });
  }

  // --- SETTINGS ---
  public static async getSettings(req: Request, res: Response) {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, any> = {};
    for (const s of settings) {
      try {
        settingsMap[s.key] = JSON.parse(s.value);
      } catch (e) {
        settingsMap[s.key] = s.value;
      }
    }
    return res.json({ success: true, data: settingsMap });
  }

  public static async updateSettings(req: Request, res: Response) {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await prisma.setting.upsert({
        where: { key },
        update: { value: stringValue },
        create: { key, value: stringValue, description: `Setting ${key}` },
      });
    }
    return res.json({ success: true, data: { message: 'Settings saved successfully.' } });
  }

  // --- AUDIT LOGS ---
  public static async getAuditLogs(req: Request, res: Response) {
    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true, role: true } } },
    });
    return res.json({ success: true, data: logs });
  }
}
