/**
 * MQ135 Air Quality / Gas Sensor Calibration and PPM Conversion Service
 * 
 * Standard MQ135 characteristic curve for air pollution gases (NH3, NOx, Alcohol, Benzene, Smoke, CO2):
 * Formula: PPM = a * (Rs / R0)^b
 * 
 * Circuit constants:
 * - Vcc = 5.0 V (or 3.3V with voltage divider)
 * - RL = 10.0 kΩ (load resistance on board)
 * - R0 = Sensor resistance in fresh air (determined via 24-48h burn-in calibration)
 * - Curve constants for NH3 / mixed harmful gases:
 *   a = 116.6020682
 *   b = -2.769034857
 */

export interface MQ135Calibration {
  R0: number; // Resistance in clean air (kΩ), default ~10.0
  a: number;  // Scaling coefficient, default 116.602
  b: number;  // Exponent coefficient, default -2.769
  RL: number; // Load resistance (kΩ), default 10.0
}

export const DEFAULT_MQ135_CALIBRATION: MQ135Calibration = {
  R0: 10.0,
  a: 116.6020682,
  b: -2.769034857,
  RL: 10.0,
};

export class MQ135Service {
  /**
   * Convert ADC raw reading to sensor resistance Rs (in kΩ)
   */
  public static rawToRs(
    raw: number,
    adcBits: number = 10,
    vcc: number = 5.0,
    RL: number = DEFAULT_MQ135_CALIBRATION.RL
  ): number {
    const maxAdc = Math.pow(2, adcBits) - 1;
    const clampedRaw = Math.max(1, Math.min(raw, maxAdc - 1)); // prevent division by zero or negative
    const vRL = (clampedRaw / maxAdc) * vcc;
    const Rs = ((vcc - vRL) / vRL) * RL;
    return Rs;
  }

  /**
   * Convert raw ADC value to gas concentration in Parts Per Million (PPM)
   */
  public static calculatePpm(
    raw: number,
    calibration: Partial<MQ135Calibration> = {},
    adcBits: number = 10,
    vcc: number = 5.0
  ): number {
    const config: MQ135Calibration = { ...DEFAULT_MQ135_CALIBRATION, ...calibration };
    const Rs = this.rawToRs(raw, adcBits, vcc, config.RL);
    const ratio = Rs / config.R0;

    // PPM = a * (Rs / R0)^b
    const ppm = config.a * Math.pow(ratio, config.b);
    return Math.max(0, Math.round(ppm * 10) / 10);
  }

  /**
   * Compute calibrated R0 from a clean-air raw ADC reading
   */
  public static calibrateR0(
    cleanAirRaw: number,
    cleanAirTargetPpm: number = 400.0, // Baseline clean outdoor air CO2/ambient ppm ~400
    adcBits: number = 10,
    vcc: number = 5.0,
    RL: number = DEFAULT_MQ135_CALIBRATION.RL
  ): number {
    const Rs = this.rawToRs(cleanAirRaw, adcBits, vcc, RL);
    const { a, b } = DEFAULT_MQ135_CALIBRATION;

    // From ppm = a * (Rs / R0)^b
    // (ppm / a) = (Rs / R0)^b
    // (ppm / a)^(1/b) = Rs / R0
    // R0 = Rs / ((ppm / a)^(1/b))
    const ratio = Math.pow(cleanAirTargetPpm / a, 1.0 / b);
    const R0 = Rs / ratio;
    return Math.round(R0 * 100) / 100;
  }

  /**
   * Evaluate severity and health hazard level for a given PPM value
   */
  public static evaluateSeverity(
    ppm: number,
    warnThreshold: number = 250.0,
    criticalThreshold: number = 400.0
  ): {
    isAlert: boolean;
    isCritical: boolean;
    category: 'GOOD' | 'MODERATE' | 'POOR' | 'HAZARDOUS';
    healthAdvice: string;
  } {
    if (ppm >= criticalThreshold) {
      return {
        isAlert: true,
        isCritical: true,
        category: 'HAZARDOUS',
        healthAdvice: 'Critical toxic gas / foul odor concentration detected. Rapid municipal dispatch required.',
      };
    }
    if (ppm >= warnThreshold) {
      return {
        isAlert: true,
        isCritical: false,
        category: 'POOR',
        healthAdvice: 'Elevated emissions / decaying organic matter detected. Field inspection recommended.',
      };
    }
    if (ppm >= 150) {
      return {
        isAlert: false,
        isCritical: false,
        category: 'MODERATE',
        healthAdvice: 'Acceptable ambient air quality with mild urban background traces.',
      };
    }
    return {
      isAlert: false,
      isCritical: false,
      category: 'GOOD',
      healthAdvice: 'Clean and fresh ambient air quality.',
    };
  }
}
