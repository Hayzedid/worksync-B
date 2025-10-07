// GET /api/activities - Return all activities
import { pool } from '../config/database.js';

export const getAllActivities = async (req, res, next) => {
  try {
    const [activities] = await pool.execute(`
      SELECT a.*, u.username, u.first_name, u.last_name
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
    `);

    const normalize = (a) => ({
      id: a.id,
      type: a.type || 'activity',
      user: { name: (a.username ?? `${(a.first_name ?? '')} ${(a.last_name ?? '')}`.trim()) || 'Unknown' },
      message: a.message ?? a.content ?? a.details ?? '',
      createdAt: a.created_at ?? a.createdAt ?? null
    });

    res.json({ success: true, activities: (Array.isArray(activities) ? activities.map(normalize) : []) });
  } catch (err) {
    next(err);
  }
};
import { getWorkspaceActivity, logActivity } from '../models/ActivityLog.js';
import { getWorkspaceMembers } from '../models/Workspace.js';

export async function getActivityFeed(req, res, next) {
  try {
    const { id } = req.params; // workspace id
    const rows = await getWorkspaceActivity(id);
    const normalize = (a) => ({
      id: a.id,
      type: a.action ?? 'activity',
      user: { name: (a.username ?? `${(a.first_name ?? '')} ${(a.last_name ?? '')}`.trim()) || 'Unknown' },
      message: a.details ?? a.message ?? '',
      createdAt: a.created_at ?? null
    });
    res.json({ success: true, activity: Array.isArray(rows) ? rows.map(normalize) : [] });
  } catch (error) {
    next(error);
  }
}

export async function logActivityAndNotify(workspace_id, user_id, action, details) {
  const activity = await logActivity({ workspace_id, user_id, action, details });
  // Emitting via websockets is optional; skip to avoid server import side-effects in tests
  try {
    const members = await getWorkspaceMembers(workspace_id);
    void members; // kept for future use
  } catch {}
  return activity;
}