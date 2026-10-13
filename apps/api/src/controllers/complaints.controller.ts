import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { storageService } from '../services/storage/index.js';
import { aiService } from '../services/ai/ai.service.js';
import { PHashService } from '../services/ai/phash.service.js';
import { GeoClusterService } from '../services/complaints/geo-cluster.service.js';
import { PriorityCalculatorService } from '../services/complaints/priority-calculator.service.js';
import { slaService } from '../services/queue/sla-escalation.service.js';
import { emailService } from '../services/email/email.service.js';
import { sseService } from '../services/sse/sse.service.js';
import { config } from '../config/index.js';

const CreateComplaintSchema = z.object({
  title: z.string().min(3, 'Title is too short'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  address: z.string().min(3, 'Address is required'),
  landmark: z.string().optional(),
  wardId: z.string().optional(),
  selfSeverity: z.coerce.number().min(1).max(10).optional(),
  voiceNote: z.string().optional(),
});

export class ComplaintsController {
  public static async create(req: Request, res: Response) {
    const data = CreateComplaintSchema.parse(req.body);
    const files = (req.files as Express.Multer.File[]) || [];

    // Find or fallback Ward
    let wardId = data.wardId;
    if (!wardId) {
      const defaultWard = await prisma.ward.findFirst();
      wardId = defaultWard?.id || 'ward-1';
    }

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      return res.status(400).json({ success: false, error: { message: 'Invalid category specified.' } });
    }

    // 1. Process uploaded photos & compute pHash
    const uploadedMedia: Array<{ url: string; phash: string; buffer: Buffer }> = [];
    for (const file of files) {
      const stored = await storageService.uploadFile(file.buffer, {
        filename: file.originalname,
        mimeType: file.mimetype,
        folder: 'complaints',
      });
      const phash = PHashService.computeHash(file.buffer);
      uploadedMedia.push({ url: stored.url, phash, buffer: file.buffer });
    }

    // Fetch existing pHashes for duplicate detection
    const recentMedia = await prisma.complaintMedia.findMany({
      where: { phash: { not: null } },
      select: { phash: true },
      take: 200,
    });
    const existingHashes = recentMedia.map((m: any) => m.phash!).filter(Boolean);

    // 2. Spatial Duplicate Check (Cluster parent within 50m)
    const clusterParent = await GeoClusterService.findClusterParent(
      data.latitude,
      data.longitude,
      data.categoryId,
      50.0
    );

    // 3. AI Vision Verification & Ranking
    const aiEvaluation = await aiService.evaluateComplaint(
      {
        imageUrls: uploadedMedia.map((m) => m.url),
        imageBuffers: uploadedMedia.map((m) => m.buffer),
        userCategory: category.name,
        title: data.title,
        description: `${data.description} ${data.voiceNote || ''}`,
        gpsCoords: { latitude: data.latitude, longitude: data.longitude },
        reporterTrustScore: req.user?.id ? 1.0 : 0.8,
      },
      existingHashes
    );

    // 4. Initial Status and Priority Calculation
    let initialStatus: any = 'SUBMITTED';
    if (aiEvaluation.decision === 'REJECTED_SPAM') {
      initialStatus = 'REJECTED_SPAM';
    } else if (aiEvaluation.decision === 'NEEDS_HUMAN_REVIEW') {
      initialStatus = 'NEEDS_REVIEW';
    } else {
      initialStatus = 'ASSIGNED'; // Verified & routed to ward staff
    }

    // Check sensitive POI near complaint (hospital, school, market, water)
    const isSensitive =
      data.description.toLowerCase().includes('hospital') ||
      data.description.toLowerCase().includes('school') ||
      data.description.toLowerCase().includes('market') ||
      data.description.toLowerCase().includes('water');

    const priorityResult = PriorityCalculatorService.calculate({
      aiSeverity: aiEvaluation.emergency.severity,
      isNearSensitivePoi: isSensitive,
      duplicateCount: clusterParent ? 1 : 0,
      upvoteCount: 1,
      createdAt: new Date(),
      slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000),
      hasHighSensorGasReading: false,
    });

    // Find Ward Officer for Assignment
    const assignedOfficer = await prisma.user.findFirst({
      where: { wardId, role: 'OFFICER', isActive: true },
    });

    const publicCode = `CC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const slaDeadline = new Date(Date.now() + (config.sla.overrideMinutes > 0 ? config.sla.overrideMinutes * 60 * 1000 : 72 * 60 * 60 * 1000));

    // 5. Create Complaint Record in Database
    const complaint = await prisma.complaint.create({
      data: {
        publicCode,
        reporterId: req.user?.id || null,
        source: 'CITIZEN',
        categoryId: category.id,
        title: data.title,
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        landmark: data.landmark,
        wardId,
        status: initialStatus,
        priorityScore: priorityResult.score,
        priorityLabel: priorityResult.label,
        aiSeverity: aiEvaluation.emergency.severity,
        slaDeadline,
        assignedOfficerId: assignedOfficer?.id || null,
        parentComplaintId: clusterParent ? clusterParent.id : null,
        upvoteCount: 1,
      },
    });

    // 6. Save Media attachments
    for (const m of uploadedMedia) {
      await prisma.complaintMedia.create({
        data: {
          complaintId: complaint.id,
          url: m.url,
          type: 'BEFORE',
          phash: m.phash,
          exif: JSON.stringify({ latitude: data.latitude, longitude: data.longitude }),
        },
      });
    }

    // 7. Save AI Verification record
    await prisma.aiVerification.create({
      data: {
        complaintId: complaint.id,
        rawResponse: JSON.stringify(aiEvaluation),
        authenticityScore: aiEvaluation.calculatedScore,
        flags: JSON.stringify(aiEvaluation.flags),
        decision: aiEvaluation.decision,
        detectedIssueType: aiEvaluation.verification.detected_issue_type,
        matchesUserCategory: aiEvaluation.verification.matches_user_category,
        confidence: aiEvaluation.verification.confidence,
        model: config.ai.provider,
        reasoning: aiEvaluation.verification.reasoning,
      },
    });

    // 8. Record Status History
    await prisma.statusHistory.create({
      data: {
        complaintId: complaint.id,
        fromStatus: 'NONE',
        toStatus: initialStatus,
        actorId: req.user?.id || null,
        note: `Complaint submitted by citizen. AI Decision: ${aiEvaluation.decision} (${aiEvaluation.verification.reasoning})`,
      },
    });

    // If linked to cluster parent, bump parent upvotes and priority
    if (clusterParent) {
      await prisma.complaint.update({
        where: { id: clusterParent.id },
        data: {
          upvoteCount: { increment: 1 },
          priorityScore: Math.min(100.0, clusterParent.priorityScore + 8.0),
        },
      });
      logger.info({ childId: complaint.id, parentId: clusterParent.id }, 'Linked to duplicate cluster parent');
    }

    // 9. Schedule SLA Escalation if not spam
    if (initialStatus !== 'REJECTED_SPAM') {
      await slaService.scheduleSlaJobs(complaint.id, slaDeadline);

      // T+0 alert email to assigned officer
      if (assignedOfficer?.email) {
        await emailService.sendOfficerAlert(assignedOfficer.email, complaint.publicCode, 'ASSIGNMENT', 72);
      }
    }

    // 10. Broadcast complaint event over SSE
    sseService.broadcastComplaintEvent({
      type: 'COMPLAINT_CREATED',
      complaint: {
        ...complaint,
        category: category.name,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        complaintId: complaint.id,
        publicCode: complaint.publicCode,
        status: complaint.status,
        slaDeadline: complaint.slaDeadline,
        priorityScore: complaint.priorityScore,
        priorityLabel: complaint.priorityLabel,
        aiVerification: {
          decision: aiEvaluation.decision,
          authenticityScore: aiEvaluation.calculatedScore,
          flags: aiEvaluation.flags,
          reasoning: aiEvaluation.verification.reasoning,
        },
        duplicateLinked: !!clusterParent,
      },
    });
  }

  public static async list(req: Request, res: Response) {
    const { status, categoryId, wardId, priority, source, mine, search, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (wardId) where.wardId = wardId;
    if (priority) where.priorityLabel = priority;
    if (source) where.source = source;
    if (mine === 'true' && req.user) {
      where.reporterId = req.user.id;
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { publicCode: { contains: search as string, mode: 'insensitive' } },
        { address: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
        include: {
          category: { select: { id: true, name: true, icon: true } },
          ward: { select: { id: true, name: true } },
          media: { take: 2 },
          assignedOfficer: { select: { id: true, name: true } },
          // Hide reporter identity for public privacy
          reporter: { select: { id: true } },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: items,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  }

  public static async getById(req: Request, res: Response) {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        category: true,
        ward: true,
        media: true,
        aiVerifications: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { id: true, name: true, role: true } } },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, role: true } } },
        },
        assignedOfficer: { select: { id: true, name: true, email: true } },
      },
    });

    if (!complaint) {
      return res.status(404).json({ success: false, error: { message: 'Complaint not found.' } });
    }

    return res.json({
      success: true,
      data: complaint,
    });
  }

  public static async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status, note } = req.body;
    const file = req.file;

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return res.status(404).json({ success: false, error: { message: 'Complaint not found.' } });
    }

    // Requirement: uploading "after" photo is required to mark Resolved
    if (status === 'RESOLVED' && !file) {
      return res.status(400).json({
        success: false,
        error: { message: 'An "after" resolution photo is mandatory to mark a complaint as RESOLVED.' },
      });
    }

    let afterPhotoUrl: string | undefined;
    if (file) {
      const stored = await storageService.uploadFile(file.buffer, {
        filename: file.originalname,
        mimeType: file.mimetype,
        folder: 'resolutions',
      });
      afterPhotoUrl = stored.url;

      await prisma.complaintMedia.create({
        data: {
          complaintId: id,
          url: stored.url,
          type: 'AFTER',
        },
      });
    }

    const isResolved = status === 'RESOLVED';
    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status,
        resolvedAt: isResolved ? new Date() : complaint.resolvedAt,
      },
    });

    // Record status transition
    await prisma.statusHistory.create({
      data: {
        complaintId: id,
        fromStatus: complaint.status,
        toStatus: status,
        actorId: req.user?.id || null,
        note: note || `Status updated to ${status} by ${req.user?.role || 'staff'}.`,
      },
    });

    // Cancel SLA timers if resolved
    if (isResolved) {
      await slaService.cancelSlaJobs(id);
    }

    sseService.broadcastComplaintEvent({
      type: 'STATUS_UPDATED',
      complaint: updated,
    });

    return res.json({
      success: true,
      data: updated,
    });
  }

  public static async assign(req: Request, res: Response) {
    const { id } = req.params;
    const { officerId } = req.body;

    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer) {
      return res.status(404).json({ success: false, error: { message: 'Officer not found.' } });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        assignedOfficerId: officerId,
        status: 'ASSIGNED',
      },
    });

    await prisma.statusHistory.create({
      data: {
        complaintId: id,
        fromStatus: updated.status,
        toStatus: 'ASSIGNED',
        actorId: req.user?.id || null,
        note: `Reassigned to officer ${officer.name}.`,
      },
    });

    return res.json({ success: true, data: updated });
  }

  public static async addComment(req: Request, res: Response) {
    const { id } = req.params;
    const { content, isInternal = false } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Comment content cannot be empty.' } });
    }

    const comment = await prisma.comment.create({
      data: {
        complaintId: id,
        userId: req.user!.id,
        content,
        isInternal: Boolean(isInternal),
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    return res.status(201).json({ success: true, data: comment });
  }

  public static async upvote(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user!.id;

    try {
      await prisma.upvote.create({
        data: { complaintId: id, userId },
      });

      const updated = await prisma.complaint.update({
        where: { id },
        data: {
          upvoteCount: { increment: 1 },
          priorityScore: { increment: 5.0 }, // upvotes bump priority
        },
      });

      return res.json({
        success: true,
        data: { upvoteCount: updated.upvoteCount, priorityScore: updated.priorityScore },
      });
    } catch (err) {
      return res.status(409).json({
        success: false,
        error: { message: 'You have already upvoted this complaint.' },
      });
    }
  }

  public static async confirmResolution(req: Request, res: Response) {
    const { id } = req.params;

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    await prisma.statusHistory.create({
      data: {
        complaintId: id,
        fromStatus: 'RESOLVED',
        toStatus: 'CLOSED',
        actorId: req.user?.id || null,
        note: 'Citizen confirmed resolution. Grievance closed successfully.',
      },
    });

    return res.json({ success: true, data: updated });
  }

  public static async rejectResolution(req: Request, res: Response) {
    const { id } = req.params;
    const { reason } = req.body;

    // Requirement: Resolved-then-rejected complaints restart a shorter SLA (24h) and escalate faster
    const shorterSlaDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'REOPENED',
        priorityScore: 92.0, // escalated priority
        priorityLabel: 'CRITICAL',
        slaDeadline: shorterSlaDeadline,
      },
    });

    await prisma.statusHistory.create({
      data: {
        complaintId: id,
        fromStatus: 'RESOLVED',
        toStatus: 'REOPENED',
        actorId: req.user?.id || null,
        note: `Citizen rejected resolution: "${reason || 'Issue still persists'}". Restarted 24h accelerated SLA.`,
      },
    });

    // Schedule 24h accelerated SLA timers
    await slaService.scheduleSlaJobs(id, shorterSlaDeadline);

    return res.json({
      success: true,
      data: {
        complaint: updated,
        message: 'Resolution rejected. Complaint reopened with 24-hour accelerated priority SLA.',
      },
    });
  }

  public static async appeal(req: Request, res: Response) {
    const { id } = req.params;
    const { appealReason } = req.body;

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: 'NEEDS_REVIEW' },
    });

    await prisma.statusHistory.create({
      data: {
        complaintId: id,
        fromStatus: 'REJECTED_SPAM',
        toStatus: 'NEEDS_REVIEW',
        actorId: req.user?.id || null,
        note: `Citizen appealed AI spam classification: "${appealReason || 'Legitimate issue'}". Routed to supervisor review.`,
      },
    });

    return res.json({ success: true, data: updated });
  }

  public static async nearby(req: Request, res: Response) {
    const { lat, lng, radius = '500' } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: { message: 'Missing lat or lng parameter.' } });
    }

    const results = await GeoClusterService.findNearbyComplaints(
      parseFloat(lat as string),
      parseFloat(lng as string),
      parseFloat(radius as string)
    );

    return res.json({ success: true, data: results });
  }
}
