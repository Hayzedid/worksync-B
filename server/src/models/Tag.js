import { pool } from '../config/database.js';

export async function createTag(name) {
  const [result] = await pool.execute(
    `INSERT IGNORE INTO tags (name) VALUES (?)`,
    [name]
  );
  return result.insertId;
}

export async function addTagToTask(task_id, tag_id) {
  await pool.execute(
    `INSERT IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)` ,
    [task_id, tag_id]
  );
}

export async function getTagsForTask(task_id) {
  const [rows] = await pool.execute(
    `SELECT t.* FROM tags t JOIN task_tags tt ON t.id = tt.tag_id WHERE tt.task_id = ?`,
    [task_id]
  );
  return rows;
}

export async function getAllTags() {
  const [rows] = await pool.execute(`SELECT * FROM tags`);
  return rows;
} 