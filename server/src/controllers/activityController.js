import { getWorkspaceActivity, logActivity } from '../models/ActivityLog.js';
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
  const activity = await logActivity({ workspace_id, user_id, action, details });
  // Emitting via websockets is optional; skip to avoid server import side-effects in tests
  try {
    const members = await getWorkspaceMembers(workspace_id);
    void members; // kept for future use
  } catch {}
  return activity;
}