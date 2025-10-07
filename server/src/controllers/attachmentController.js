import { createAttachment, getAttachmentsForTask, getAttachmentsForNote, deleteAttachment } from '../models/Attachment.js';
// path import removed; not used here

export async function uploadAttachment(req, res, next) {
  console.log('=== UPLOAD FUNCTION CALLED ===');
  console.log('URL:', req.originalUrl);
  console.log('Route path:', req.route?.path);
  console.log('Base URL:', req.baseUrl);
  
  try {
    console.log('Upload attempt:', {
      params: req.params,
      userId: req.user?.id,
      file: req.file ? { name: req.file.originalname, size: req.file.size } : null,
      route: req.route.path,
      baseUrl: req.baseUrl
    });

    const { id } = req.params; // task or note id
    const uploaded_by = req.user.id;
    const file = req.file;
    
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    
    const { originalname, mimetype, path: filePath } = file;
    // More explicit detection based on URL path
    const isTask = req.originalUrl.includes('/attachments/tasks/');
    const isNote = req.originalUrl.includes('/attachments/notes/');
    
    console.log('Processing upload:', {
      isTask,
      taskId: isTask ? id : null,
      noteId: isTask ? null : id,
      uploadedBy: uploaded_by,
      routePath: req.route.path,
      originalUrl: req.originalUrl
    });

    // Validate that the task or note exists before creating attachment
    if (isTask) {
      const { pool } = await import('../config/database.js');
      const [taskRows] = await pool.execute('SELECT id FROM tasks WHERE id = ?', [id]);
      if (taskRows.length === 0) {
        return res.status(404).json({ success: false, message: `Task with ID ${id} not found` });
      }
    } else {
      const { pool } = await import('../config/database.js');
      const [noteRows] = await pool.execute('SELECT id FROM notes WHERE id = ?', [id]);
      if (noteRows.length === 0) {
        return res.status(404).json({ success: false, message: `Note with ID ${id} not found` });
      }
    }

    const attachmentData = {
      file_name: originalname,
      file_path: filePath,
      file_type: mimetype,
      uploaded_by,
      task_id: isTask ? parseInt(id) : null,
      note_id: isNote ? parseInt(id) : null
    };
    
    console.log('About to create attachment with data:', attachmentData);
    
    const attachmentId = await createAttachment(attachmentData);
    
    console.log('Upload successful, attachmentId:', attachmentId);
    res.status(201).json({ success: true, attachmentId });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
}

export async function getAttachments(req, res, next) {
  try {
    const { id } = req.params;
    // Check both baseUrl and route path to determine if it's a task or note
    const isTask = req.baseUrl.includes('/tasks') || req.route.path.includes('/task');
    const attachments = isTask
      ? await getAttachmentsForTask(id)
      : await getAttachmentsForNote(id);
    res.json({ success: true, attachments });
  } catch (error) {
    next(error);
  }
}

export async function deleteAttachmentHandler(req, res, next) {
  try {
    const { id } = req.params;
    await deleteAttachment(id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
} 