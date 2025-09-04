// models/userModel.js
import { pool } from '../config/database.js';
import { sanitizeParams } from '../utils/sql.js';

export async function getUserById(userId) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', sanitizeParams([userId]));
  return rows[0];
}

export async function getUserByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', sanitizeParams([email.toLowerCase()]));
  return rows[0] || null;
}

export async function updateUserPassword(userId, password_hash) {
  const [result] = await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', sanitizeParams([password_hash, userId]));
  return result.affectedRows > 0;
}

export const updateUser = async (id, username, profile_picture, email) => {
  let query = 'UPDATE users SET';
  let params = [];
  let fields = [];
  
  if (username) {
    fields.push(' username = ?');
    params.push(username);
  }
  if (profile_picture) {
    fields.push(' profile_picture = ?');
    params.push(profile_picture);
  }
  if (email) {
    fields.push(' email = ?');
    params.push(email.toLowerCase());
  }
  
  if (fields.length === 0) {
    return false; // No fields to update
  }
  
  query += fields.join(',') + ' WHERE id = ?';
  params.push(id);
  
  const [result] = await pool.execute(query, sanitizeParams(params));
  return result.affectedRows > 0;
};

export const getAllUsers = async () => {
  const [rows] = await pool.execute(
    'SELECT id, username, email FROM users'
  );
  return rows;
};

export const getPublicUserById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT id, username, email FROM users WHERE id = ?',
    sanitizeParams([id])
  );
  return rows[0];
};

export const deleteUserById = async (id) => {
  const [result] = await pool.execute(
    'DELETE FROM users WHERE id = ?',
    sanitizeParams([id])
  );
  return result.affectedRows > 0;
};
