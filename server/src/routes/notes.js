// src/routes/notes.js
import express from 'express';
import authenticateToken from '../middleware/auth.js';
import { create_Note, get_Notes, update_Note, delete_Note } from '../controllers/noteController.js';

const router = express.Router();

router.post('/', authenticateToken, create_Note);
router.get('/', authenticateToken, get_Notes);
router.put('/:id', authenticateToken, update_Note);
router.delete('/:id', authenticateToken, delete_Note);

export default router;
