// models/taskModel.js
import { pool } from '../config/database.js';

// Get all tasks for a user
export async function getAllTasksByUser(userId) {
    const [rows] = await pool.execute(
        'SELECT * FROM tasks WHERE created_by = ?',
        [userId]
    );
    return rows;
}

// Get a single task by ID
export async function getTaskById(taskId) {
    const [rows] = await pool.execute(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
    );
    return rows[0];
}

// Create a new task
export async function createTask({
  title,
  description,
  due_date,
  status,
  created_by,
  project_id,
  assigned_to,
  priority,
  start_date,
  completion_date,
  estimated_hours,
  actual_hours,
  position,
}) {
  const [result] = await pool.execute(
    `INSERT INTO tasks (
      title,
      description,
      due_date,
      status,
      created_by,
      project_id,
      assigned_to,
      priority,
      start_date,
      completion_date,
      estimated_hours,
      actual_hours,
      position
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      description,
      due_date,
      status,
      created_by,
      project_id,
      assigned_to,
      priority,
      start_date,
      completion_date,
      estimated_hours,
      actual_hours,
      position,
    ]
  );

  return result.insertId;
}


// export async function createTask({ title, description, due_date, status, created_by }) {
//     const [result] = await pool.execute(
//         'INSERT INTO tasks (title, description, due_date, status, created_by, project_id) VALUES (?, ?, ?, ?, ?, ?)',
//         [title, description, due_date, status, created_by, project_id]
//     );
//     return result.insertId;
// }

// Update a task
export async function updateTask(taskId, { title, description, due_date, status }) {
    const [result] = await pool.execute(
        'UPDATE tasks SET title = ?, description = ?, due_date = ?, status = ? WHERE id = ?',
        [title, description, due_date, status, taskId]
    );
    return result.affectedRows;
}

// Delete a task
export async function deleteTask(taskId) {
    const [result] = await pool.execute(
        'DELETE FROM tasks WHERE id = ?',
        [taskId]
    );
    return result.affectedRows;
}
