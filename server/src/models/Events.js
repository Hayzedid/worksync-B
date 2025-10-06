// models/eventModel.js
import { pool } from '../config/database.js'
import { sanitizeParams } from '../utils/sql.js';

// Create event with optional fields. Input is an object.
export const createEvent = async ({
  title,
  start_date,
  end_date,
  created_by,
  all_day = 0,
  location = null,
  description = null,
  workspace_id = null,
  project_id = null,
  category = null,
}) => {
  // Use owner_id for production compatibility (created_by for local)
  const userColumn = process.env.NODE_ENV === 'production' ? 'owner_id' : 'created_by';
  const sql = `
    INSERT INTO events (title, start_date, end_date, ${userColumn}, all_day, location, description, workspace_id, project_id, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    title,
    start_date,
    end_date,
    created_by,
    all_day,
    location,
    description,
    workspace_id,
    project_id,
    category,
  ];
  // Defensive: ensure required datetimes are present before attempting DB insert
  if (!start_date || !end_date) {
    throw new Error('Missing start_date or end_date for event creation');
  }

  try {
    const [result] = await pool.execute(sql, sanitizeParams(params));
    const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', sanitizeParams([result.insertId]));
    return rows[0];
  } catch (err) {
    // Re-throw a clearer error for higher layers to respond with 500
    err.message = `Events.createEvent failed: ${err.message}`;
    throw err;
  }
}

export const getAllEventsByUser = async (userId) => {
  // Use owner_id for production compatibility (created_by for local)
  const userColumn = process.env.NODE_ENV === 'production' ? 'owner_id' : 'created_by';
  const [rows] = await pool.execute(`SELECT * FROM events WHERE ${userColumn} = ?`, sanitizeParams([userId]))
  return rows
}

export const getEventById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', sanitizeParams([id]))
  return rows[0]
}

export const updateEvent = async (id, title, start_date, end_date, created_by) => {
  console.log("Running SQL update with:", { id, title, start_date, end_date, created_by });
  
  // Use owner_id for production compatibility (created_by for local)
  const userColumn = process.env.NODE_ENV === 'production' ? 'owner_id' : 'created_by';
  await pool.execute(
    `UPDATE events SET title = ?, start_date = ?, end_date = ?, start = ?, end = ? WHERE id = ? AND ${userColumn} = ?`,
    sanitizeParams([title, start_date, end_date, start_date, end_date, id, created_by])
  );

  return getEventById(id);
};

// Partial update builder for PATCH. Only updates provided fields.
export const updateEventPartial = async (id, created_by, patch = {}) => {
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
  // Use owner_id for production compatibility (created_by for local)
  const userColumn = process.env.NODE_ENV === 'production' ? 'owner_id' : 'created_by';
  const sql = `UPDATE events SET ${setClauses.join(', ')} WHERE id = ? AND ${userColumn} = ?`;
  params.push(id, created_by);
  await pool.execute(sql, sanitizeParams(params));
  return getEventById(id);
}

export const deleteEvent = async (id) => {
  await pool.execute('DELETE FROM events WHERE id = ?', sanitizeParams([id]))
}

export const getEventsByDateRange = async (start, end) => {
  const [rows] = await pool.execute(
    'SELECT * FROM events WHERE start_date >= ? AND end_date <= ?',
    sanitizeParams([start, end])
  )
  return rows
}

export async function getRecurringEvents() {
  // Note: recurrence column doesn't exist in current schema
  // Return empty array for now - could be implemented later if needed
  return [];
}

export async function createEventInstance(event) {
  // Example: create a new event based on the recurring event
  // Use owner_id for production compatibility (created_by for local)
  // Note: recurrence column doesn't exist in current schema
  const userColumn = process.env.NODE_ENV === 'production' ? 'owner_id' : 'created_by';
  await pool.execute(
    `INSERT INTO events (title, description, start_date, end_date, ${userColumn}) VALUES (?, ?, ?, ?, ?)`,
    sanitizeParams([event.title, event.description, event.start_date, event.end_date, event.created_by])
  );
}