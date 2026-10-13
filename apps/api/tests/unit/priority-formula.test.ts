import { describe, it, expect } from 'vitest';
import { PriorityCalculatorService } from '../../src/services/complaints/priority-calculator.service.js';

describe('PriorityCalculatorService (Civic Urgency Formula)', () => {
  it('should calculate correct low priority for minor isolated complaint', () => {
    const createdAt = new Date('2026-10-13T10:00:00Z');
    const slaDeadline = new Date('2026-10-16T10:00:00Z'); // +72h

    const result = PriorityCalculatorService.calculate(
      {
        aiSeverity: 2,
        isNearSensitivePoi: false,
        duplicateCount: 0,
        upvoteCount: 0,
        createdAt,
        slaDeadline,
        hasHighSensorGasReading: false,
      },
      createdAt // reference at creation (sla_age = 0)
    );

    // ai_severity_norm = (2/10)*100 = 20. 0.4*20 = 8.
    // other factors = 0. Total = 8.
    expect(result.score).toBe(8.0);
    expect(result.label).toBe('LOW');
  });

  it('should categorize hazardous issue near hospital as CRITICAL', () => {
    const createdAt = new Date('2026-10-13T10:00:00Z');
    const slaDeadline = new Date('2026-10-16T10:00:00Z');

    const result = PriorityCalculatorService.calculate(
      {
        aiSeverity: 10, // Max hazard (0.4 * 100 = 40)
        isNearSensitivePoi: true, // Hospital proximity (0.2 * 100 = 20)
        distanceToPoiMeters: 20,
        duplicateCount: 3, // (0.15 * min(100, 3*25 + 5*10 = 125 -> 100) = 15)
        upvoteCount: 5,
        createdAt,
        slaDeadline,
        hasHighSensorGasReading: true, // (0.10 * 100 = 10)
      },
      new Date('2026-10-15T22:00:00Z') // Nearing breach (sla_age ~ 85 -> 0.15 * 85 = 12.75)
    );

    // Expected score >= 80 -> CRITICAL
    expect(result.score).toBeGreaterThanOrEqual(80.0);
    expect(result.label).toBe('CRITICAL');
  });

  it('should increase score as SLA deadline nears', () => {
    const createdAt = new Date('2026-10-13T10:00:00Z');
    const slaDeadline = new Date('2026-10-16T10:00:00Z');

    const factors = {
      aiSeverity: 6,
      isNearSensitivePoi: false,
      duplicateCount: 1,
      upvoteCount: 2,
      createdAt,
      slaDeadline,
      hasHighSensorGasReading: false,
    };

    const atCreation = PriorityCalculatorService.calculate(factors, createdAt);
    const halfway = PriorityCalculatorService.calculate(
      factors,
      new Date('2026-10-14T22:00:00Z') // +36h
    );
    const nearBreach = PriorityCalculatorService.calculate(
      factors,
      new Date('2026-10-16T09:00:00Z') // +71h
    );

    expect(halfway.score).toBeGreaterThan(atCreation.score);
    expect(nearBreach.score).toBeGreaterThan(halfway.score);
  });
});
