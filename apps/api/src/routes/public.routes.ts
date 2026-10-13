import { Router } from 'express';
import { PublicController } from '../controllers/public.controller.js';

const router = Router();

router.get('/stats', PublicController.getStats);
router.get('/map', PublicController.getPublicMap);
router.get('/leaderboard', PublicController.getLeaderboard);

export default router;
