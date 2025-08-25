// src/routes/notes.js
import express from 'express';
import authenticateToken from '../middleware/auth.js';
import { create_Note, get_Notes, update_Note, delete_Note, fetchAssignedNotes, searchNotesController, get_NoteById } from '../controllers/noteController.js';
import { validateNote } from '../utils/validator.js';
import { validateRequest } from '../middleware/validation.js';

const router = express.Router();

router.post('/', authenticateToken, validateNote, validateRequest, create_Note);
router.get('/', authenticateToken, get_Notes);
router.get('/search', authenticateToken, searchNotesController);
router.get('/:id', authenticateToken, get_NoteById);
router.put('/:id', authenticateToken, validateNote, validateRequest, update_Note);
router.patch('/:id', authenticateToken, validateNote, validateRequest, update_Note);
router.delete('/:id', authenticateToken, delete_Note);
router.get('/assigned', authenticateToken, fetchAssignedNotes);

export default router;
