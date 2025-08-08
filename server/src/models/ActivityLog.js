import { pool } from '../config/database.js';

export async function logActivity({ workspace_id, user_id, action, details }) {
  const [result] = await pool.execute(
    `INSERT INTO activity_logs (workspace_id, user_id, action, details) VALUES (?, ?, ?, ?)`,
    [workspace_id, user_id, action, details]
  );
  return result.insertId;
}

export async function getWorkspaceActivity(workspace_id) {
  const [rows] = await pool.execute(
    `SELECT * FROM activity_logs WHERE workspace_id = ? ORDER BY created_at DESC`,
    [workspace_id]
  );
  return rows;
} 