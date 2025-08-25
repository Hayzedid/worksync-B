export async function updateTaskService(taskId, updateData) {
  // updateData: { title, description, due_date, status }
  // Only pass defined fields
  return (await import('../models/Task.js')).updateTask(taskId, updateData);
}
// services/taskService.js
import {
  getAllTasksByUser,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  // ...other model functions
} from '../models/Task.js';

export async function getTasksService(userId, limit, offset) {
  return getAllTasksByUser(userId, limit, offset);
}

export async function getSingleTaskService(taskId) {
  return getTaskById(taskId);
}

export async function createTaskService(taskData) {
  return createTask(taskData);
}


export async function deleteTaskService(taskId) {
  return deleteTask(taskId);
}
// Add more as needed
