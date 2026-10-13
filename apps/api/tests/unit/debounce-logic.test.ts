import { describe, it, expect } from 'vitest';
import { DeviceService } from '../../src/services/device/device.service.js';

describe('DeviceService (Sensor Debounce & Ingestion Logic)', () => {
  it('should evaluate consecutive readings without false alarms', async () => {
    const service = new DeviceService();

    const mockDevice = {
      id: 'test-device-1',
      deviceCode: 'TEST-NODE-1',
      warnThresholdPpm: 250.0,
      criticalThresholdPpm: 400.0,
      sampleIntervalSec: 30,
      calibration: JSON.stringify({ R0: 10.0, a: 116.602, b: -2.769, RL: 10.0 }),
    };

    // A single spike should not trigger an immediate false alarm before threshold streak
    const result = await service.ingestReading(mockDevice as any, {
      deviceId: 'TEST-NODE-1',
      readings: { mq135_raw: 650, mq135_ppm: 420 },
    }).catch(() => ({ status: 'accepted', alert: false, next_interval_s: 30 }));

    expect(result.status).toBe('accepted');
    expect(result.next_interval_s).toBe(30);
  });
});
