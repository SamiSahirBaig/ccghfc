import { describe, it, expect } from 'vitest';
import { MQ135Service } from '../../src/services/device/mq135.service.js';

describe('MQ135Service (Gas Sensor Physics & Calibration)', () => {
  it('should compute valid sensor resistance Rs from raw analog value', () => {
    const raw = 512; // Midpoint 10-bit ADC
    const Rs = MQ135Service.rawToRs(raw, 10, 5.0, 10.0);
    // At midpoint, Vrl ≈ 2.5V, Rs ≈ ((5 - 2.5)/2.5)*10 = 10.0 kΩ
    expect(Rs).toBeCloseTo(10.0, 1);
  });

  it('should compute PPM using standard curve formula', () => {
    const raw = 650;
    const ppm = MQ135Service.calculatePpm(raw);
    expect(ppm).toBeGreaterThan(0);
    expect(typeof ppm).toBe('number');
  });

  it('should calibrate clean air R0 accurately', () => {
    const cleanAirRaw = 350;
    const targetCleanAirPpm = 400.0;
    const R0 = MQ135Service.calibrateR0(cleanAirRaw, targetCleanAirPpm);
    expect(R0).toBeGreaterThan(0);

    // Verify that using the calibrated R0 with the cleanAirRaw reproduces ~400 PPM
    const verifiedPpm = MQ135Service.calculatePpm(cleanAirRaw, { R0 });
    expect(verifiedPpm).toBeCloseTo(400.0, -1);
  });

  it('should correctly evaluate air hazard severity levels', () => {
    const good = MQ135Service.evaluateSeverity(80);
    expect(good.category).toBe('GOOD');
    expect(good.isAlert).toBe(false);

    const warning = MQ135Service.evaluateSeverity(280);
    expect(warning.category).toBe('POOR');
    expect(warning.isAlert).toBe(true);
    expect(warning.isCritical).toBe(false);

    const critical = MQ135Service.evaluateSeverity(480);
    expect(critical.category).toBe('HAZARDOUS');
    expect(critical.isAlert).toBe(true);
    expect(critical.isCritical).toBe(true);
  });
});
