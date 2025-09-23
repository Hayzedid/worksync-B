import express from 'express';
import {
  addSubtask,
  updateSubtaskHandler,
  getSubtasksForTaskHandler
} from '../controllers/subtaskController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Align with tests
router.post('/subtasks/:id', addSubtask); // POST /api/subtasks/:taskId
router.put('/subtasks/:id', updateSubtaskHandler); // PUT /api/subtasks/:id
router.get('/subtasks/:id', getSubtasksForTaskHandler); // GET /api/subtasks/:taskId

// Backward-compatible routes
router.post('/tasks/:id/subtasks', addSubtask);
router.patch('/subtasks/:id', updateSubtaskHandler);
router.get('/tasks/:id/subtasks', getSubtasksForTaskHandler);

export default router; 