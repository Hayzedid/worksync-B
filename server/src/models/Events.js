// models/eventModel.js
import { pool } from '../config/database.js'

export const createEvent = async (title, start, end, ownerId) => {
  const [result] = await pool.execute(
    'INSERT INTO events (title, start_date, end_date, owner_id) VALUES (?, ?, ?, ?)',
    [title, start, end, ownerId]
  )
  const [rows] = await pool.execute('SELECT * FROM events WHERE id = ?', [result.insertId])
  return rows[0]
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



// export const updateEvent = async (id, title, start_date, end_date, owner_id) => {
//   console.log('updateEvent params:', { title, start_date, end_date, owner_id, id });
//   console.log({ title, start_date, end_date, id, owner_id });


//   await pool.execute(
//     'UPDATE events SET title = ?, start_date = ?, end_date = ? WHERE id = ?, owner_id = ?',
//     [title, start_date, end_date, id, owner_id]
//   )
//   return getEventById(id)
// }

export const deleteEvent = async (id) => {
  await pool.execute('DELETE FROM events WHERE id = ?', [id])
}
export const getEventsByDateRange = async (start, end) => {
  const [rows] = await pool.execute(
    'SELECT * FROM events WHERE start >= ? AND end <= ?',
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