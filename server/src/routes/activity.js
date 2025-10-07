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
    const { pool } = await import('../config/database.js');
    
    console.log('Activity API called for user:', req.user.id);
    
    // Get recent activity from comments table (where activity data is actually stored)
    const [activities] = await pool.execute(`
      SELECT 
        id,
        content,
        entity_type as commentable_type,
        entity_id as commentable_id,
        user_id,
        created_at
      FROM comments 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [req.user.id]);
    
    console.log('Found activities:', activities.length);
    console.log('Activities data:', activities);
    
    res.json({ success: true, activities });
  } catch (error) {
    console.error('Activity API error:', error);
    next(error);
  }
});

// Original route
router.get('/workspaces/:id/activity', getActivityFeed);

export default router;