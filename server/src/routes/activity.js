import express from 'express';
import { getActivityFeed } from '../controllers/activityController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Align with test expecting /api/activity
router.get('/activity', (req, res, next) => {
  // Default to current user's workspace if available
  req.params.id = req.user?.workspace_id || 1;
  return getActivityFeed(req, res, next);
});

// Original route
router.get('/workspaces/:id/activity', getActivityFeed);

export default router; 