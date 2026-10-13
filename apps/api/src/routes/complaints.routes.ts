import { Router } from 'express';
import multer from 'multer';
import { ComplaintsController } from '../controllers/complaints.controller.js';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth.middleware.js';
import { complaintLimiter } from '../middleware/rate-limiter.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max per file
});

const router = Router();

router.post(
  '/',
  complaintLimiter,
  optionalAuthenticate,
  upload.array('photos', 4),
  ComplaintsController.create
);

router.get('/', optionalAuthenticate, ComplaintsController.list);
router.get('/nearby', ComplaintsController.nearby);
router.get('/:id', optionalAuthenticate, ComplaintsController.getById);

router.patch(
  '/:id/status',
  authenticate,
  authorize('OFFICER', 'SUPERVISOR', 'ADMIN'),
  upload.single('afterPhoto'),
  ComplaintsController.updateStatus
);

router.post(
  '/:id/assign',
  authenticate,
  authorize('SUPERVISOR', 'ADMIN'),
  ComplaintsController.assign
);

router.post('/:id/comments', authenticate, ComplaintsController.addComment);
router.post('/:id/upvote', authenticate, ComplaintsController.upvote);
router.post('/:id/confirm-resolution', authenticate, ComplaintsController.confirmResolution);
router.post('/:id/reject-resolution', authenticate, ComplaintsController.rejectResolution);
router.post('/:id/appeal', authenticate, ComplaintsController.appeal);

export default router;
