import express from 'express';
import { addComment, fetchComments } from '../controllers/commentController.js';
import authenticateToken from '../middleware/auth.js';
import { validateComment } from '../utils/validator.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticateToken);

// Align with tests expecting /api/comments with body
 router.post('/comments', validateComment, validateRequest, addComment);

// Original parameterized routes for direct access
 router.post('/:type/:id/comments', validateComment, validateRequest, addComment);
router.get('/:type/:id/comments', fetchComments);

export default router; 