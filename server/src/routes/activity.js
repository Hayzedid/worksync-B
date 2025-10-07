import express from 'express';
import { getActivityFeed, getAllActivities } from '../controllers/activityController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/activities - Return all activities
// Return recent comment-based activity for the authenticated user at GET /api/activity
router.get('/', async (req, res, next) => {
  try {
    const { pool } = await import('../config/database.js');

    // Get recent activity from comments table and include user info
    const [activities] = await pool.execute(`
      SELECT 
        c.id,
        c.content,
        c.entity_type as commentable_type,
        c.entity_id as commentable_id,
        c.user_id,
        c.created_at,
        u.username,
        u.first_name,
        u.last_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `, [req.user.id]);

    const normalized = (activities || []).map((a) => {
      const name = a.username || `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || 'Unknown';
      return {
        id: a.id,
        type: 'comment',
        user: { name },
        message: a.content ?? '',
        createdAt: a.created_at
      };
    });

    res.json({ success: true, activities: normalized });
  } catch (error) {
    console.error('Activity API error:', error);
    next(error);
  }
});

// Keep a route to fetch all activity records (normalized) if needed
router.get('/all', getAllActivities);

// Original route
router.get('/workspaces/:id/activity', getActivityFeed);

export default router;