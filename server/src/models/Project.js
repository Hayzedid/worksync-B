// models/projectModel.js
import { pool } from '../config/database.js';
import { sanitizeParams } from '../utils/sql.js';

export const getAllProjectsForUser = async (userId, workspaceId) => {
  let sql = `
    SELECT p.*, w.id AS workspace_join_id, w.name AS workspace_name
    FROM projects p
    LEFT JOIN workspaces w ON p.workspace_id = w.id
    WHERE p.created_by = ?`;
  const params = [userId];
  if (workspaceId) {
    sql += ' AND p.workspace_id = ?';
    params.push(workspaceId);
  }
  // Order by: general projects (workspace_id IS NULL) first, then workspace projects
  // Within each group, order by most recent created_at first
  sql += ' ORDER BY p.workspace_id IS NULL DESC, p.created_at DESC';
  const [rows] = await pool.execute(sql, sanitizeParams(params));
  return rows;
};

export const getProjectById = async (projectId, userId) => {
  const [rows] = await pool.execute(
    `SELECT p.*, w.id AS workspace_join_id, w.name AS workspace_name
     FROM projects p
     LEFT JOIN workspaces w ON p.workspace_id = w.id
     WHERE p.id = ? AND p.created_by = ?`,
  sanitizeParams([projectId, userId])
  );
  return rows[0];
};

export const createNewProject = async ({ userId, name, description, status, workspace_id = null }) => {
  const [result] = await pool.execute(
    'INSERT INTO projects (created_by, name, description, status, workspace_id) VALUES (?, ?, ?, ?, ?)',
  sanitizeParams([userId, name, description || '', status || 'pending', workspace_id])
  );
  return result.insertId;
};

export const updateProjectById = async ({ id, userId, name, description, status, workspace_id }) => {
  console.log('Update project params:', { id, userId, name, description, status, workspace_id });
  
  // Build SET clause dynamically based on provided fields
  const updates = [];
  const params = [];
  
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (workspace_id !== undefined) {
    updates.push('workspace_id = ?');
    params.push(workspace_id);
  }
  
  // Always add updated_at
  updates.push('updated_at = CURRENT_TIMESTAMP');
  
  // If no fields to update, return early
  if (updates.length === 0) {
    throw new Error('No fields provided for update');
  }
  
  // Add WHERE clause parameters
  params.push(id, userId);
  
  const sql = `UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND created_by = ?`;
  console.log('Update SQL:', sql);
  
  const [result] = await pool.execute(sql, sanitizeParams(params));
  
  if (result.affectedRows === 0) {
    return null; // No rows updated, project not found
  }
  
  // Return the updated project
  return await getProjectById(id, userId);
};

export const deleteProjectById = async (id, userId) => {
  // Enhanced debug logging
  console.log('[deleteProjectById] Params:', { projectId: id, userId, typeofProjectId: typeof id, typeofUserId: typeof userId });

  // Final fallback: forcibly convert undefined/NaN to null
  const safeId = (id === undefined || isNaN(id)) ? null : id;
  const safeUserId = (userId === undefined || isNaN(userId)) ? null : userId;
  console.log('[deleteProjectById] Final SQL params:', [safeId, safeUserId]);
  console.log('[deleteProjectById] About to execute SQL DELETE with:', [safeId, safeUserId]);

  const [result] = await pool.execute(
    'DELETE FROM projects WHERE id = ? AND created_by = ?',
    sanitizeParams([safeId, safeUserId])
  );
  return result.affectedRows;
};

export async function searchProjects({ userId, q, status, workspaceId }) {
  let sql = `
    SELECT p.*, 
           w.name AS workspace_name,
           u.first_name AS creator_first_name,
           u.last_name AS creator_last_name,
           COUNT(t.id) AS task_count
    FROM projects p
    LEFT JOIN workspaces w ON p.workspace_id = w.id
    LEFT JOIN users u ON p.created_by = u.id
    LEFT JOIN tasks t ON p.id = t.project_id
    WHERE p.created_by = ?
  `;
  const params = [userId];
  
  // Filter by workspace
  if (workspaceId && workspaceId !== 'all') {
    sql += ' AND p.workspace_id = ?';
    params.push(workspaceId);
  }
  
  // Text search using LIKE (works without FULLTEXT indexes)
  if (q && q.trim()) {
    const searchTerm = `%${q.trim()}%`;
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(searchTerm, searchTerm);
  }
  
  // Filter by status
  if (status && status !== 'all') {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  
  // Group by project to get task count
  sql += ` GROUP BY p.id, w.name, u.first_name, u.last_name
           ORDER BY p.updated_at DESC, p.created_at DESC 
           LIMIT 50`;
  
  try {
    const [rows] = await pool.execute(sql, sanitizeParams(params));
    return rows;
  } catch (error) {
    console.error('Error in searchProjects:', error);
    throw error;
  }
}
