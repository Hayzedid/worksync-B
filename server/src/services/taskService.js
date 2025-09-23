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
  return getAllTasksByUser(userId, limit, offset, workspaceId);
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
