// models/eventModel.js
import { pool } from '../config/database.js'

export const createEvent = async (title, start, end, ownerId) => {
  const [result] = await pool.execute(
    'INSERT INTO events (title, start, end, owner_id) VALUES (?, ?, ?, ?)',
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

export const updateEvent = async (id, title, start, end) => {
  await pool.execute(
    'UPDATE events SET title = ?, start = ?, end = ? WHERE id = ?',
    [title, start, end, id]
  )
  return getEventById(id)
}

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