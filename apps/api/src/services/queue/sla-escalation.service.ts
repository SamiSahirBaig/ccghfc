import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { emailService } from '../email/email.service.js';

export interface SlaJobData {
  complaintId: string;
  milestone: 'REMINDER_24H' | 'WARNING_48H' | 'BREACH_72H' | 'ESCALATION_L2_120H';
  slaDeadline: string;
}

export class SlaEscalationService {
  private queue: Queue<SlaJobData> | null = null;
  private worker: Worker<SlaJobData> | null = null;
  private inMemoryTimers = new Map<string, NodeJS.Timeout>();
  private redisClient: Redis | null = null;
  private isRedisAvailable = false;

  constructor() {
    this.initQueue();
  }

  private async initQueue() {
    try {
      this.redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: null,
        connectTimeout: 2000,
        retryStrategy: () => null, // don't infinite retry if no redis
      });

      this.redisClient.on('error', (err) => {
        if (!this.isRedisAvailable) {
          logger.warn('Redis unavailable, SlaEscalationService using resilient in-memory scheduler fallback');
        }
        this.isRedisAvailable = false;
      });

      this.redisClient.on('connect', () => {
        this.isRedisAvailable = true;
        logger.info('Connected to Redis for BullMQ SLA Escalation Queue');
        this.setupBullMq();
      });
    } catch (err) {
      logger.warn({ err }, 'Redis connection skipped, using in-memory timer fallback');
    }
  }

  private setupBullMq() {
    if (!this.redisClient) return;

    this.queue = new Queue<SlaJobData>('sla-escalations', {
      connection: this.redisClient,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.worker = new Worker<SlaJobData>(
      'sla-escalations',
      async (job: Job<SlaJobData>) => {
        await this.processMilestone(job.data);
      },
      { connection: this.redisClient }
    );

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err }, 'SLA Worker job failed');
    });
  }

  /**
   * Schedule all SLA milestone jobs for a complaint (T+24h, T+48h, T+72h, T+120h)
   */
  public async scheduleSlaJobs(complaintId: string, slaDeadline: Date, createdAt: Date = new Date()): Promise<void> {
    const totalMs = slaDeadline.getTime() - createdAt.getTime();
    const nowMs = Date.now();

    // Calculate milestone delay timings
    let delay24h: number;
    let delay48h: number;
    let delay72h: number;
    let delay120h: number;

    if (config.sla.overrideMinutes > 0) {
      // Scale proportionally for testing (e.g. 2 minutes demo mode)
      const overrideMs = config.sla.overrideMinutes * 60 * 1000;
      delay24h = Math.round(overrideMs * (24 / 72));
      delay48h = Math.round(overrideMs * (48 / 72));
      delay72h = overrideMs;
      delay120h = Math.round(overrideMs * (120 / 72));
    } else {
      delay24h = Math.max(0, createdAt.getTime() + 24 * 60 * 60 * 1000 - nowMs);
      delay48h = Math.max(0, createdAt.getTime() + 48 * 60 * 60 * 1000 - nowMs);
      delay72h = Math.max(0, slaDeadline.getTime() - nowMs);
      delay120h = Math.max(0, slaDeadline.getTime() + 48 * 60 * 60 * 1000 - nowMs);
    }

    const milestones: Array<{ key: SlaJobData['milestone']; delay: number }> = [
      { key: 'REMINDER_24H', delay: delay24h },
      { key: 'WARNING_48H', delay: delay48h },
      { key: 'BREACH_72H', delay: delay72h },
      { key: 'ESCALATION_L2_120H', delay: delay120h },
    ];

    for (const m of milestones) {
      const jobId = `sla-${complaintId}-${m.key}`;
      const data: SlaJobData = {
        complaintId,
        milestone: m.key,
        slaDeadline: slaDeadline.toISOString(),
      };

      if (this.isRedisAvailable && this.queue) {
        await this.queue.add(m.key, data, {
          jobId,
          delay: Math.max(100, m.delay),
        });
        logger.debug({ jobId, delayMs: m.delay }, 'BullMQ SLA milestone scheduled');
      } else {
        // Fallback in-memory timer
        this.clearInMemoryTimer(jobId);
        const timer = setTimeout(async () => {
          await this.processMilestone(data);
          this.inMemoryTimers.delete(jobId);
        }, Math.max(100, m.delay));
        this.inMemoryTimers.set(jobId, timer);
        logger.debug({ jobId, delayMs: m.delay }, 'In-memory SLA timer scheduled');
      }
    }
  }

  /**
   * Cancel all pending SLA timers when complaint is resolved or closed
   */
  public async cancelSlaJobs(complaintId: string): Promise<void> {
    const keys: SlaJobData['milestone'][] = ['REMINDER_24H', 'WARNING_48H', 'BREACH_72H', 'ESCALATION_L2_120H'];
    for (const key of keys) {
      const jobId = `sla-${complaintId}-${key}`;
      if (this.isRedisAvailable && this.queue) {
        try {
          const job = await this.queue.getJob(jobId);
          if (job) await job.remove();
        } catch (e) {
          // ignore
        }
      }
      this.clearInMemoryTimer(jobId);
    }
    logger.info({ complaintId }, 'All SLA timers canceled');
  }

  private clearInMemoryTimer(jobId: string) {
    if (this.inMemoryTimers.has(jobId)) {
      clearTimeout(this.inMemoryTimers.get(jobId)!);
      this.inMemoryTimers.delete(jobId);
    }
  }

  /**
   * Process individual milestone actions (idempotent)
   */
  public async processMilestone(data: SlaJobData): Promise<void> {
    try {
      const complaint = await prisma.complaint.findUnique({
        where: { id: data.complaintId },
        include: {
          category: true,
          ward: true,
          assignedOfficer: true,
          media: true,
        },
      });

      if (!complaint) {
        logger.warn({ complaintId: data.complaintId }, 'Complaint not found during SLA milestone');
        return;
      }

      // If already resolved or closed, skip processing
      if (complaint.status === 'RESOLVED' || complaint.status === 'CLOSED') {
        logger.info({ complaintId: complaint.id, status: complaint.status }, 'Complaint already resolved, skipping SLA milestone');
        return;
      }

      const elapsedHours = (Date.now() - complaint.createdAt.getTime()) / (1000 * 60 * 60);

      switch (data.milestone) {
        case 'REMINDER_24H':
          if (complaint.status === 'ASSIGNED' && complaint.assignedOfficer?.email) {
            await emailService.sendOfficerAlert(complaint.assignedOfficer.email, complaint.publicCode, 'REMINDER_24H', 48);
          }
          break;

        case 'WARNING_48H':
          if (complaint.assignedOfficer?.email) {
            await emailService.sendOfficerAlert(complaint.assignedOfficer.email, complaint.publicCode, 'WARNING_48H', 24);
          }
          break;

        case 'BREACH_72H':
          // Check if already breached to enforce idempotency
          if (complaint.status !== 'SLA_BREACHED' && complaint.escalationLevel < 1) {
            await prisma.complaint.update({
              where: { id: complaint.id },
              data: {
                status: 'SLA_BREACHED',
                escalationLevel: 1,
              },
            });

            await prisma.statusHistory.create({
              data: {
                complaintId: complaint.id,
                fromStatus: complaint.status,
                toStatus: 'SLA_BREACHED',
                note: `Automatic SLA breach triggered at ${elapsedHours.toFixed(1)}h. Escalated to District Magistrate.`,
              },
            });

            // Dispatch DM escalation email
            await emailService.sendEscalationEmail({
              complaintId: complaint.id,
              publicCode: complaint.publicCode,
              categoryName: complaint.category.name,
              title: complaint.title,
              description: complaint.description,
              priorityScore: complaint.priorityScore,
              priorityLabel: complaint.priorityLabel,
              aiSeverity: complaint.aiSeverity,
              latitude: complaint.latitude,
              longitude: complaint.longitude,
              address: complaint.address,
              assignedOfficerName: complaint.assignedOfficer?.name,
              assignedOfficerEmail: complaint.assignedOfficer?.email,
              upvoteCount: complaint.upvoteCount,
              elapsedHours,
              mediaUrls: (complaint.media || []).map((m: any) => m.url),
              level: 1,
            });

            logger.info({ complaintId: complaint.id }, 'Complaint escalated to District Magistrate (Level 1)');
          }
          break;

        case 'ESCALATION_L2_120H':
          if (complaint.escalationLevel < 2) {
            await prisma.complaint.update({
              where: { id: complaint.id },
              data: { escalationLevel: 2 },
            });

            await emailService.sendEscalationEmail({
              complaintId: complaint.id,
              publicCode: complaint.publicCode,
              categoryName: complaint.category.name,
              title: complaint.title,
              description: complaint.description,
              priorityScore: complaint.priorityScore,
              priorityLabel: complaint.priorityLabel,
              aiSeverity: complaint.aiSeverity,
              latitude: complaint.latitude,
              longitude: complaint.longitude,
              address: complaint.address,
              assignedOfficerName: complaint.assignedOfficer?.name,
              assignedOfficerEmail: complaint.assignedOfficer?.email,
              upvoteCount: complaint.upvoteCount,
              elapsedHours,
              mediaUrls: (complaint.media || []).map((m: any) => m.url),
              level: 2,
            });

            logger.info({ complaintId: complaint.id }, 'Complaint escalated to State Oversight (Level 2)');
          }
          break;
      }
    } catch (err) {
      logger.error({ err, data }, 'Failed to process SLA milestone');
    }
  }

  /**
   * On server boot: reconcile all open complaints and reschedule missing timers
   */
  public async reconcileOpenComplaints(): Promise<void> {
    try {
      const openComplaints = await prisma.complaint.findMany({
        where: {
          status: {
            notIn: ['RESOLVED', 'CLOSED', 'REJECTED_SPAM'],
          },
        },
      });

      logger.info({ count: openComplaints.length }, 'Reconciling open complaints on boot');

      for (const c of openComplaints) {
        if (new Date() >= c.slaDeadline && c.status !== 'SLA_BREACHED') {
          // Breached while offline! Trigger breach immediately
          await this.processMilestone({
            complaintId: c.id,
            milestone: 'BREACH_72H',
            slaDeadline: c.slaDeadline.toISOString(),
          });
        } else {
          // Reschedule remaining milestones
          await this.scheduleSlaJobs(c.id, c.slaDeadline, c.createdAt);
        }
      }
    } catch (err) {
      logger.warn({ err }, 'SLA reconciliation check skipped (database might be initializing)');
    }
  }
}

export const slaService = new SlaEscalationService();
