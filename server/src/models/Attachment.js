import { pool } from '../config/database.js';

export async function createAttachment({ file_name, file_path, file_type, uploaded_by, task_id = null, note_id = null }) {
  const [result] = await pool.execute(
    `INSERT INTO attachments (file_name, file_path, file_type, uploaded_by, task_id, note_id) VALUES (?, ?, ?, ?, ?, ?)` ,
    [file_name, file_path, file_type, uploaded_by, task_id, note_id]
  );
  return result.insertId;
}

export async function getAttachmentsForTask(task_id) {
  const [rows] = await pool.execute(
    `SELECT * FROM attachments WHERE task_id = ?`,
    [task_id]
  );
  return rows;
}

export async function getAttachmentsForNote(note_id) {
  const [rows] = await pool.execute(
    `SELECT * FROM attachments WHERE note_id = ?`,
    [note_id]
  );
  return rows;
}

export async function deleteAttachment(id, user_id) {
  await pool.execute(
    `DELETE FROM attachments WHERE id = ? AND uploaded_by = ?`,
    [id, user_id]
  );
} 