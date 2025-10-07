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
    `SELECT al.*, u.username, u.first_name, u.last_name
     FROM activity_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.workspace_id = ?
     ORDER BY al.created_at DESC`,
    [workspace_id]
  );
  return rows;
} 