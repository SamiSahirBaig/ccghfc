import { Router, Request, Response } from 'express';
import { sseService } from '../services/sse/sse.service.js';

const router = Router();

router.get('/complaints', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseService.addComplaintClient(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Complaint stream active' })}\n\n`);
});

router.get('/devices/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  sseService.addDeviceClient(id, res);

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', deviceId: id })}\n\n`);
});

export default router;
