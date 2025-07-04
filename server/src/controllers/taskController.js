import { pool } from '../config/database.js';

// Create a task
export const createTask = async (req, res) => {
  const { projectId } = req.params;
  const { title, description, due_date } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  try {
    const [result] = await pool.execute(
      `INSERT INTO tasks (project_id, title, description, due_date) VALUES (?, ?, ?, ?)`,
      [projectId, title, description || null, due_date || null]
    );

    res.status(201).json({ success: true, message: 'Task created successfully', taskId: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get all tasks for a project
export const getProjectTasks = async (req, res) => {
  const { projectId } = req.params;

  try {
    const [tasks] = await pool.execute(
      `SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC`,
      [projectId]
    );

    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Update a task
export const updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description, due_date, status } = req.body;

  try {
    await pool.execute(
      `UPDATE tasks SET title = ?, description = ?, due_date = ?, status = ? WHERE id = ?`,
      [title, description, due_date, status, taskId]
    );

    res.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Delete a task
export const deleteTask = async (req, res) => {
  const { taskId } = req.params;

  try {
    await pool.execute(`DELETE FROM tasks WHERE id = ?`, [taskId]);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
