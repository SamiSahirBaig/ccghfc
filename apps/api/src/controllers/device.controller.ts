import { Request, Response } from 'express';
import { z } from 'zod';
import { deviceService } from '../services/device/device.service.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const SingleReadingSchema = z.object({
  deviceId: z.string().min(1),
  ts: z.number().optional(),
  readings: z.object({
    mq135_raw: z.number(),
    mq135_ppm: z.number().optional(),
    temperature_c: z.number().optional(),
    humidity: z.number().optional(),
  }),
  battery_v: z.number().optional(),
  fw: z.string().optional(),
});

export class DeviceController {
  public static async ingestReading(req: Request, res: Response) {
    const deviceIdHeader = (req.headers['x-device-id'] as string) || req.body.deviceId;
    const apiKeyHeader = req.headers['x-api-key'] as string;
    const signatureHeader = req.headers['x-signature'] as string;
    const timestampHeader = req.headers['x-timestamp'] as string;

    if (!deviceIdHeader || !apiKeyHeader) {
      return res.status(401).json({
        success: false,
        error: { message: 'Missing hardware authentication headers: X-Device-Id and X-Api-Key.' },
      });
    }

    const payload = SingleReadingSchema.parse(req.body);

    const device = await deviceService.authenticateDevice(
      deviceIdHeader,
      apiKeyHeader,
      JSON.stringify(req.body),
      signatureHeader,
      timestampHeader
    );

    if (!device) {
      return res.status(401).json({
        success: false,
        error: { message: 'Hardware device authentication failed.' },
      });
    }

    const result = await deviceService.ingestReading(device, payload);

    return res.status(202).json({
      status: result.status,
      alert: result.alert,
      next_interval_s: result.next_interval_s,
    });
  }

  public static async ingestBatch(req: Request, res: Response) {
    const deviceIdHeader = req.headers['x-device-id'] as string;
    const apiKeyHeader = req.headers['x-api-key'] as string;

    if (!deviceIdHeader || !apiKeyHeader) {
      return res.status(401).json({
        success: false,
        error: { message: 'Missing hardware authentication headers.' },
      });
    }

    const device = await deviceService.authenticateDevice(deviceIdHeader, apiKeyHeader);
    if (!device) {
      return res.status(401).json({ success: false, error: { message: 'Invalid device credentials.' } });
    }

    const readings = z.array(SingleReadingSchema).parse(req.body);
    const result = await deviceService.ingestBatch(device, readings);

    return res.status(202).json(result);
  }

  public static async heartbeat(req: Request, res: Response) {
    const deviceIdHeader = req.headers['x-device-id'] as string;
    const apiKeyHeader = req.headers['x-api-key'] as string;

    if (!deviceIdHeader || !apiKeyHeader) {
      return res.status(401).json({ success: false, error: { message: 'Device authentication required' } });
    }

    const device = await deviceService.authenticateDevice(deviceIdHeader, apiKeyHeader);
    if (!device) {
      return res.status(401).json({ success: false, error: { message: 'Invalid device credentials' } });
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { lastSeen: new Date(), status: 'ONLINE' },
    });

    return res.json({
      serverTime: Math.floor(Date.now() / 1000),
      config: {
        warnThresholdPpm: device.warnThresholdPpm,
        criticalThresholdPpm: device.criticalThresholdPpm,
        sampleIntervalSec: device.sampleIntervalSec,
      },
    });
  }

  public static async getConfig(req: Request, res: Response) {
    const deviceIdHeader = req.headers['x-device-id'] as string;
    const apiKeyHeader = req.headers['x-api-key'] as string;

    const device = await deviceService.authenticateDevice(deviceIdHeader, apiKeyHeader);
    if (!device) {
      return res.status(401).json({ success: false, error: { message: 'Invalid device credentials' } });
    }

    let calibration = { R0: 10.0, a: 116.602, b: -2.769 };
    try {
      if (device.calibration) calibration = JSON.parse(device.calibration);
    } catch (e) {
      // default
    }

    return res.json({
      thresholds: {
        warn_ppm: device.warnThresholdPpm,
        critical_ppm: device.criticalThresholdPpm,
      },
      sampleIntervalSec: device.sampleIntervalSec,
      calibration,
      firmwareLatest: '1.0.0',
    });
  }
}
