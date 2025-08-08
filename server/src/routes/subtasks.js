import express from 'express';
import {
  addSubtask,
  updateSubtaskHandler,
  getSubtasksForTaskHandler
} from '../controllers/subtaskController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/tasks/:id/subtasks', addSubtask); // POST /api/tasks/:id/subtasks
router.patch('/subtasks/:id', updateSubtaskHandler); // PATCH /api/subtasks/:id
router.get('/tasks/:id/subtasks', getSubtasksForTaskHandler); // GET /api/tasks/:id/subtasks

export default router; 