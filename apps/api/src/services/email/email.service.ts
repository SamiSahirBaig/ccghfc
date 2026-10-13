import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';

export interface EscalationEmailPayload {
  complaintId: string;
  publicCode: string;
  categoryName: string;
  title: string;
  description: string;
  priorityScore: number;
  priorityLabel: string;
  aiSeverity: number;
  latitude: number;
  longitude: number;
  address: string;
  assignedOfficerName?: string;
  assignedOfficerEmail?: string;
  supervisorEmail?: string;
  upvoteCount: number;
  elapsedHours: number;
  mediaUrls: string[];
  level: number; // 1 = DM, 2 = State
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.user
        ? {
            user: config.email.user,
            pass: config.email.pass,
          }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  /**
   * Verify SMTP connection status
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('SMTP transporter connection established');
      return true;
    } catch (err) {
      logger.warn({ err }, 'SMTP connection verification failed (development mailpit might be starting)');
      return false;
    }
  }

  /**
   * Send T+72h or T+120h SLA Escalation Email to District Magistrate Office
   */
  public async sendEscalationEmail(payload: EscalationEmailPayload): Promise<boolean> {
    const isLevel2 = payload.level === 2;
    const recipient = isLevel2 ? config.email.stateOversightEmail : config.email.dmOfficeEmail;
    const cc = payload.supervisorEmail ? [payload.supervisorEmail] : [];

    const subject = `[URGENT ESCALATION L${payload.level}] SLA Breached: Complaint ${payload.publicCode} (${payload.categoryName} - Priority ${payload.priorityLabel})`;

    const mapUrl = `https://www.openstreetmap.org/?mlat=${payload.latitude}&mlon=${payload.longitude}#map=17/${payload.latitude}/${payload.longitude}`;

    const photosHtml = payload.mediaUrls.length > 0
      ? payload.mediaUrls
          .map(
            (url, i) =>
              `<div style="margin: 8px 0;"><a href="${url}" target="_blank"><img src="${url}" alt="Evidence ${i + 1}" style="max-width: 480px; height: auto; border-radius: 8px; border: 1px solid #cbd5e1;" /></a></div>`
          )
          .join('')
      : '<p style="color: #64748b; font-style: italic;">No photographic media attached.</p>';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .card { max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: #dc2626; color: #ffffff; padding: 20px 24px; }
        .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #fee2e2; color: #991b1b; }
        .content { padding: 24px; }
        .field { margin-bottom: 16px; }
        .label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 4px; }
        .value { font-size: 15px; color: #0f172a; font-weight: 500; }
        .highlight-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 4px; margin: 20px 0; }
        .btn { display: inline-block; padding: 10px 20px; background: #0284c7; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; }
        .footer { background: #f1f5f9; padding: 16px 24px; font-size: 12px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🚨 District Magistrate Civic Escalation Notice</h1>
          <div>Complaint Code: <strong>${payload.publicCode}</strong> &bull; Level ${payload.level} Breach</div>
        </div>
        <div class="content">
          <div class="highlight-box">
            <strong style="color: #991b1b;">SLA RESOLUTION TIMEOUT:</strong>
            This civic grievance has exceeded the statutory ${config.sla.defaultHours}-hour resolution SLA. Unresolved duration: <strong>${payload.elapsedHours.toFixed(1)} hours</strong>.
          </div>

          <div class="field">
            <div class="label">Issue Title & Category</div>
            <div class="value">${payload.title} (${payload.categoryName})</div>
          </div>

          <div class="field">
            <div class="label">AI Severity & Composite Urgency Score</div>
            <div class="value">
              <span class="badge">${payload.priorityLabel} (Score: ${payload.priorityScore}/100)</span>
              &nbsp;&bull; AI Hazard Severity: ${payload.aiSeverity}/10
            </div>
          </div>

          <div class="field">
            <div class="label">Geographic Location & Address</div>
            <div class="value">${payload.address}</div>
            <div style="margin-top: 6px;">
              <a href="${mapUrl}" class="btn" target="_blank">🗺️ View Location on OpenStreetMap (${payload.latitude.toFixed(5)}, ${payload.longitude.toFixed(5)})</a>
            </div>
          </div>

          <div class="field">
            <div class="label">Accountability & Civic Impact</div>
            <div class="value">
              Assigned Ward Officer: <strong>${payload.assignedOfficerName || 'Unassigned'}</strong> (${payload.assignedOfficerEmail || 'N/A'})<br/>
              Citizens Affected / Upvoting: <strong>${payload.upvoteCount} citizens</strong>
            </div>
          </div>

          <div class="field">
            <div class="label">Issue Description</div>
            <div class="value" style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              ${payload.description}
            </div>
          </div>

          <div class="field">
            <div class="label">Photographic Evidence</div>
            ${photosHtml}
          </div>
        </div>
        <div class="footer">
          CityClean Automated Grievance Redressal &bull; District Magistrate Governance Portal &bull; Generated automatically via BullMQ Engine.
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: config.email.from,
        to: recipient,
        cc: cc.length > 0 ? cc : undefined,
        subject,
        html,
      });

      logger.info({ messageId: info.messageId, recipient, complaintId: payload.complaintId }, 'Escalation email successfully dispatched');

      // Record in escalation_logs table
      try {
        await prisma.escalationLog.create({
          data: {
            complaintId: payload.complaintId,
            level: payload.level,
            recipient,
            subject,
            status: 'SENT',
            providerMessageId: info.messageId,
            sentAt: new Date(),
          },
        });
      } catch (dbErr) {
        logger.warn({ dbErr }, 'Failed to record escalation log entry in database');
      }

      return true;
    } catch (err: any) {
      logger.error({ err, recipient, complaintId: payload.complaintId }, 'Failed to dispatch escalation email');

      try {
        await prisma.escalationLog.create({
          data: {
            complaintId: payload.complaintId,
            level: payload.level,
            recipient,
            subject,
            status: 'FAILED',
            error: err.message || 'Unknown SMTP error',
            sentAt: new Date(),
          },
        });
      } catch (dbErr) {
        // ignore
      }

      return false;
    }
  }

  /**
   * Send Officer Warning or Reminder Email
   */
  public async sendOfficerAlert(
    officerEmail: string,
    complaintCode: string,
    type: 'ASSIGNMENT' | 'REMINDER_24H' | 'WARNING_48H',
    hoursRemaining: number
  ): Promise<void> {
    const subjects = {
      ASSIGNMENT: `[New Assignment] Complaint ${complaintCode} assigned to your ward`,
      REMINDER_24H: `[24h Reminder] Complaint ${complaintCode} still pending action`,
      WARNING_48H: `[48h Warning] Only ${hoursRemaining}h remaining on Complaint ${complaintCode}!`,
    };

    const html = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px;">
        <h2>CityClean Ward Grievance Alert: ${complaintCode}</h2>
        <p><strong>Alert Type:</strong> ${type}</p>
        <p><strong>Time Remaining before DM Escalation:</strong> ${hoursRemaining} hours</p>
        <p>Please update complaint status and upload photographic proof upon resolution.</p>
        <a href="${config.webBaseUrl}/officer" style="padding: 10px 18px; background: #059669; color: white; text-decoration: none; border-radius: 6px;">Open Officer Dashboard</a>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: config.email.from,
        to: officerEmail,
        subject: subjects[type],
        html,
      });
    } catch (err) {
      logger.warn({ err, officerEmail }, 'Failed to send officer alert email');
    }
  }
}

export const emailService = new EmailService();
