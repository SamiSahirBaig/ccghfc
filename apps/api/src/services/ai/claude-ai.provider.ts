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

export class ClaudeAIProvider implements IAIProvider {
  public readonly providerName = 'claude';
  private fallback = new MockAIProvider();

  public async verifyPhoto(input: AiVerificationInput): Promise<PhotoVerificationOutput> {
    if (!config.ai.apiKey) {
      return this.fallback.verifyPhoto(input);
    }

    try {
      const prompt = `Analyze this civic defect report for municipal intake:
Category: ${input.userCategory}
Title: ${input.title}
Description: ${input.description}

Respond ONLY with valid JSON matching:
{
  "is_relevant": true,
  "detected_issue_type": "GARBAGE_PILEUP",
  "matches_user_category": true,
  "authenticity_flags": [],
  "authenticity_score": 0.95,
  "confidence": 0.95,
  "reasoning": "..."
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.ai.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error ${response.status}`);
      }

      const data = (await response.json()) as any;
      const textOutput = data?.content?.[0]?.text;
      const parsed = JSON.parse(textOutput);
      return PhotoVerificationOutputSchema.parse(parsed);
    } catch (err) {
      logger.warn({ err }, 'Claude verification failed, using fallback heuristic');
      return this.fallback.verifyPhoto(input);
    }
  }

  public async rankEmergency(input: AiVerificationInput): Promise<EmergencyRankingOutput> {
    if (!config.ai.apiKey) {
      return this.fallback.rankEmergency(input);
    }

    try {
      const prompt = `Rate the civic issue severity (1-10) as JSON:
Title: ${input.title}
Description: ${input.description}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.ai.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) throw new Error(`Claude error ${response.status}`);
      const data = (await response.json()) as any;
      const textOutput = data?.content?.[0]?.text;
      return EmergencyRankingOutputSchema.parse(JSON.parse(textOutput));
    } catch (err) {
      logger.warn({ err }, 'Claude ranking failed, using fallback');
      return this.fallback.rankEmergency(input);
    }
  }
}
