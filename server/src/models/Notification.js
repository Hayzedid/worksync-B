import { pool } from '../config/database.js';

export async function getUserNotifications(user_id) {
  const [rows] = await pool.execute(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC`,
    [user_id]
  );
  return rows;
}

export async function markNotificationRead(id, user_id) {
  await pool.execute(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
    [id, user_id]
  );
}

export async function createNotification({ user_id, type, title, message, related_id, related_type }) {
  const [result] = await pool.execute(
    `INSERT INTO notifications (user_id, type, title, message, related_id, related_type) VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, type, title, message, related_id, related_type]
  );
  return result.insertId;
} 