// src/controllers/noteController.js
import {
  getNotesService,
  getNoteService,
  createNoteService,
  updateNoteService,
  deleteNoteService
  // ...other service functions
} from '../services/noteService.js';
import { getUserById } from '../models/User.js';
import { addMentions } from '../models/Note.js';
import { sendEmail } from '../services/emailServices.js';
import sanitizeHtml from 'sanitize-html';


function extractMentionedUserIds(content) {
  // Example: parse @user123 or @username (implement actual logic as needed)
  const regex = /@user(\d+)/g;
  const userIds = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    userIds.push(Number(match[1]));
  }
  return userIds;
}

export async function create_Note(req, res, next) {
  try {
    const { title, content, project_id } = req.body;
    const userId = req.user.id;
    const cleanContent = sanitizeHtml(content || '');
    const noteId = await createNoteService({ title, content: cleanContent, project_id, created_by: userId });
    const mentionedUserIds = extractMentionedUserIds(cleanContent);
    await addMentions(mentionedUserIds, 'note', noteId);
    mentionedUserIds.forEach(async userId => {
      const user = await getUserById(userId);
      if (user && user.email) {
        await sendEmail({ to: user.email, subject: 'You were mentioned in a note' });
      }
    });
    return res.status(201).json({
      success: true,
      message: "Note created successfully",
      noteId
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

export async function get_Notes(req, res, next) {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, workspace_id } = req.query;
    const workspaceId = Number.isFinite(parseInt(workspace_id, 10)) ? parseInt(workspace_id, 10) : undefined;
    const { notes, total } = await getNotesService({ userId, limit, offset, workspaceId });
    return res.status(200).json({ success: true, notes, total });
  } catch (error) {
    next(error);
  }
}

export async function update_Note(req, res, next) {
  try {
    const noteId = req.params.id;
    const { title, content } = req.body;
    const userId = req.user.id;
    const cleanContent = sanitizeHtml(content || '');
    const updated = await updateNoteService({ noteId, title, content: cleanContent, userId });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Note not found or unauthorized" });
    }
    const mentionedUserIds = extractMentionedUserIds(cleanContent);
    await addMentions(mentionedUserIds, 'note', noteId);
    for (const mentionedId of mentionedUserIds) {
      const user = await getUserById(mentionedId);
      if (user && user.email) {
        await sendEmail({ to: user.email, subject: 'You were mentioned in a note' });
      }
    }
    return res.status(200).json({ success: true, message: "Note updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

export async function delete_Note(req, res, next) {
    try {
        const noteId = req.params.id;
        const userId = req.user.id;

      const deleted = await deleteNoteService(noteId, userId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Note not found or unauthorized" });
    }

    return res.status(204).send();
  } catch (error) {
     next(error);
  }
}



export async function get_NoteById(req, res, next) {
  try {
    const noteId = req.params.id;
    const userId = req.user.id;
    const note = await getNoteService(noteId, userId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found or unauthorized' });
    }
    return res.status(200).json({ success: true, note });
  } catch (error) {
    next(error);
  }
}
// Fetch all notes created by user (including those from workspaces)
export async function fetchAssignedNotes(req, res, next) {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;
    const { notes, total } = await getAllNotesForUser(userId, limit, offset);
    res.status(200).json({ success: true, notes, total });
  } catch (error) {
    next(error);
  }
}

export async function searchNotesController(req, res, next) {
  try {
    const { q, project_id, workspace_id } = req.query;
    const userId = req.user.id;
    
    // Parse parameters
    let parsedProjectId = project_id;
    let parsedWorkspaceId = workspace_id;
    
    if (project_id && project_id !== 'all') {
      parsedProjectId = parseInt(project_id, 10);
      if (!Number.isFinite(parsedProjectId)) {
        parsedProjectId = undefined;
      }
    } else {
      parsedProjectId = undefined;
    }
    
    if (workspace_id && workspace_id !== 'all') {
      parsedWorkspaceId = parseInt(workspace_id, 10);
      if (!Number.isFinite(parsedWorkspaceId)) {
        parsedWorkspaceId = undefined;
      }
    } else {
      parsedWorkspaceId = undefined;
    }
    
    // Create cache key
    const cacheKey = `notes:${userId}:${q || ''}:${parsedProjectId || 'all'}:${parsedWorkspaceId || 'all'}`;
    
    // Check cache first
    const cached = getCachedSearchNotes(cacheKey);
    if (cached) {
      return res.json({ 
        success: true, 
        notes: cached, 
        count: cached.length,
        cached: true,
        query: { q, project_id: parsedProjectId, workspace_id: parsedWorkspaceId }
      });
    }
    
    // Perform search
    const notes = await searchNotes({ 
      userId, 
      q, 
      project_id: parsedProjectId, 
      workspace_id: parsedWorkspaceId 
    });
    
    // Cache results for 5 minutes
    setCachedSearchNotes(cacheKey, notes);
    setTimeout(() => {
      getCachedSearchNotes(cacheKey) && setCachedSearchNotes(cacheKey, null);
    }, 5 * 60 * 1000);
    
    res.json({ 
      success: true, 
      notes, 
      count: notes.length,
      cached: false,
      query: { q, project_id: parsedProjectId, workspace_id: parsedWorkspaceId }
    });
  } catch (error) {
    console.error('Error in searchNotesController:', error);
    next(error);
  }
}
