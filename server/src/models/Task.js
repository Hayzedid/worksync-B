// models/taskModel.js
import { pool } from '../config/database.js';

// Convert undefined -> null for SQL parameters to avoid mysql2 error
function sanitizeParam(v) {
  return v === undefined ? null : v;
}

function sanitizeParams(arr) {
  return arr.map(sanitizeParam);
}

// Get all tasks for a user
export async function getAllTasksByUser(userId, limit = 20, offset = 0, workspaceId) {
  const l = Math.max(0, parseInt(limit, 10) || 20);
  const o = Math.max(0, parseInt(offset, 10) || 0);
  
  let sql = `SELECT SQL_CALC_FOUND_ROWS t.*, p.name as project_name, w.name as workspace_name, 
             p.workspace_id as project_workspace_id
             FROM tasks t
             LEFT JOIN projects p ON t.project_id = p.id
             LEFT JOIN workspaces w ON t.workspace_id = w.id
             WHERE t.created_by = ?`;
  
  const params = [userId];
  
  if (workspaceId !== undefined) {
    // Filter by workspace_id - includes both direct workspace tasks and tasks from projects in workspace
    sql += ' AND (t.workspace_id = ? OR p.workspace_id = ?)';
    params.push(workspaceId, workspaceId);
  }
  
  sql += ` ORDER BY t.created_at DESC LIMIT ${l} OFFSET ${o}`;
  
  const [rows] = await pool.execute(sql, sanitizeParams(params));
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
    sanitizeParams([
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
    ])
  );

  return result.insertId;
}


// Update a task - only update fields that are provided
export async function updateTask(taskId, updateData) {
    console.log('🗄️ Task Model: updateTask called with:', { taskId, updateData });
    
    const { title, description, due_date, status, priority, assigned_to, project_id, start_date, completion_date, estimated_hours, actual_hours, position } = updateData;
    
    // Build dynamic query based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title);
    }
    if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
    }
    if (due_date !== undefined) {
        updateFields.push('due_date = ?');
        updateValues.push(due_date);
    }
    if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(status);
    }
    if (priority !== undefined) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
    }
    if (assigned_to !== undefined) {
        updateFields.push('assigned_to = ?');
        updateValues.push(assigned_to);
    }
    if (project_id !== undefined) {
        updateFields.push('project_id = ?');
        updateValues.push(project_id);
    }
    if (start_date !== undefined) {
        updateFields.push('start_date = ?');
        updateValues.push(start_date);
    }
    if (completion_date !== undefined) {
        updateFields.push('completion_date = ?');
        updateValues.push(completion_date);
    }
    if (estimated_hours !== undefined) {
        updateFields.push('estimated_hours = ?');
        updateValues.push(estimated_hours);
    }
    if (actual_hours !== undefined) {
        updateFields.push('actual_hours = ?');
        updateValues.push(actual_hours);
    }
    if (position !== undefined) {
        updateFields.push('position = ?');
        updateValues.push(position);
    }
    
    if (updateFields.length === 0) {
        console.log('❌ Task Model: No fields to update');
        throw new Error('No fields to update');
    }
    
    // Always update the updated_at timestamp
    updateFields.push('updated_at = NOW()');
    updateValues.push(taskId);
    
    const query = `UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?`;
    console.log('🗄️ Task Model: Executing query:', query);
    console.log('🗄️ Task Model: With values:', updateValues);
    
    const [result] = await pool.execute(query, updateValues);
    
    console.log('🗄️ Task Model: Query result:', result);
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
  const [rows] = await pool.execute('SELECT * FROM tasks WHERE recurrence_pattern != "none" AND is_recurring_template = TRUE');
  return rows;
}

export async function createTaskInstance(task) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Calculate new due date based on recurrence pattern
  let newDueDate = task.due_date ? new Date(task.due_date) : null;
  
  if (newDueDate) {
    switch (task.recurrence_pattern) {
      case 'daily':
        newDueDate.setDate(newDueDate.getDate() + (task.recurrence_interval || 1));
        break;
      case 'weekly':
        newDueDate.setDate(newDueDate.getDate() + (7 * (task.recurrence_interval || 1)));
        break;
      case 'monthly':
        newDueDate.setMonth(newDueDate.getMonth() + (task.recurrence_interval || 1));
        break;
      case 'yearly':
        newDueDate.setFullYear(newDueDate.getFullYear() + (task.recurrence_interval || 1));
        break;
    }
  }

  // Create new task instance
  const [result] = await pool.execute(
    `INSERT INTO tasks (title, description, assigned_to, created_by, due_date, priority, status, 
                       project_id, workspace_id, start_date, estimated_hours, actual_hours, position,
                       parent_recurring_task_id, is_recurring_template) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    sanitizeParams([
      task.title, 
      task.description, 
      task.assigned_to, 
      task.created_by, 
      newDueDate, 
      task.priority, 
      'todo', // New instances start as todo
      task.project_id,
      task.workspace_id,
      task.start_date,
      task.estimated_hours,
      0, // Reset actual hours for new instance
      task.position,
      task.id, // Reference to parent recurring task
      false // This is an instance, not a template
    ])
  );

  // Update the parent task's last_recurrence_date
  await pool.execute(
    'UPDATE tasks SET last_recurrence_date = ? WHERE id = ?',
    sanitizeParams([today, task.id])
  );

  return result.insertId;
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
  // Normalize basic fields to avoid DB errors: enforce allowed target types and shorten values
  const allowedTargets = new Set(['task', 'comment', 'note']);
  let ttRaw = typeof target_type === 'string' ? target_type.trim().toLowerCase() : String(target_type).toLowerCase();
  const tt = allowedTargets.has(ttRaw) ? ttRaw : 'task';
  const tid = target_id == null ? null : parseInt(target_id, 10);
  const uid = user_id == null ? null : parseInt(user_id, 10);
  const tp = typeof type === 'string' ? type.trim().slice(0, 50) : String(type).slice(0, 50);

  await pool.execute(
    'INSERT INTO reactions (type, user_id, target_type, target_id) VALUES (?, ?, ?, ?)',
    sanitizeParams([tp, uid, tt, tid])
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
    sanitizeParams([target_type, target_id])
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
