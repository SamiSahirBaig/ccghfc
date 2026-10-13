import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { aiService } from '../../src/services/ai/ai.service.js';

describe('Integration: Complaint Intake & Verification Lifecycle', () => {
  it('should return 200 on /health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('should return 200 on /ready check', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('should verify photo using MockAIProvider and detect issue', async () => {
    const evaluation = await aiService.evaluateComplaint({
      imageUrls: ['https://example.com/test-garbage.jpg'],
      userCategory: 'Garbage & Waste',
      title: 'Huge garbage pile blocking market street',
      description: 'Rotting organic food waste accumulating outside shop stalls',
      gpsCoords: { latitude: 28.6139, longitude: 77.2090 },
    });

    expect(evaluation.decision).toBe('VERIFIED');
    expect(evaluation.verification.detected_issue_type).toBe('GARBAGE_PILEUP');
    expect(evaluation.emergency.severity).toBeGreaterThanOrEqual(5);
  });

  it('should correctly reject spam / irrelevant photo', async () => {
    const evaluation = await aiService.evaluateComplaint({
      imageUrls: ['https://example.com/meme.jpg'],
      userCategory: 'Garbage & Waste',
      title: 'Test spam fake post',
      description: 'random meme test spam',
      gpsCoords: { latitude: 28.6139, longitude: 77.2090 },
    });

    expect(evaluation.decision).toBe('REJECTED_SPAM');
    expect(evaluation.verification.authenticity_score).toBeLessThan(0.4);
  });
});
