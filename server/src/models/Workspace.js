// Alias for compatibility with service imports
export { deleteWorkspace as deleteWorkspaceById };
// models/workspaceModel.js
import { pool } from '../config/database.js';

// Create a new workspace
export async function createWorkspace({ name, description, created_by }) {
  const [result] = await pool.execute(
    'INSERT INTO workspaces (name, description, created_by) VALUES (?, ?, ?)',
    [name, description, created_by]
  );
  return result.insertId;
}

// Get all workspaces created by a user
export async function getWorkspacesByUser(userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM workspaces WHERE created_by = ?',
    [userId]
  );
  return rows;
}

// Get a single workspace by ID
export async function getWorkspaceById(id) {
  const [rows] = await pool.execute(
    'SELECT * FROM workspaces WHERE id = ?',
    [id]
  );
  return rows[0];
}

// Add a user to a workspace
export async function addUserToWorkspace(workspace_id, user_id) {
  await pool.execute(
    'INSERT INTO workspace_members (workspace_id, user_id) VALUES (?, ?)',
    [workspace_id, user_id]
  );
}

// Get all members of a workspace
export async function getWorkspaceMembers(workspace_id) {
  const [rows] = await pool.execute(
    `SELECT users.id, users.email, users.first_name, users.last_name
     FROM users
     JOIN workspace_members ON users.id = workspace_members.user_id
     WHERE workspace_members.workspace_id = ?`,
    [workspace_id]
  );
  return rows;
}

// Update a workspace (only by creator)
export async function updateWorkspace({ id, userId, name, description }) {
  const [result] = await pool.execute(
    'UPDATE workspaces SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND created_by = ?',
    [name, description, id, userId]
  );
  return result.affectedRows;
}

// Delete a workspace (only by creator)
export async function deleteWorkspace(id, userId) {
  const [result] = await pool.execute(
    'DELETE FROM workspaces WHERE id = ? AND created_by = ?',
    [id, userId]
  );
  return result.affectedRows;
}
