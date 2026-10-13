import { Response } from 'express';
import { logger } from '../../lib/logger.js';

export class SseService {
  private deviceClients = new Map<string, Set<Response>>();
  private complaintClients = new Set<Response>();

  /**
   * Register a new client for a specific IoT device stream
   */
  public addDeviceClient(deviceId: string, res: Response): void {
    if (!this.deviceClients.has(deviceId)) {
      this.deviceClients.set(deviceId, new Set());
    }
    this.deviceClients.get(deviceId)!.add(res);
    logger.debug({ deviceId, count: this.deviceClients.get(deviceId)!.size }, 'Device SSE client attached');

    res.on('close', () => {
      const set = this.deviceClients.get(deviceId);
      if (set) {
        set.delete(res);
        if (set.size === 0) {
          this.deviceClients.delete(deviceId);
        }
      }
    });
  }

  /**
   * Broadcast a telemetry reading to all subscribers of a device
   */
  public broadcastDeviceReading(deviceId: string, reading: any): void {
    const clients = this.deviceClients.get(deviceId);
    if (!clients || clients.size === 0) return;

    const payload = `data: ${JSON.stringify(reading)}\n\n`;
    for (const res of clients) {
      try {
        res.write(payload);
      } catch (err) {
        clients.delete(res);
      }
    }
  }

  /**
   * Register a client for the general complaints live feed
   */
  public addComplaintClient(res: Response): void {
    this.complaintClients.add(res);
    logger.debug({ count: this.complaintClients.size }, 'Complaint SSE client attached');

    res.on('close', () => {
      this.complaintClients.delete(res);
    });
  }

  /**
   * Broadcast complaint state transition to officers/supervisors
   */
  public broadcastComplaintEvent(event: { type: string; complaint: any }): void {
    if (this.complaintClients.size === 0) return;

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of this.complaintClients) {
      try {
        res.write(payload);
      } catch (err) {
        this.complaintClients.delete(res);
      }
    }
  }
}

export const sseService = new SseService();
