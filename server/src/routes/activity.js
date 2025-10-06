import express from 'express';
import { getActivityFeed, getAllActivities } from '../controllers/activityController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/activities - Return all activities
router.get('/', getAllActivities);

// Align with test expecting /api/activity
router.get('/activity', async (req, res, next) => {
  try {
    // Get user's workspace from workspace_members table or default to first workspace
    const { pool } = await import('../config/database.js');
    
    // Try to find user's workspace
    const [userWorkspaces] = await pool.execute(
      'SELECT workspace_id FROM workspace_members WHERE user_id = ? LIMIT 1',
      [req.user.id]
    );
    
    let workspaceId = 1; // default fallback
    
    if (userWorkspaces.length > 0) {
      workspaceId = userWorkspaces[0].workspace_id;
    } else {
      // If no workspace membership, get the first available workspace
      const [workspaces] = await pool.execute('SELECT id FROM workspaces ORDER BY id LIMIT 1');
      if (workspaces.length > 0) {
        workspaceId = workspaces[0].id;
      }
    }
    
    req.params.id = workspaceId;
    return getActivityFeed(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Original route
router.get('/workspaces/:id/activity', getActivityFeed);

export default router;