// models/userModel.js
import { pool } from '../config/database.js';

export async function getUserById(userId) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
  return rows[0];
}

export const updateUser = async (id, username, profile_picture) => {
  const [result] = await pool.execute(
    'UPDATE users SET username = ?, profile_picture = ? WHERE id = ?',
    [username, profile_picture, id]
  );
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
    [id]
  );
  return rows[0];
};

export const deleteUserById = async (id) => {
  const [result] = await pool.execute(
    'DELETE FROM users WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
};
