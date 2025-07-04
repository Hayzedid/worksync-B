import express from 'express';
import authenticateToken from '../middleware/auth.js';
import {
  createTask,
  getProjectTasks,
  updateTask,
  deleteTask
} from '../controllers/taskController.js';

const router = express.Router();

router.post('/projects/:projectId/tasks', authenticateToken, createTask);
router.get('/projects/:projectId/tasks', authenticateToken, getProjectTasks);
router.put('/tasks/:taskId', authenticateToken, updateTask);
router.delete('/tasks/:taskId', authenticateToken, deleteTask);

export default router;
