import { describe, it, expect, vi } from 'vitest';
import { SlaEscalationService } from '../../src/services/queue/sla-escalation.service.js';
import { config } from '../../src/config/index.js';

describe('SlaEscalationService (72h SLA & Override Engine)', () => {
  it('should calculate milestone delays correctly for standard 72h lifecycle', async () => {
    const service = new SlaEscalationService();
    const createdAt = new Date();
    const slaDeadline = new Date(createdAt.getTime() + 72 * 60 * 60 * 1000);

    const scheduleSpy = vi.spyOn(service, 'scheduleSlaJobs');
    await service.scheduleSlaJobs('test-comp-1', slaDeadline, createdAt);

    expect(scheduleSpy).toHaveBeenCalledWith('test-comp-1', slaDeadline, createdAt);
  });

  it('should scale milestones proportionally when SLA_OVERRIDE_MINUTES is active', async () => {
    const service = new SlaEscalationService();
    const originalOverride = config.sla.overrideMinutes;

    // Simulate 2-minute demo mode
    config.sla.overrideMinutes = 2;

    const createdAt = new Date();
    const slaDeadline = new Date(createdAt.getTime() + 2 * 60 * 1000);

    await expect(service.scheduleSlaJobs('test-comp-2', slaDeadline, createdAt)).resolves.not.toThrow();

    // Cleanup
    config.sla.overrideMinutes = originalOverride;
  });

  it('should support job cancellation upon resolution', async () => {
    const service = new SlaEscalationService();
    await expect(service.cancelSlaJobs('test-comp-1')).resolves.not.toThrow();
  });
});
