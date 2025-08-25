// models/taskModel.js
import { pool } from '../config/database.js';

// Get all tasks for a user
export async function getAllTasksByUser(userId, limit = 20, offset = 0) {
  const l = Math.max(0, parseInt(limit, 10) || 20);
  const o = Math.max(0, parseInt(offset, 10) || 0);
  const [rows] = await pool.execute(
    `SELECT SQL_CALC_FOUND_ROWS * FROM tasks WHERE created_by = ? ORDER BY created_at DESC LIMIT ${l} OFFSET ${o}`,
    [userId]
  );
  const [[{ 'FOUND_ROWS()': total }]] = await pool.query('SELECT FOUND_ROWS()');
  return { tasks: rows, total };
}

// Get a single task by ID
export async function getTaskById(taskId) {
    const [rows] = await pool.execute(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId]
    );
    return rows[0];
}

// Create a new task
export async function createTask({
  title,
  description,
  due_date,
  status,
  created_by,
  project_id,
  assigned_to,
  priority,
  start_date,
  completion_date,
  estimated_hours,
  actual_hours,
  position,
  workspace_id, // NEW
}) {
  const [result] = await pool.execute(
    `INSERT INTO tasks (
      title,
      description,
      due_date,
      status,
      created_by,
      project_id,
      assigned_to,
      priority,
      start_date,
      completion_date,
      estimated_hours,
      actual_hours,
      position,
      workspace_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      description,
      due_date,
      status,
      created_by,
      project_id,
      assigned_to,
      priority,
      start_date,
      completion_date,
      estimated_hours,
      actual_hours,
      position,
      workspace_id,
    ]
  );

  return result.insertId;
}


// Update a task
export async function updateTask(taskId, { title, description, due_date, status }) {
    const [result] = await pool.execute(
        'UPDATE tasks SET title = ?, description = ?, due_date = ?, status = ? WHERE id = ?',
        [title, description, due_date, status, taskId]
    );
    return result.affectedRows;
}

// Delete a task
export async function deleteTask(taskId) {
    const [result] = await pool.execute(
        'DELETE FROM tasks WHERE id = ?',
        [taskId]
    );
    return result.affectedRows;
}




// Get all tasks assigned to a user, across all workspaces
export async function getAllAssignedTasks(userId, limit = 20, offset = 0) {
  const l = Math.max(0, parseInt(limit, 10) || 20);
  const o = Math.max(0, parseInt(offset, 10) || 0);
  const [rows] = await pool.execute(
    `SELECT SQL_CALC_FOUND_ROWS tasks.*, workspaces.name AS workspace_name, projects.name AS project_name
     FROM tasks
     LEFT JOIN workspaces ON tasks.workspace_id = workspaces.id
     LEFT JOIN projects ON tasks.project_id = projects.id
     WHERE tasks.assigned_to = ?
     ORDER BY tasks.created_at DESC
     LIMIT ${l} OFFSET ${o}`,
    [userId]
  );
  const [[{ 'FOUND_ROWS()': total }]] = await pool.query('SELECT FOUND_ROWS()');
  return { tasks: rows, total };
}

export async function assignTaskToUser(taskId, userId) {
  await pool.execute('UPDATE tasks SET assigned_to = ? WHERE id = ?', [userId, taskId]);
  const [rows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [taskId]);
  return rows[0];
}

export async function getRecurringTasks() {
  const [rows] = await pool.execute('SELECT * FROM tasks WHERE recurrence IS NOT NULL');
  return rows;
}

export async function createTaskInstance(task) {
  // Example: create a new task based on the recurring task
  await pool.execute(
    'INSERT INTO tasks (title, description, assigned_to, created_by, recurrence, due_date, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [task.title, task.description, task.assigned_to, task.created_by, task.recurrence, task.due_date, task.priority, 'pending']
  );
}

export async function searchTasks({ userId, q, status, priority, assigned_to }) {
  let sql = `SELECT * FROM tasks WHERE created_by = ?`;
  const params = [userId];
  if (q) {
    sql += ' AND MATCH(title, description) AGAINST (? IN NATURAL LANGUAGE MODE)';
    params.push(q);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (priority) {
    sql += ' AND priority = ?';
    params.push(priority);
  }
  if (assigned_to) {
    sql += ' AND assigned_to = ?';
    params.push(assigned_to);
  }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function addTaskDependency(task_id, blocked_by_task_id) {
  await pool.execute(
    'INSERT INTO task_dependencies (task_id, blocked_by_task_id) VALUES (?, ?)',
    [task_id, blocked_by_task_id]
  );
}

export async function removeTaskDependency(task_id, blocked_by_task_id) {
  await pool.execute(
    'DELETE FROM task_dependencies WHERE task_id = ? AND blocked_by_task_id = ?',
    [task_id, blocked_by_task_id]
  );
}

export async function getTaskDependencies(task_id) {
  const [rows] = await pool.execute(
    'SELECT blocked_by_task_id FROM task_dependencies WHERE task_id = ?',
    [task_id]
  );
  return rows.map(row => row.blocked_by_task_id);
}

export async function addReaction({ type, user_id, target_type, target_id }) {
  await pool.execute(
    'INSERT INTO reactions (type, user_id, target_type, target_id) VALUES (?, ?, ?, ?)',
    [type, user_id, target_type, target_id]
  );
}

export async function removeReaction(reaction_id, user_id) {
  await pool.execute(
    'DELETE FROM reactions WHERE id = ? AND user_id = ?',
    [reaction_id, user_id]
  );
}

export async function getReactions({ target_type, target_id }) {
  const [rows] = await pool.execute(
    'SELECT id, type, user_id, created_at FROM reactions WHERE target_type = ? AND target_id = ?',
    [target_type, target_id]
  );
  return rows;
}

export async function getTasksKanbanView(projectId, userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM tasks WHERE project_id = ? AND created_by = ?',
    [projectId, userId]
  );
  const kanban = { todo: [], in_progress: [], done: [] };
  rows.forEach(task => {
    if (kanban[task.status]) {
      kanban[task.status].push(task);
    } else {
      kanban[task.status] = [task];
    }
  });
  return kanban;
}

export async function getTasksByProjectForUser(projectId, userId) {
  const [rows] = await pool.execute(
    'SELECT * FROM tasks WHERE project_id = ? AND created_by = ? ORDER BY created_at DESC',
    [projectId, userId]
  );
  return rows;
}

export async function getTasksListView({ userId, projectId, status, startDate, endDate, limit = 20, offset = 0 }) {
  let sql = 'SELECT SQL_CALC_FOUND_ROWS * FROM tasks WHERE created_by = ?';
  const params = [userId];
  if (projectId) {
    sql += ' AND project_id = ?';
    params.push(projectId);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (startDate && endDate) {
    sql += ' AND due_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  const l = Math.max(0, parseInt(limit, 10) || 20);
  const o = Math.max(0, parseInt(offset, 10) || 0);
  sql += ` ORDER BY due_date ASC LIMIT ${l} OFFSET ${o}`;
  const [rows] = await pool.execute(sql, params);
  const [[{ 'FOUND_ROWS()': total }]] = await pool.query('SELECT FOUND_ROWS()');
  return { tasks: rows, total };
}

export async function getTasksCalendarView({ userId, startDate, endDate }) {
  let sql = 'SELECT * FROM tasks WHERE created_by = ?';
  const params = [userId];
  if (startDate && endDate) {
    sql += ' AND due_date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }
  sql += ' ORDER BY due_date ASC';
  const [rows] = await pool.execute(sql, params);
  // Format for calendar: [{ id, title, start: due_date, end: due_date, ... }]
  return rows.map(task => ({
    id: task.id,
    title: task.title,
    start: task.due_date,
    end: task.due_date,
    ...task
  }));
}

const taskSearchCache = new Map();

export function getCachedSearchTasks(cacheKey) {
  return taskSearchCache.get(cacheKey);
}

export function setCachedSearchTasks(cacheKey, tasks) {
  taskSearchCache.set(cacheKey, tasks);
}
