// services/noteService.js
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNoteById,
  // ...other model functions
} from '../models/Note.js';

export async function getNotesService(params) {
  return getNotes(params);
}

export async function getNoteService(noteId) {
  return getNoteById(noteId);
}

export async function createNoteService(noteData) {
  return createNote(noteData);
}

export async function updateNoteService(noteId, updateData) {
  return updateNote(noteId, updateData);
}

export async function deleteNoteService(noteId) {
  return deleteNoteById(noteId);
}
// Add more as needed
