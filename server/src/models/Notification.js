import { pool } from '../config/database.js';
import { sanitizeParams } from '../utils/sql.js';

export async function getUserNotifications(user_id, workspace_id = null) {
  let query = `SELECT * FROM notifications WHERE user_id = ?`;
  let params = [user_id];
  
  if (workspace_id) {
    query += ` AND related_workspace_id = ?`;
    params.push(workspace_id);
  }
  
  query += ` ORDER BY created_at DESC`;
  
  const [rows] = await pool.execute(query, sanitizeParams(params));
  return rows;
}

export async function markNotificationRead(id, user_id) {
  await pool.execute(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
  sanitizeParams([id, user_id])
  );
}

export async function createNotification({ user_id, type, title, message, related_id, related_type, workspace_id = null }) {
  const [result] = await pool.execute(
    `INSERT INTO notifications (user_id, type, title, message, related_id, related_type, related_workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  sanitizeParams([user_id, type, title, message, related_id, related_type, workspace_id])
  );
  return result.insertId;
}

export async function getUnreadCount(user_id) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
  sanitizeParams([user_id])
  );
  return rows[0].count;
} 