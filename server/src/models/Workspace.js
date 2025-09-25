// models/workspaceModel.js
import { pool } from '../config/database.js';
import { sanitizeParams } from '../utils/sql.js';

// Create a new workspace
export async function createWorkspace({ name, description, created_by }) {
  const [result] = await pool.execute(
    'INSERT INTO workspaces (name, description, created_by) VALUES (?, ?, ?)',
  sanitizeParams([name, description, created_by])
  );
  return result.insertId;
}

// Get all workspaces created by a user
export async function getWorkspacesByUser(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM workspaces WHERE created_by = ?',
  sanitizeParams([userId])
  );
  return rows;
}

// Get a single workspace by ID
export async function getWorkspaceById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM workspaces WHERE id = ?',
  sanitizeParams([id])
  );
  return rows[0];
}

// Add a user to a workspace
export async function addUserToWorkspace(workspace_id, user_id, role = 'member') {
  await pool.execute(
    'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)',
  sanitizeParams([workspace_id, user_id, role])
  );
}

// Get all members of a workspace
export async function getWorkspaceMembers(workspace_id) {
  const [rows] = await pool.execute(
    `SELECT users.id, users.email, users.first_name, users.last_name
     FROM users
     JOIN workspace_members ON users.id = workspace_members.user_id
     WHERE workspace_members.workspace_id = ?`,
  sanitizeParams([workspace_id])
  );
  return rows;
}

// Update a workspace (only by creator)
export async function updateWorkspace({ id, userId, name, description }) {
  const [result] = await pool.execute(
    'UPDATE workspaces SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND created_by = ?',
  sanitizeParams([name, description, id, userId])
  );
  return result.affectedRows;
}

// Delete a workspace (only by creator)
export async function deleteWorkspace(id, userId) {
  const [result] = await pool.execute(
    'DELETE FROM workspaces WHERE id = ? AND created_by = ?',
  sanitizeParams([id, userId])
  );
  return result.affectedRows;
}

// Check if user has permission to invite others to workspace
export async function checkWorkspaceInvitePermission(workspace_id, user_id) {
  const [rows] = await pool.execute(
    `SELECT wm.role, w.created_by 
     FROM workspace_members wm
     JOIN workspaces w ON wm.workspace_id = w.id
     WHERE wm.workspace_id = ? AND wm.user_id = ?`,
    sanitizeParams([workspace_id, user_id])
  );
  
  if (rows.length === 0) {
    return { hasPermission: false, reason: 'User is not a member of this workspace' };
  }
  
  const { role, created_by } = rows[0];
  
  // Only owners, admins, and workspace creators can invite
  if (role === 'owner' || role === 'admin' || created_by === user_id) {
    return { hasPermission: true };
  }
  
  return { hasPermission: false, reason: 'Only workspace owners, admins, and creators can invite users' };
}

// Alias for compatibility with service imports
export { deleteWorkspace as deleteWorkspaceById };
