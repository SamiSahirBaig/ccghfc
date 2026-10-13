import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { IAIProvider } from './ai-provider.interface.js';
import {
  AiVerificationInput,
  EmergencyRankingOutput,
  PhotoVerificationOutput,
} from './ai.types.js';
import { ClaudeAIProvider } from './claude-ai.provider.js';
import { GeminiAIProvider } from './gemini-ai.provider.js';
import { MockAIProvider } from './mock-ai.provider.js';
import { PHashService } from './phash.service.js';

export interface FinalAiEvaluation {
  verification: PhotoVerificationOutput;
  emergency: EmergencyRankingOutput;
  decision: 'VERIFIED' | 'NEEDS_HUMAN_REVIEW' | 'REJECTED_SPAM';
  flags: string[];
  calculatedScore: number;
}

export class AIService {
  private provider: IAIProvider;

  constructor() {
    switch (config.ai.provider) {
      case 'gemini':
        this.provider = new GeminiAIProvider();
        break;
      case 'claude':
        this.provider = new ClaudeAIProvider();
        break;
      case 'mock':
      default:
        this.provider = new MockAIProvider();
        break;
    }
    logger.info({ provider: this.provider.providerName }, 'AIService initialized');
  }

  /**
   * Evaluates image legitimacy, EXIF freshness, GPS mismatch, pHash duplicates, and assigns ranking.
   */
  public async evaluateComplaint(
    input: AiVerificationInput,
    existingComplaintHashes: string[] = []
  ): Promise<FinalAiEvaluation> {
    const flags: string[] = [];
    let scorePenalty = 0.0;

    // 1. EXIF Timestamp Freshness Check (flag photos older than 48h)
    if (input.exifMetadata?.dateTimeOriginal) {
      const photoDate = new Date(input.exifMetadata.dateTimeOriginal);
      const now = new Date();
      const ageHours = (now.getTime() - photoDate.getTime()) / (1000 * 60 * 60);
      if (ageHours > 48) {
        flags.push('stale_exif_timestamp');
        scorePenalty += 0.15;
      }
    }

    // 2. GPS-vs-EXIF distance check
    if (
      input.exifMetadata?.latitude !== undefined &&
      input.exifMetadata?.longitude !== undefined &&
      input.gpsCoords.latitude &&
      input.gpsCoords.longitude
    ) {
      const distKm = this.haversineDistance(
        input.gpsCoords.latitude,
        input.gpsCoords.longitude,
        input.exifMetadata.latitude,
        input.exifMetadata.longitude
      );
      if (distKm > 1.0) {
        // Photo was taken more than 1 km away from reported submission coordinates
        flags.push('gps_mismatch');
        scorePenalty += 0.20;
      }
    }

    // 3. Perceptual-hash (pHash) duplicate check against existing complaints
    if (input.imageBuffers && input.imageBuffers.length > 0) {
      for (const buffer of input.imageBuffers) {
        const hash = PHashService.computeHash(buffer);
        for (const existingHash of existingComplaintHashes) {
          if (PHashService.isDuplicate(hash, existingHash)) {
            flags.push('duplicate_image');
            scorePenalty += 0.35;
            break;
          }
        }
      }
    }

    // 4. Reporter trust score check
    const trustScore = input.reporterTrustScore ?? 1.0;
    if (trustScore < 0.5) {
      flags.push('low_trust_reporter');
      scorePenalty += 0.25;
    }

    // 5. Execute AI Vision Verification with 1 retry on malformed output
    let verification: PhotoVerificationOutput;
    try {
      verification = await this.provider.verifyPhoto(input);
    } catch (err) {
      logger.warn({ err }, 'First attempt AI verification failed, retrying once');
      try {
        verification = await this.provider.verifyPhoto(input);
      } catch (retryErr) {
        logger.error({ retryErr }, 'AI verification retry failed, falling back to safe default');
        verification = {
          is_relevant: true,
          detected_issue_type: 'OTHER',
          matches_user_category: true,
          authenticity_flags: ['verification_fallback'],
          authenticity_score: 0.60,
          confidence: 0.50,
          reasoning: 'AI inspection provider timed out; routed to human review safeguard.',
        };
      }
    }

    // Merge detected flags
    const combinedFlags = Array.from(new Set([...flags, ...verification.authenticity_flags]));

    // Compute composite authenticity score
    const rawAuthenticityScore = verification.authenticity_score - scorePenalty;
    const finalAuthenticityScore = Math.max(0.0, Math.min(1.0, Math.round(rawAuthenticityScore * 100) / 100));

    // Decision Logic from requirements:
    // score >= 0.75 -> VERIFIED
    // 0.40 - 0.75   -> NEEDS_HUMAN_REVIEW (still routed, flagged)
    // < 0.40        -> REJECTED_SPAM
    let decision: FinalAiEvaluation['decision'] = 'NEEDS_HUMAN_REVIEW';
    if (finalAuthenticityScore >= 0.75 && verification.is_relevant) {
      decision = 'VERIFIED';
    } else if (finalAuthenticityScore < 0.40 || !verification.is_relevant) {
      decision = 'REJECTED_SPAM';
    } else {
      decision = 'NEEDS_HUMAN_REVIEW';
    }

    // 6. Execute Emergency Ranking
    let emergency: EmergencyRankingOutput;
    try {
      emergency = await this.provider.rankEmergency(input);
    } catch (err) {
      emergency = {
        severity: 5,
        factors: {
          waste_volume: 'MEDIUM',
          sewage_overflow: false,
          health_hazard: false,
          blocks_traffic_or_pedestrians: false,
          near_sensitive_place: false,
          spread_odor_indicators: false,
          weather_risk: false,
        },
        explanation: 'Default median emergency rating assigned via queue recovery.',
      };
    }

    return {
      verification: {
        ...verification,
        authenticity_score: finalAuthenticityScore,
        authenticity_flags: combinedFlags,
      },
      emergency,
      decision,
      flags: combinedFlags,
      calculatedScore: finalAuthenticityScore,
    };
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const aiService = new AIService();
