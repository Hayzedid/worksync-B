// src/utils/helpers.js
import { genSalt, hash, compare } from 'bcrypt';
import { pool } from '../config/database.js';


const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  try {
    const salt = await genSalt(SALT_ROUNDS);
    return await hash(password, salt);
  } catch {
    throw new Error('Error hashing password');
  }
}

export async function verifyPassword(password, hashedPassword) {
  try {
    return await compare(password, hashedPassword);
  } catch {
    throw new Error('Error verifying password');
  }
}

export async function getOwnerByCommentable(type, id) {
  let query = '';
  if (type === 'task') {
    query = 'SELECT users.id as userId, users.email FROM users JOIN tasks ON users.id = tasks.created_by WHERE tasks.id = ?';
  } else if (type === 'note') {
    query = 'SELECT users.id as userId, users.email FROM users JOIN notes ON users.id = notes.created_by WHERE notes.id = ?';
  } else if (type === 'project') {
    query = 'SELECT users.id as userId, users.email FROM users JOIN projects ON users.id = projects.created_by WHERE projects.id = ?';
  } else {
    throw new Error('Unknown commentable type');
  }
  const [rows] = await pool.execute(query, [id]);
  return rows[0];
}

