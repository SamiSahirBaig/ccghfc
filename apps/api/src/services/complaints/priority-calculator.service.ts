/**
 * Priority Scoring Engine for Civic Complaints
 * 
 * Formula:
 * priority = 0.40 * ai_severity_norm
 *          + 0.20 * sensitive_location_factor
 *          + 0.15 * duplicate_and_upvote_factor
 *          + 0.15 * sla_age_factor
 *          + 0.10 * sensor_factor
 * 
 * Score Range: 0 to 100
 * Labels:
 * - CRITICAL: >= 80
 * - HIGH:     60 - 79
 * - MEDIUM:   35 - 59
 * - LOW:      < 35
 */

export interface PriorityFactors {
  aiSeverity: number;             // 1 to 10
  isNearSensitivePoi: boolean;    // hospital, school, market, water source
  distanceToPoiMeters?: number;   // distance to nearest POI in meters
  duplicateCount: number;         // number of linked duplicate reports
  upvoteCount: number;            // number of affected citizen upvotes
  createdAt: Date;                // submission timestamp
  slaDeadline: Date;              // SLA breach deadline
  hasHighSensorGasReading: boolean; // nearby IoT node ppm reading above threshold
  sensorPpm?: number;             // nearby sensor ppm reading
}

export type PriorityLabelType = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityCalculationResult {
  score: number;
  label: PriorityLabelType;
  components: {
    aiSeverityNorm: number;
    sensitiveLocationFactor: number;
    duplicateAndUpvoteFactor: number;
    slaAgeFactor: number;
    sensorFactor: number;
  };
}

export class PriorityCalculatorService {
  public static calculate(factors: PriorityFactors, referenceDate: Date = new Date()): PriorityCalculationResult {
    // 1. AI Severity normalized (1-10 -> 0-100)
    const clampedAiSeverity = Math.max(1, Math.min(10, factors.aiSeverity));
    const aiSeverityNorm = (clampedAiSeverity / 10.0) * 100.0;

    // 2. Sensitive Location Factor (0 - 100)
    let sensitiveLocationFactor = 0.0;
    if (factors.isNearSensitivePoi) {
      if (factors.distanceToPoiMeters !== undefined && factors.distanceToPoiMeters > 0) {
        // Linear decay: 100 at 0m down to 50 at 250m
        sensitiveLocationFactor = Math.max(50.0, 100.0 - (factors.distanceToPoiMeters / 250.0) * 50.0);
      } else {
        sensitiveLocationFactor = 100.0;
      }
    }

    // 3. Duplicate and Upvote Factor (0 - 100)
    // Each duplicate adds 25 points, each upvote adds 10 points, capped at 100
    const rawDuplicateUpvote = (factors.duplicateCount * 25.0) + (factors.upvoteCount * 10.0);
    const duplicateAndUpvoteFactor = Math.min(100.0, rawDuplicateUpvote);

    // 4. SLA Age Factor (0 - 100)
    // Rises from 0 at createdAt to 100 as deadline nears or passes
    const totalSlaDurationMs = factors.slaDeadline.getTime() - factors.createdAt.getTime();
    const elapsedMs = referenceDate.getTime() - factors.createdAt.getTime();
    let slaAgeFactor = 0.0;
    if (totalSlaDurationMs > 0) {
      const ageRatio = elapsedMs / totalSlaDurationMs;
      slaAgeFactor = Math.max(0.0, Math.min(100.0, ageRatio * 100.0));
    }

    // 5. Sensor Factor (0 - 100)
    let sensorFactor = 0.0;
    if (factors.hasHighSensorGasReading) {
      sensorFactor = 100.0;
    } else if (factors.sensorPpm && factors.sensorPpm > 200) {
      sensorFactor = Math.min(100.0, ((factors.sensorPpm - 200) / 200) * 100.0);
    }

    // Weighted Composite Score
    const weightedScore =
      0.40 * aiSeverityNorm +
      0.20 * sensitiveLocationFactor +
      0.15 * duplicateAndUpvoteFactor +
      0.15 * slaAgeFactor +
      0.10 * sensorFactor;

    const finalScore = Math.max(0.0, Math.min(100.0, Math.round(weightedScore * 10) / 10));

    // Map to Priority Label
    let label: PriorityLabelType = 'LOW';
    if (finalScore >= 80.0) {
      label = 'CRITICAL';
    } else if (finalScore >= 60.0) {
      label = 'HIGH';
    } else if (finalScore >= 35.0) {
      label = 'MEDIUM';
    } else {
      label = 'LOW';
    }

    return {
      score: finalScore,
      label,
      components: {
        aiSeverityNorm: Math.round(aiSeverityNorm * 10) / 10,
        sensitiveLocationFactor: Math.round(sensitiveLocationFactor * 10) / 10,
        duplicateAndUpvoteFactor: Math.round(duplicateAndUpvoteFactor * 10) / 10,
        slaAgeFactor: Math.round(slaAgeFactor * 10) / 10,
        sensorFactor: Math.round(sensorFactor * 10) / 10,
      },
    };
  }
}
