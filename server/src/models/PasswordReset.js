import { pool } from '../config/database.js';

export async function createPasswordReset({ user_id, token_hash, expires_at }) {
  const [result] = await pool.execute(
    `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [user_id, token_hash, expires_at]
  );
  return result.insertId;
}

export async function findValidResetByHash(token_hash) {
  const [rows] = await pool.execute(
    `SELECT * FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1`,
    [token_hash]
  );
  return rows[0] || null;
}

export async function markResetUsed(id) {
  await pool.execute(`UPDATE password_resets SET used_at = NOW() WHERE id = ?`, [id]);
}

export async function invalidateAllForUser(user_id) {
  await pool.execute(`UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`, [user_id]);
}
