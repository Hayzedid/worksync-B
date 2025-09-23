import { pool } from '../config/database.js';

export async function getCalendar(req, res, next) {
  try {
    const { start, end } = req.query;
    const userId = req.user.id;
    // Fetch tasks
    const [tasks] = await pool.execute(
      `SELECT * FROM tasks WHERE created_by = ? AND due_date BETWEEN ? AND ?`,
      [userId, start, end]
    );
    // Fetch events
    const [events] = await pool.execute(
      `SELECT * FROM events WHERE owner_id = ? AND start_date BETWEEN ? AND ?`,
      [userId, start, end]
    );
    res.json({ success: true, tasks, events });
  } catch (error) {
    next(error);
  }
} 