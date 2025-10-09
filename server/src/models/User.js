// models/userModel.js
import { pool } from '../config/database.js';
import { sanitizeParams } from '../utils/sql.js';

export async function getUserById(userId) {
  const [rows] = await pool.execute(
    'SELECT id, email, first_name, last_name, username, profile_picture, is_active, created_at, updated_at FROM users WHERE id = ?', 
    sanitizeParams([userId])
  );
  return rows[0];
}

export async function getUserByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, email, first_name, last_name, username, profile_picture, password_hash, is_active, created_at, updated_at FROM users WHERE email = ?', 
    sanitizeParams([email.toLowerCase()])
  );
  return rows[0] || null;
}

export async function updateUserPassword(userId, password_hash) {
  const [result] = await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', sanitizeParams([password_hash, userId]));
  return result.affectedRows > 0;
}

export const updateUser = async (id, username, profile_picture, email, first_name, last_name) => {
  let query = 'UPDATE users SET';
  let params = [];
  let fields = [];
  
  if (username) {
    fields.push(' username = ?');
    params.push(username);
  }
  if (first_name) {
    fields.push(' first_name = ?');
    params.push(first_name);
  }
  if (last_name) {
    fields.push(' last_name = ?');
    params.push(last_name);
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
    'SELECT id, username, email, first_name, last_name, profile_picture, is_active FROM users'
  );
  return rows;
};

export const getPublicUserById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT id, username, email, first_name, last_name, profile_picture FROM users WHERE id = ?',
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
