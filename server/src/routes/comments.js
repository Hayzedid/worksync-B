// Phase 2 Enhanced Comments Routes
import express from 'express';
import {
  getItemComments,
  createComment,
  updateComment,
  deleteComment,
  toggleCommentReaction
} from '../controllers/commentsController.js';
import { 
  getAllComments 
} from '../controllers/commentsController.js';
import { addComment, fetchComments } from '../controllers/commentController.js';
import authenticateToken from '../middleware/auth.js';
import { validateComment } from '../utils/validator.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

router.use(authenticateToken);

// Phase 2 Enhanced Comments API
router.get('/', getAllComments); // GET /api/comments
router.get('/:itemType/:itemId', getItemComments); // GET /api/comments/:itemType/:itemId
router.post('/', createComment); // POST /api/comments
router.put('/:id', updateComment); // PUT /api/comments/:id
router.delete('/:id', deleteComment); // DELETE /api/comments/:id
router.post('/:id/reactions', toggleCommentReaction); // POST /api/comments/:id/reactions

// Legacy routes for backward compatibility  
router.post('/:type/:id/comments', validateComment, validateRequest, addComment);
router.get('/:type/:id/comments', fetchComments);

export default router; 