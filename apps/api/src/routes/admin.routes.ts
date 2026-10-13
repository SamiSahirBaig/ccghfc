import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Protect all admin endpoints with authentication and ADMIN or SUPERVISOR role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPERVISOR'));

router.get('/users', AdminController.listUsers);
router.get('/wards', AdminController.listWards);
router.get('/categories', AdminController.listCategories);

// Device management
router.get('/devices', AdminController.listDevices);
router.post('/devices', authorize('ADMIN'), AdminController.registerDevice);
router.patch('/devices/:id', authorize('ADMIN'), AdminController.updateDevice);
router.post('/devices/:id/calibrate', authorize('ADMIN'), AdminController.calibrateDevice);

// Analytics
router.get('/analytics/summary', AdminController.getAnalyticsSummary);
router.get('/analytics/hotspots', AdminController.getHotspots);

// Settings
router.get('/settings', AdminController.getSettings);
router.put('/settings', authorize('ADMIN'), AdminController.updateSettings);

// Audit logs
router.get('/audit-logs', authorize('ADMIN'), AdminController.getAuditLogs);

export default router;
