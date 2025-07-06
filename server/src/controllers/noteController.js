// src/controllers/noteController.js
import {deleteNote, createNote, getNotes, updateNote} from '../models/Note.js';


export async function create_Note(req, res) {
    try {
        const { title, content, project_id } = req.body;
        const userId = req.user.id;

        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }

        const noteId = await createNote({ title, content, project_id, userId });
        return res.status(201).json({
            success: true,
            message: "Note created successfully",
            noteId
        });
    } catch (error) {
       next(err);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

export async function get_Notes(req, res) {
    try {
        const userId = req.user.id;

        const notes = await getNotes({ userId });
        return res.status(200).json({ success: true, notes });
    } catch (error) {
       next(err);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
}

export async function update_Note(req, res) {
    try {
        const noteId = req.params.id;
        const { title, content } = req.body;
        const userId = req.user.id;

    const updated = await updateNote({ noteId, title, content, userId });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Note not found or unauthorized" });
    }

    return res.status(200).json({ success: true, message: "Note updated successfully" });
  } catch (error) {
     next(err);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}

export async function delete_Note(req, res) {
    try {
        const noteId = req.params.id;
        const userId = req.user.id;

      const deleted = await deleteNote(noteId, userId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Note not found or unauthorized" });
    }

    return res.status(200).json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
     next(err);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
}
