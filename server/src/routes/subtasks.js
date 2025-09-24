import express from 'express';
import {
  addSubtask,
  updateSubtaskHandler,
  getSubtasksForTaskHandler
} from '../controllers/subtaskController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Main subtask routes (mounted at /api/subtasks)
router.post('/:taskId', addSubtask); // POST /api/subtasks/:taskId
router.put('/:id', updateSubtaskHandler); // PUT /api/subtasks/:id
router.get('/:taskId', getSubtasksForTaskHandler); // GET /api/subtasks/:taskId

// Backward-compatible routes
router.post('/tasks/:id/subtasks', addSubtask);
router.patch('/:id', updateSubtaskHandler);
router.get('/tasks/:id/subtasks', getSubtasksForTaskHandler);

export default router; 