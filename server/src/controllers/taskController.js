// Delete a task by ID
export async function deleteTaskById(req, res, next) {
  try {
    const { id } = req.params;
    const affectedRows = await deleteTaskService(id);
    if (!affectedRows) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    return res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}
// Controller to get tasks by project for a user (for nested project routes)
import { getTasksByProjectForUser } from '../models/Task.js';

export async function getTasksByProject(req, res, next) {
  try {
    const projectId = req.params.projectId;
    const userId = req.user.id;
    const tasks = await getTasksByProjectForUser(projectId, userId);
    res.json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
}
// controllers/taskController.js
import {
    getTasksService,
    getSingleTaskService,
    createTaskService,
    updateTaskService,
    deleteTaskService
} from '../services/taskService.js';
import {
    getAllAssignedTasks,
    assignTaskToUser,
    searchTasks,
    addTaskDependency,
    removeTaskDependency,
    getTaskDependencies,
    addReaction,
    removeReaction,
    getReactions,
    getTasksKanbanView,
    getTasksListView,
    getTasksCalendarView,
    getCachedSearchTasks,
    setCachedSearchTasks
} from '../models/Task.js';
import { getUserById } from '../models/User.js';
import { io } from '../server.js';
import { sendEmail } from '../services/emailServices.js';

export async function getTasks(req, res, next) {
  try {
    const limitRaw = req.query.limit;
    const offsetRaw = req.query.offset;
    const limit = Number.isFinite(parseInt(limitRaw, 10)) ? parseInt(limitRaw, 10) : 20;
    const offset = Number.isFinite(parseInt(offsetRaw, 10)) ? parseInt(offsetRaw, 10) : 0;
    const userId = req.user.id;
    const { tasks, total } = await getTasksService(userId, limit, offset);
    res.json({ success: true, tasks, total });
  } catch (error) {
    next(error);
  }
}

export async function getSingleTask(req, res, next) {
  try {
    const task = await getSingleTaskService(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
}

export async function createNewTask(req, res, next) {
  try {
    const {
      title,
      description,
      due_date,
      status,
      priority,
      assigned_to,
      project_id,
      start_date,
      completion_date,
      estimated_hours,
      actual_hours,
      position,
      workspace_id
    } = req.body;
    const created_by = req.user.id;
    let normalizedStatus = status ? String(status).toLowerCase().replace(/-/g, '_') : 'todo';
    if (!['todo', 'in_progress', 'done'].includes(normalizedStatus)) {
      normalizedStatus = 'todo';
    }
    const taskId = await createTaskService({
      title,
      description: description ?? null,
      due_date: due_date ?? null,
      status: normalizedStatus,
      priority: priority ?? 'medium',
      assigned_to: assigned_to ?? null,
      created_by,
      project_id,
      start_date: start_date ?? null,
      completion_date: completion_date ?? null,
      estimated_hours: estimated_hours ?? null,
      actual_hours: actual_hours ?? null,
      position: position ?? 0,
      workspace_id: workspace_id ?? null,
    });
    return res.status(201).json({ success: true, message: 'Task created', taskId });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

export async function updateTaskById(req, res, next) {
  try {
    const { title, description, due_date, status } = req.body;
    const incomingStatus = req.body.status;
    const allowedStatuses = new Set(['todo', 'in_progress', 'done']);
    let normalizedStatus = incomingStatus === undefined ? undefined : String(incomingStatus).toLowerCase().replace(/-/g, '_');
    if (normalizedStatus !== undefined && !allowedStatuses.has(normalizedStatus)) {
      normalizedStatus = 'todo';
    }
    const taskId = req.params.id;
    const affectedRows = await updateTaskService(taskId, { title, description, due_date, status: normalizedStatus });
    if (!affectedRows) return res.status(404).json({ success: false, message: 'Task not found' });
    return res.json({ success: true, message: 'Task updated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

// Fetch all tasks assigned to the logged-in user (auto-sync)
export async function fetchAssignedTasks(req, res) {
  try {
    const userId = req.user.id;
    const limitRaw = req.query.limit;
    const offsetRaw = req.query.offset;
    const limit = Number.isFinite(parseInt(limitRaw, 10)) ? parseInt(limitRaw, 10) : 20;
    const offset = Number.isFinite(parseInt(offsetRaw, 10)) ? parseInt(offsetRaw, 10) : 0;
    const { tasks, total } = await getAllAssignedTasks(userId, limit, offset);
    res.status(200).json({ success: true, tasks, total });
  } catch (error) {
    console.error('Error fetching assigned tasks:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

export async function assignTask(req, res, next) {
  try {
    const { taskId, userId } = req.body;
    // Assign the task in the database (implement this logic as needed)
    const task = await assignTaskToUser(taskId, userId); // implement assignTaskToUser in Task model
    // Fetch the assigned user's email (implement as needed)
    const assignedUser = await getUserById(userId); // implement getUserById in User model
    // Emit real-time event
    io.to(userId.toString()).emit('notification', { type: 'taskAssigned', task });
    // Send email notification
    await sendEmail(assignedUser.email, 'You have been assigned a new task', `Task: ${task.title}`);
    res.status(200).json({ message: 'Task assigned and user notified', task });
  } catch (error) {
    next(error);
  }
}

export async function searchTasksController(req, res, next) {
  try {
    const { q, status, priority, assigned_to } = req.query;
    const userId = req.user.id;
    const cacheKey = `${userId}:${q || ''}:${status || ''}:${priority || ''}:${assigned_to || ''}`;
    const cached = getCachedSearchTasks(cacheKey);
    if (cached) {
      return res.json({ success: true, tasks: cached, cached: true });
    }
    const tasks = await searchTasks({ userId, q, status, priority, assigned_to });
    setCachedSearchTasks(cacheKey, tasks);
    res.json({ success: true, tasks, cached: false });
  } catch (error) {
    next(error);
  }
}

export async function addTaskDependencyController(req, res, next) {
  try {
    const { id } = req.params;
    const { blocked_by_task_id } = req.body;
    await addTaskDependency(id, blocked_by_task_id);
    res.status(201).json({ success: true, message: 'Dependency added' });
  } catch (error) {
    next(error);
  }
}

export async function removeTaskDependencyController(req, res, next) {
  try {
    const { id, blockedById } = req.params;
    await removeTaskDependency(id, blockedById);
    res.json({ success: true, message: 'Dependency removed' });
  } catch (error) {
    next(error);
  }
}

export async function getTaskDependenciesController(req, res, next) {
  try {
    const { id } = req.params;
    const dependencies = await getTaskDependencies(id);
    res.json({ success: true, dependencies });
  } catch (error) {
    next(error);
  }
}

export async function addReactionController(req, res, next) {
  try {
    const { type, target_type, target_id } = req.body;
    const user_id = req.user.id;
    await addReaction({ type, user_id, target_type, target_id });
    res.status(201).json({ success: true, message: 'Reaction added' });
  } catch (error) {
    next(error);
  }
}

export async function removeReactionController(req, res, next) {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    await removeReaction(id, user_id);
    res.json({ success: true, message: 'Reaction removed' });
  } catch (error) {
    next(error);
  }
}

export async function getReactionsController(req, res, next) {
  try {
    const { target_type, target_id } = req.query;
    const reactions = await getReactions({ target_type, target_id });
    res.json({ success: true, reactions });
  } catch (error) {
    next(error);
  }
}

export async function kanbanViewController(req, res, next) {
  try {
    const projectId = req.query.projectId || req.params.projectId;
    const userId = req.user.id;
    const kanban = await getTasksKanbanView(projectId, userId);
    res.json({ success: true, kanban });
  } catch (error) {
    next(error);
  }
}

export async function listViewController(req, res, next) {
  try {
    const userId = req.user.id;
    const { projectId, status, startDate, endDate, limit = 20, offset = 0 } = req.query;
    const { tasks, total } = await getTasksListView({ userId, projectId, status, startDate, endDate, limit, offset });
    res.json({ success: true, tasks, total });
  } catch (error) {
    next(error);
  }
}

export async function calendarViewController(req, res, next) {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    const events = await getTasksCalendarView({ userId, startDate, endDate });
    res.json({ success: true, events });
  } catch (error) {
    next(error);
  }
}
