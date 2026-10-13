import { IAIProvider } from './ai-provider.interface.js';
import {
  AiVerificationInput,
  EmergencyRankingOutput,
  EmergencyRankingOutputSchema,
  PhotoVerificationOutput,
  PhotoVerificationOutputSchema,
} from './ai.types.js';
import { MockAIProvider } from './mock-ai.provider.js';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';

export class GeminiAIProvider implements IAIProvider {
  public readonly providerName = 'gemini';
  private fallback = new MockAIProvider();

  public async verifyPhoto(input: AiVerificationInput): Promise<PhotoVerificationOutput> {
    if (!config.ai.apiKey) {
      return this.fallback.verifyPhoto(input);
    }

    try {
      const prompt = `You are a municipal civic inspection AI. Analyze this civic defect report:
Category: ${input.userCategory}
Title: ${input.title}
Description: ${input.description}
GPS: ${input.gpsCoords.latitude}, ${input.gpsCoords.longitude}

Respond ONLY with valid JSON matching this schema:
{
  "is_relevant": boolean,
  "detected_issue_type": "GARBAGE_PILEUP" | "SEWAGE_BLOCKAGE" | "OVERFLOWING_DRAIN" | "DEAD_ANIMAL" | "BURNING_WASTE" | "AIR_QUALITY_GAS_ODOR" | "OTHER" | "NONE",
  "matches_user_category": boolean,
  "authenticity_flags": string[],
  "authenticity_score": number (0.0 to 1.0),
  "confidence": number (0.0 to 1.0),
  "reasoning": string
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.model || 'gemini-1.5-flash'}:generateContent?key=${config.ai.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as any;
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(textOutput);
      return PhotoVerificationOutputSchema.parse(parsed);
    } catch (err) {
      logger.warn({ err }, 'Gemini vision verification failed, using fallback heuristic');
      return this.fallback.verifyPhoto(input);
    }
  }

  public async rankEmergency(input: AiVerificationInput): Promise<EmergencyRankingOutput> {
    if (!config.ai.apiKey) {
      return this.fallback.rankEmergency(input);
    }

    try {
      const prompt = `You are a municipal emergency risk assessor. Rate the urgency and severity of this civic problem from 1 (minor) to 10 (critical public hazard):
Title: ${input.title}
Description: ${input.description}
Category: ${input.userCategory}

Respond ONLY with valid JSON matching:
{
  "severity": number (1 to 10),
  "factors": {
    "waste_volume": "LOW" | "MEDIUM" | "HIGH" | "MASSIVE",
    "sewage_overflow": boolean,
    "health_hazard": boolean,
    "blocks_traffic_or_pedestrians": boolean,
    "near_sensitive_place": boolean,
    "spread_odor_indicators": boolean,
    "weather_risk": boolean
  },
  "explanation": string
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.model || 'gemini-1.5-flash'}:generateContent?key=${config.ai.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error ${response.status}`);
      }

      const data = (await response.json()) as any;
      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(textOutput);
      return EmergencyRankingOutputSchema.parse(parsed);
    } catch (err) {
      logger.warn({ err }, 'Gemini ranking failed, using fallback heuristic');
      return this.fallback.rankEmergency(input);
    }
  }
}
