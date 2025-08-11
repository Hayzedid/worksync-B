import express from 'express';
import { addComment, fetchComments } from '../controllers/commentController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

// Align with tests expecting /api/comments with body
router.post('/comments', addComment);

// Original parameterized routes for direct access
router.post('/:type/:id/comments', addComment);
router.get('/:type/:id/comments', fetchComments);

export default router; 