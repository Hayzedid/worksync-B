// services/taskService.js
import {
  getAllTasksByUser,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  // ...other model functions
} from '../models/Task.js';

export async function getTasksService(userId, limit, offset, workspaceId) {
  const tasks = await getAllTasksByUser(userId, limit, offset, workspaceId);
  // Sort by position for drag-and-drop ordering
  return tasks.sort((a, b) => (a.position || 0) - (b.position || 0));
}

export async function getSingleTaskService(taskId) {
  return getTaskById(taskId);
}

export async function createTaskService(taskData) {
  return createTask(taskData);
}

export async function updateTaskService(taskId, updateData) {
  // updateData: { title, description, due_date, status }
  // Only pass defined fields
  const result = await updateTask(taskId, updateData);
  return result;
}

export async function deleteTaskService(taskId) {
  return deleteTask(taskId);
}
// Add more as needed
