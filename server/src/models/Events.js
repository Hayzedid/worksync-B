// models/eventModel.js
import { pool } from '../config/database.js'
import { sanitizeParams } from '../utils/sql.js';

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
  const [rows] = await pool.execute('SELECT * FROM events WHERE owner_id = ?', sanitizeParams([userId]))
  return rows
}

export const getEventById = async (id) => {
  const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', sanitizeParams([id]))
  return rows[0]
}

export const updateEvent = async (id, title, start_date, end_date, owner_id) => {
  console.log("Running SQL update with:", { id, title, start_date, end_date, owner_id });

  await pool.execute(
    'UPDATE events SET title = ?, start_date = ?, end_date = ?, start = ?, end = ? WHERE id = ? AND owner_id = ?',
    sanitizeParams([title, start_date, end_date, start_date, end_date, id, owner_id])
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
  const [rows] = await pool.execute('SELECT * FROM events WHERE recurrence_pattern != "none" AND is_recurring_template = TRUE');
  return rows;
}

export async function createEventInstance(event) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Calculate new start and end dates based on recurrence pattern
  let newStartDate = new Date(event.start_date);
  let newEndDate = new Date(event.end_date);
  
  switch (event.recurrence_pattern) {
    case 'daily':
      newStartDate.setDate(newStartDate.getDate() + (event.recurrence_interval || 1));
      newEndDate.setDate(newEndDate.getDate() + (event.recurrence_interval || 1));
      break;
    case 'weekly':
      newStartDate.setDate(newStartDate.getDate() + (7 * (event.recurrence_interval || 1)));
      newEndDate.setDate(newEndDate.getDate() + (7 * (event.recurrence_interval || 1)));
      break;
    case 'monthly':
      newStartDate.setMonth(newStartDate.getMonth() + (event.recurrence_interval || 1));
      newEndDate.setMonth(newEndDate.getMonth() + (event.recurrence_interval || 1));
      break;
    case 'yearly':
      newStartDate.setFullYear(newStartDate.getFullYear() + (event.recurrence_interval || 1));
      newEndDate.setFullYear(newEndDate.getFullYear() + (event.recurrence_interval || 1));
      break;
  }

  // Create new event instance
  const [result] = await pool.execute(
    `INSERT INTO events (title, description, start_date, end_date, owner_id, 
                        workspace_id, project_id, category, location, all_day,
                        parent_recurring_event_id, is_recurring_template) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    sanitizeParams([
      event.title, 
      event.description, 
      newStartDate, 
      newEndDate, 
      event.owner_id,
      event.workspace_id,
      event.project_id,
      event.category,
      event.location,
      event.all_day,
      event.id, // Reference to parent recurring event
      false // This is an instance, not a template
    ])
  );

  // Update the parent event's last_recurrence_date
  await pool.execute(
    'UPDATE events SET last_recurrence_date = ? WHERE id = ?',
    sanitizeParams([today, event.id])
  );

  return result.insertId;
}