import { z } from 'zod';

export const DetectedIssueTypeSchema = z.enum([
  'GARBAGE_PILEUP',
  'SEWAGE_BLOCKAGE',
  'OVERFLOWING_DRAIN',
  'DEAD_ANIMAL',
  'BURNING_WASTE',
  'AIR_QUALITY_GAS_ODOR',
  'OTHER',
  'NONE',
]);

export type DetectedIssueType = z.infer<typeof DetectedIssueTypeSchema>;

export const AuthenticityFlagSchema = z.enum([
  'screenshot',
  'stock_photo',
  'indoor_photo',
  'duplicate_image',
  'no_issue_visible',
  'stale_exif_timestamp',
  'gps_mismatch',
  'low_trust_reporter',
]);

export type AuthenticityFlag = z.infer<typeof AuthenticityFlagSchema>;

export const PhotoVerificationOutputSchema = z.object({
  is_relevant: z.boolean(),
  detected_issue_type: DetectedIssueTypeSchema,
  matches_user_category: z.boolean(),
  authenticity_flags: z.array(z.string()),
  authenticity_score: z.number().min(0.0).max(1.0),
  confidence: z.number().min(0.0).max(1.0),
  reasoning: z.string(),
});

export type PhotoVerificationOutput = z.infer<typeof PhotoVerificationOutputSchema>;

export const EmergencyRankingOutputSchema = z.object({
  severity: z.number().min(1).max(10),
  factors: z.object({
    waste_volume: z.enum(['LOW', 'MEDIUM', 'HIGH', 'MASSIVE']),
    sewage_overflow: z.boolean(),
    health_hazard: z.boolean(),
    blocks_traffic_or_pedestrians: z.boolean(),
    near_sensitive_place: z.boolean(),
    spread_odor_indicators: z.boolean(),
    weather_risk: z.boolean(),
  }),
  explanation: z.string(),
});

export type EmergencyRankingOutput = z.infer<typeof EmergencyRankingOutputSchema>;

export interface AiVerificationInput {
  imageUrls: string[];
  imageBuffers?: Buffer[];
  userCategory: string;
  title: string;
  description: string;
  gpsCoords: { latitude: number; longitude: number };
  exifMetadata?: {
    dateTimeOriginal?: string;
    latitude?: number;
    longitude?: number;
  };
  reporterTrustScore?: number;
}
