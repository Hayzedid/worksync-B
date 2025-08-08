import { pool } from '../config/database.js';

export async function createSubtask({ task_id, title }) {
  const [result] = await pool.execute(
    `INSERT INTO subtasks (task_id, title) VALUES (?, ?)` ,
    [task_id, title]
  );
  return result.insertId;
}

export async function updateSubtask({ id, completed }) {
  await pool.execute(
    `UPDATE subtasks SET completed = ? WHERE id = ?`,
    [completed, id]
  );
}

export async function getSubtasksForTask(task_id) {
  const [rows] = await pool.execute(
    `SELECT * FROM subtasks WHERE task_id = ?`,
    [task_id]
  );
  return rows;
} 