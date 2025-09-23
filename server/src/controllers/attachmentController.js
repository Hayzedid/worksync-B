import { createAttachment, getAttachmentsForTask, getAttachmentsForNote, deleteAttachment } from '../models/Attachment.js';
// path import removed; not used here

export async function uploadAttachment(req, res, next) {
  try {
    const { id } = req.params; // task or note id
    const uploaded_by = req.user.id;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const { originalname, mimetype, path: filePath } = file;
    const isTask = req.baseUrl.includes('/tasks');
    const attachmentId = await createAttachment({
      file_name: originalname,
      file_path: filePath,
      file_type: mimetype,
      uploaded_by,
      task_id: isTask ? id : null,
      note_id: isTask ? null : id
    });
    res.status(201).json({ success: true, attachmentId });
  } catch (error) {
    next(error);
  }
}

export async function getAttachments(req, res, next) {
  try {
    const { id } = req.params;
    const isTask = req.baseUrl.includes('/tasks');
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