import express from 'express';
import {
  createTagHandler,
  addTagToTaskHandler,
  getTagsForTaskHandler,
  getAllTagsHandler
} from '../controllers/tagController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', createTagHandler); // POST /api/tags
router.get('/', getAllTagsHandler); // GET /api/tags
router.post('/tasks/:id', addTagToTaskHandler); // POST /api/tags/tasks/:id
router.get('/tasks/:id', getTagsForTaskHandler); // GET /api/tags/tasks/:id

export default router; 