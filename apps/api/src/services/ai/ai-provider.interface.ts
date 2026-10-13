import {
  AiVerificationInput,
  EmergencyRankingOutput,
  PhotoVerificationOutput,
} from './ai.types.js';

export interface IAIProvider {
  readonly providerName: string;

  verifyPhoto(input: AiVerificationInput): Promise<PhotoVerificationOutput>;

  rankEmergency(input: AiVerificationInput): Promise<EmergencyRankingOutput>;
}
