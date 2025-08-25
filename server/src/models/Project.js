// models/projectModel.js
import { pool } from '../config/database.js';

export const getAllProjectsForUser = async (userId, workspaceId) => {
  let sql = `
    SELECT p.*, w.id AS workspace_join_id, w.name AS workspace_name
    FROM projects p
    LEFT JOIN workspaces w ON p.workspace_id = w.id
    WHERE p.owner_id = ?`;
  const params = [userId];
  if (workspaceId) {
    sql += ' AND p.workspace_id = ?';
    params.push(workspaceId);
  }
  sql += ' ORDER BY p.created_at DESC';
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const getProjectById = async (projectId, userId) => {
  const [rows] = await pool.execute(
    `SELECT p.*, w.id AS workspace_join_id, w.name AS workspace_name
     FROM projects p
     LEFT JOIN workspaces w ON p.workspace_id = w.id
     WHERE p.id = ? AND p.owner_id = ?`,
    [projectId, userId]
  );
  return rows[0];
};

export const createNewProject = async ({ userId, name, description, status, workspace_id = null }) => {
  const [result] = await pool.execute(
    'INSERT INTO projects (owner_id, name, description, status, workspace_id) VALUES (?, ?, ?, ?, ?)',
    [userId, name, description || '', status || 'active', workspace_id]
  );
  return result.insertId;
};

export const updateProjectById = async ({ id, userId, name, description, status, workspace_id }) => {
  console.log('Status to update:', status);
  const [result] = await pool.execute(
    'UPDATE projects SET name = ?, description = ?, status = ?, workspace_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?',
    [name, description, status, workspace_id, id, userId]
  );
  return result.affectedRows;
};

export const deleteProjectById = async (id, userId) => {
  const [result] = await pool.execute(
    'DELETE FROM projects WHERE id = ? AND owner_id = ?',
    [id, userId]
  );
  return result.affectedRows;
};

export async function searchProjects({ userId, q, status, workspaceId }) {
  let sql = `SELECT * FROM projects WHERE owner_id = ?`;
  const params = [userId];
  if (workspaceId) {
    sql += ' AND workspace_id = ?';
    params.push(workspaceId);
  }
  if (q) {
    sql += ' AND MATCH(name, description) AGAINST (? IN NATURAL LANGUAGE MODE)';
    params.push(q);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}
