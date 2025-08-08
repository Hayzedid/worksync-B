import { io } from '../server.js';
import { getWorkspaceActivity } from '../models/ActivityLog.js';
import { getWorkspaceMembers } from '../models/Workspace.js';

export async function getActivityFeed(req, res, next) {
  try {
    const { id } = req.params; // workspace id
    const activity = await getWorkspaceActivity(id);
    res.json({ success: true, activity });
  } catch (error) {
    next(error);
  }
}

export async function logActivityAndNotify(workspace_id, user_id, action, details) {
  // Log the activity
  const activity = await logActivity({ workspace_id, user_id, action, details });
  // Get all workspace members
  const members = await getWorkspaceMembers(workspace_id);
  // Emit real-time event to all members
  members.forEach(member => {
    io.to(member.id.toString()).emit('activity', activity);
  });
  return activity;
} 