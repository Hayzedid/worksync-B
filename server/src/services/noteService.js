// services/noteService.js
import {
  getNotes,
  getAllNotesForUser,
  getNoteById,
  createNote,
  updateNote,
  deleteNoteById,
  // ...other model functions
} from '../models/Note.js';

export async function getNotesService(params) {
  const { userId, limit, offset, workspaceId } = params;
  return getAllNotesForUser(userId, limit, offset, workspaceId);
}

export async function getNoteService(noteId, userId) {
  return getNoteById(noteId, userId);
}

export async function createNoteService(noteData) {
  return createNote(noteData);
}

export async function updateNoteService({ noteId, title, content, userId }) {
  return updateNote({ noteId, title, content, userId });
}

export async function deleteNoteService(noteId, userId) {
  return deleteNote(noteId, userId);
}
// Add more as needed
