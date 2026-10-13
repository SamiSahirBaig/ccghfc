import { IAIProvider } from './ai-provider.interface.js';
import {
  AiVerificationInput,
  EmergencyRankingOutput,
  PhotoVerificationOutput,
} from './ai.types.js';

export class MockAIProvider implements IAIProvider {
  public readonly providerName = 'mock';

  public async verifyPhoto(input: AiVerificationInput): Promise<PhotoVerificationOutput> {
    const textCorpus = `${input.title} ${input.description} ${input.userCategory}`.toLowerCase();
    
    // Check if spam / fake indicators
    const isSpam = textCorpus.includes('test spam') || textCorpus.includes('fake') || textCorpus.includes('meme');
    const isIndoor = textCorpus.includes('living room') || textCorpus.includes('bedroom') || textCorpus.includes('indoor');

    const flags: string[] = [];
    if (isSpam) flags.push('no_issue_visible');
    if (isIndoor) flags.push('indoor_photo');

    let issueType: PhotoVerificationOutput['detected_issue_type'] = 'OTHER';
    if (textCorpus.includes('garbage') || textCorpus.includes('trash') || textCorpus.includes('waste')) {
      issueType = 'GARBAGE_PILEUP';
    } else if (textCorpus.includes('sewage') || textCorpus.includes('drain') || textCorpus.includes('overflow')) {
      issueType = 'SEWAGE_BLOCKAGE';
    } else if (textCorpus.includes('animal') || textCorpus.includes('carcass')) {
      issueType = 'DEAD_ANIMAL';
    } else if (textCorpus.includes('burning') || textCorpus.includes('smoke') || textCorpus.includes('fire')) {
      issueType = 'BURNING_WASTE';
    } else if (textCorpus.includes('gas') || textCorpus.includes('smell') || textCorpus.includes('odor')) {
      issueType = 'AIR_QUALITY_GAS_ODOR';
    } else if (isSpam) {
      issueType = 'NONE';
    }

    const authenticityScore = isSpam ? 0.2 : isIndoor ? 0.55 : 0.92;
    const isRelevant = !isSpam;
    const matchesCategory = issueType !== 'NONE';

    return {
      is_relevant: isRelevant,
      detected_issue_type: issueType,
      matches_user_category: matchesCategory,
      authenticity_flags: flags,
      authenticity_score: authenticityScore,
      confidence: 0.94,
      reasoning: isSpam
        ? 'No valid civic sanitation defect identified in provided submission image.'
        : `Verified authentic outdoor civic defect: detected ${issueType.toLowerCase().replace(/_/g, ' ')}. Outdoor lighting and street geometry confirmed.`,
    };
  }

  public async rankEmergency(input: AiVerificationInput): Promise<EmergencyRankingOutput> {
    const textCorpus = `${input.title} ${input.description}`.toLowerCase();

    let severity = 5;
    let wasteVolume: 'LOW' | 'MEDIUM' | 'HIGH' | 'MASSIVE' = 'MEDIUM';
    let sewageOverflow = false;
    let healthHazard = false;
    let blocksTraffic = false;
    let nearSensitive = false;
    let spreadOdor = false;
    let weatherRisk = false;

    if (textCorpus.includes('hospital') || textCorpus.includes('school') || textCorpus.includes('water')) {
      nearSensitive = true;
      severity += 2;
    }

    if (textCorpus.includes('sewage') || textCorpus.includes('drain') || textCorpus.includes('overflow')) {
      sewageOverflow = true;
      healthHazard = true;
      severity += 2;
    }

    if (textCorpus.includes('block') || textCorpus.includes('road') || textCorpus.includes('traffic')) {
      blocksTraffic = true;
      severity += 1;
    }

    if (textCorpus.includes('huge') || textCorpus.includes('massive') || textCorpus.includes('overflowing')) {
      wasteVolume = 'MASSIVE';
      severity += 2;
    } else if (textCorpus.includes('pile') || textCorpus.includes('large')) {
      wasteVolume = 'HIGH';
      severity += 1;
    }

    if (textCorpus.includes('smell') || textCorpus.includes('stink') || textCorpus.includes('foul') || textCorpus.includes('mosquito')) {
      spreadOdor = true;
    }

    if (textCorpus.includes('rain') || textCorpus.includes('monsoon') || textCorpus.includes('flood')) {
      weatherRisk = true;
      severity += 1;
    }

    severity = Math.max(1, Math.min(10, severity));

    return {
      severity,
      factors: {
        waste_volume: wasteVolume,
        sewage_overflow: sewageOverflow,
        health_hazard: healthHazard,
        blocks_traffic_or_pedestrians: blocksTraffic,
        near_sensitive_place: nearSensitive,
        spread_odor_indicators: spreadOdor,
        weather_risk: weatherRisk,
      },
      explanation: `Calculated severity score ${severity}/10 based on volume (${wasteVolume}), health hazard risk (${healthHazard}), and sensitive zone proximity (${nearSensitive}).`,
    };
  }
}
