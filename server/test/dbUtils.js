// dbUtils.js - Utility for cleaning up test database
import { pool } from '../src/config/database.js';

export async function clearTestUsers() {
  // Remove child records first to avoid FK constraint errors
  await pool.query(`DELETE FROM attachments WHERE uploaded_by IN (SELECT id FROM users WHERE email LIKE 'testuser%@example%' OR username LIKE 'testuser%')`);
  await pool.query(`DELETE FROM comments WHERE created_by IN (SELECT id FROM users WHERE email LIKE 'testuser%@example%' OR username LIKE 'testuser%')`);
  await pool.query(`DELETE FROM subtasks WHERE task_id IN (SELECT id FROM tasks WHERE created_by IN (SELECT id FROM users WHERE email LIKE 'testuser%@example%' OR username LIKE 'testuser%'))`);
  await pool.query(`DELETE FROM tasks WHERE created_by IN (SELECT id FROM users WHERE email LIKE 'testuser%@example%' OR username LIKE 'testuser%') OR assigned_to IN (SELECT id FROM users WHERE email LIKE 'testuser%@example%' OR username LIKE 'testuser%')`);
  await pool.query(`DELETE FROM notes WHERE created_by IN (SELECT id FROM users WHERE email LIKE 'testuser%@example%' OR username LIKE 'testuser%')`);
  await pool.query(`DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'testuser%@example%' OR username LIKE 'testuser%')`);
  await pool.query(`DELETE FROM users WHERE email LIKE 'testuser%@example%' OR username LIKE 'testuser%'`);
}

export async function clearTestTasks() {
  // First clear task_tags referencing tasks
  await pool.query(`DELETE FROM task_tags WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'Test Task%')`);
  // Then clear subtasks referencing tasks
  await pool.query(`DELETE FROM subtasks WHERE task_id IN (SELECT id FROM tasks WHERE title LIKE 'Test Task%')`);
  // Finally clear the tasks
  await pool.query(`DELETE FROM tasks WHERE title LIKE 'Test Task%'`);
}

export async function clearTestNotes() {
  await pool.query(`DELETE FROM notes WHERE title LIKE 'Test Note%'`);
}

export async function clearAllTestData() {
  await clearTestNotes();
  await clearTestTasks();
  await clearTestUsers();
}
