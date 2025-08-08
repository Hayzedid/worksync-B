import { pool } from '../config/database.js';

// Create a comment (for task or note)
export async function createComment({ content, commentable_type, commentable_id, created_by, parent_id = null }) {
  const [result] = await pool.execute(
    `INSERT INTO comments (content, commentable_type, commentable_id, created_by, parent_id) VALUES (?, ?, ?, ?, ?)`,
    [content, commentable_type, commentable_id, created_by, parent_id]
  );
  return result.insertId;
}

// Get comments for a task or note
export async function getComments({ commentable_type, commentable_id }) {
  const [rows] = await pool.execute(
    `SELECT * FROM comments WHERE commentable_type = ? AND commentable_id = ? ORDER BY created_at ASC`,
    [commentable_type, commentable_id]
  );
  return rows;
} 