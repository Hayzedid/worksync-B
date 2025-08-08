import express from 'express';
import { getActivityFeed } from '../controllers/activityController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/workspaces/:id/activity', getActivityFeed);

export default router; 