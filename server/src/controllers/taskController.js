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
    const workspaceIdRaw = req.query.workspace_id;
    
    const limit = Number.isFinite(parseInt(limitRaw, 10)) ? parseInt(limitRaw, 10) : 20;
    const offset = Number.isFinite(parseInt(offsetRaw, 10)) ? parseInt(offsetRaw, 10) : 0;
    const workspaceId = Number.isFinite(parseInt(workspaceIdRaw, 10)) ? parseInt(workspaceIdRaw, 10) : undefined;
    
    const userId = req.user.id;
    const { tasks, total } = await getTasksService(userId, limit, offset, workspaceId);
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
      workspace_id,
      email_reminders
    } = req.body;
    const created_by = req.user.id;
    let normalizedStatus = status ? String(status).toLowerCase().replace(/-/g, '_') : 'todo';
    
    // Validate status based on whether task belongs to a project
    const isProjectTask = Boolean(project_id);
    let allowedStatuses;
    
    if (isProjectTask) {
      // Project tasks: all statuses allowed
      allowedStatuses = new Set(['todo', 'in_progress', 'done', 'review', 'cancelled']);
    } else {
      // General tasks: only basic statuses
      allowedStatuses = new Set(['todo', 'in_progress', 'done']);
    }
    
    if (!allowedStatuses.has(normalizedStatus)) {
      const taskType = isProjectTask ? 'project task' : 'general task';
      const allowedStatusesList = Array.from(allowedStatuses).join(', ');
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status '${normalizedStatus}' for ${taskType}. Allowed statuses: ${allowedStatusesList}` 
      });
    }
    
    const taskData = {
      title,
      description: description ?? null,
      due_date: due_date ?? null,
      status: normalizedStatus,
      priority: priority ?? 'medium',
      assigned_to: assigned_to ?? null,
      created_by,
      project_id: project_id ?? null,
      start_date: start_date ?? null,
      completion_date: completion_date ?? null,
      estimated_hours: estimated_hours ?? null,
      actual_hours: actual_hours ?? null,
      position: position ?? 0,
      workspace_id: workspace_id ?? null,
      email_reminders: email_reminders ?? false,
    };
    
    const taskId = await createTaskService(taskData);
    return res.status(201).json({ success: true, message: 'Task created', taskId });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

export async function updateTaskById(req, res, next) {
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
      position
    } = req.body;
    
    const incomingStatus = req.body.status;
    let normalizedStatus = incomingStatus === undefined ? undefined : String(incomingStatus).toLowerCase().replace(/-/g, '_');
    
    // Get current task to check if it belongs to a project
    const taskId = req.params.id;
    let currentTask = null;
    if (normalizedStatus !== undefined) {
      try {
        // Import the task service to get current task info
        const { getSingleTaskService } = await import('../services/taskService.js');
        currentTask = await getSingleTaskService(taskId);
        
        if (currentTask) {
          // Determine allowed statuses based on project association
          const isProjectTask = currentTask.project_id || project_id;
          let allowedStatuses;
          
          if (isProjectTask) {
            // Project tasks: all statuses allowed
            allowedStatuses = new Set(['todo', 'in_progress', 'done', 'review', 'cancelled']);
          } else {
            // General tasks: only basic statuses
            allowedStatuses = new Set(['todo', 'in_progress', 'done']);
          }
          
          if (!allowedStatuses.has(normalizedStatus)) {
            const taskType = isProjectTask ? 'project task' : 'general task';
            const allowedStatusesList = Array.from(allowedStatuses).join(', ');
            return res.status(400).json({ 
              success: false, 
              message: `Invalid status '${normalizedStatus}' for ${taskType}. Allowed statuses: ${allowedStatusesList}` 
            });
          }
        }
      } catch (error) {
        console.error('Error validating task status:', error);
        return res.status(500).json({ success: false, message: 'Error validating task status' });
      }
    }
    
    // Build update data object with only the fields that were sent
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (normalizedStatus !== undefined) updateData.status = normalizedStatus;
    if (priority !== undefined) updateData.priority = priority;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
    if (project_id !== undefined) updateData.project_id = project_id;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (completion_date !== undefined) updateData.completion_date = completion_date;
    if (estimated_hours !== undefined) updateData.estimated_hours = estimated_hours;
    if (actual_hours !== undefined) updateData.actual_hours = actual_hours;
    if (position !== undefined) updateData.position = position;
    
    const affectedRows = await updateTaskService(taskId, updateData);
    
    if (!affectedRows) return res.status(404).json({ success: false, message: 'Task not found' });
    return res.json({ success: true, message: 'Task updated' });
  } catch (error) {
    console.error('❌ Task update error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

export async function getTaskStatusOptions(req, res, next) {
  try {
    const { project_id, task_id } = req.query;
    
    let isProjectTask = false;
    
    if (task_id) {
      // Get existing task to check if it belongs to a project
      const { getSingleTaskService } = await import('../services/taskService.js');
      const task = await getSingleTaskService(task_id);
      if (task) {
        isProjectTask = Boolean(task.project_id);
      }
    } else if (project_id) {
      // New task with project association
      isProjectTask = Boolean(project_id);
    }
    
    let statusOptions;
    
    if (isProjectTask) {
      // Project tasks: all statuses available
      statusOptions = [
        { value: 'todo', label: 'To Do', description: 'Task is ready to be started' },
        { value: 'in_progress', label: 'In Progress', description: 'Task is currently being worked on' },
        { value: 'done', label: 'Done', description: 'Task is completed' },
        { value: 'review', label: 'Review', description: 'Task needs to be reviewed' },
        { value: 'cancelled', label: 'Cancelled', description: 'Task has been cancelled' }
      ];
    } else {
      // General tasks: only basic statuses
      statusOptions = [
        { value: 'todo', label: 'To Do', description: 'Task is ready to be started' },
        { value: 'in_progress', label: 'In Progress', description: 'Task is currently being worked on' },
        { value: 'done', label: 'Done', description: 'Task is completed' }
      ];
    }
    
    res.json({ 
      success: true, 
      taskType: isProjectTask ? 'project' : 'general',
      statusOptions 
    });
  } catch (error) {
    next(error);
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
