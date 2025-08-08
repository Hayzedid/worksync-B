import express from 'express';
import { addComment, fetchComments } from '../controllers/commentController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// POST /api/:type/:id/comments (type = 'task' or 'note')
router.post('/:type/:id/comments', addComment);
// GET /api/:type/:id/comments
router.get('/:type/:id/comments', fetchComments);

export default router; 