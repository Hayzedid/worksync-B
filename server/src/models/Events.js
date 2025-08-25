// models/eventModel.js
import { pool } from '../config/database.js'

// Create event with optional fields. Input is an object.
export const createEvent = async ({
  title,
  start_date,
  end_date,
  owner_id,
  all_day = 0,
  location = null,
  description = null,
  workspace_id = null,
  project_id = null,
  category = null,
}) => {
  const sql = `
    INSERT INTO events (title, start_date, end_date, owner_id, all_day, location, description, workspace_id, project_id, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    title,
    start_date,
    end_date,
    owner_id,
    all_day,
    location,
    description,
    workspace_id,
    project_id,
    category,
  ];
  const [result] = await pool.execute(sql, params);
  const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [result.insertId]);
  return rows[0];
}

export const getAllEventsByUser = async (userId) => {
  const [rows] = await pool.execute('SELECT * FROM events WHERE owner_id = ?', [userId])
  return rows
}

export const getEventById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [id])
  return rows[0]
}

export const updateEvent = async (id, title, start_date, end_date, owner_id) => {
  console.log("Running SQL update with:", { id, title, start_date, end_date, owner_id });

  await pool.execute(
    'UPDATE events SET title = ?, start_date = ?, end_date = ? WHERE id = ? AND owner_id = ?',
    [title, start_date, end_date, id, owner_id]
  );

  return getEventById(id);
};

// Partial update builder for PATCH. Only updates provided fields.
export const updateEventPartial = async (id, owner_id, patch = {}) => {
  const allowed = ['title', 'start_date', 'end_date', 'all_day', 'location', 'description', 'workspace_id', 'project_id'];
  const setClauses = [];
  const params = [];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      setClauses.push(`${key} = ?`);
      params.push(patch[key]);
    }
  }
  if (setClauses.length === 0) {
    return getEventById(id);
  }
  const sql = `UPDATE events SET ${setClauses.join(', ')} WHERE id = ? AND owner_id = ?`;
  params.push(id, owner_id);
  await pool.execute(sql, params);
  return getEventById(id);
}

export const deleteEvent = async (id) => {
  await pool.execute('DELETE FROM events WHERE id = ?', [id])
}

export const getEventsByDateRange = async (start, end) => {
  const [rows] = await pool.execute(
    'SELECT * FROM events WHERE start_date >= ? AND end_date <= ?',
    [start, end]
  )
  return rows
}

export async function getRecurringEvents() {
  const [rows] = await pool.execute('SELECT * FROM events WHERE recurrence IS NOT NULL');
  return rows;
}

export async function createEventInstance(event) {
  // Example: create a new event based on the recurring event
  await pool.execute(
    'INSERT INTO events (title, description, start_time, end_time, created_by, recurrence) VALUES (?, ?, ?, ?, ?, ?)',
    [event.title, event.description, event.start_time, event.end_time, event.created_by, event.recurrence]
  );
}