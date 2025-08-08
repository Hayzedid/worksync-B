// models/projectModel.js
import { pool } from '../config/database.js';

export const getAllProjectsForUser = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT * FROM projects WHERE owner_id = ?',
    [userId]
  );
  return rows;
};

export const getProjectById = async (projectId, userId) => {
  const [rows] = await pool.execute(
    'SELECT * FROM projects WHERE id = ? AND owner_id = ?',
    [projectId, userId]
  );
  return rows[0];
};

export const createNewProject = async ({ userId, name, description, status }) => {
  const [result] = await pool.execute(
    'INSERT INTO projects (owner_id, name, description, status) VALUES (?, ?, ?, ?)',
    [userId, name, description || '', status || 'active']
  );
  return result.insertId;
};

export const updateProjectById = async ({ id, userId, name, description, status }) => {
    console.log('Status to update:', status);
  const [result] = await pool.execute(
    'UPDATE projects SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?',
    [name, description, status, id, userId]
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

export async function searchProjects({ userId, q, status }) {
  let sql = `SELECT * FROM projects WHERE owner_id = ?`;
  const params = [userId];
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
