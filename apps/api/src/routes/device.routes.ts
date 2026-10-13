import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller.js';
import { deviceLimiter } from '../middleware/rate-limiter.js';

const router = Router();

router.post('/readings', deviceLimiter, DeviceController.ingestReading);
router.post('/readings/batch', deviceLimiter, DeviceController.ingestBatch);
router.post('/heartbeat', DeviceController.heartbeat);
router.get('/config', DeviceController.getConfig);

export default router;
