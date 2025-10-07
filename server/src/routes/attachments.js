import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadAttachment, getAttachments, deleteAttachmentHandler } from '../controllers/attachmentController.js';
import authenticateToken from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.use(authenticateToken);
// Endpoints expected by tests
router.post('/attachments', upload.single('file'), uploadAttachment);
router.get('/attachments/task/:id', getAttachments);
router.get('/attachments/note/:id', getAttachments);
router.delete('/attachments/:id', deleteAttachmentHandler);

// Backward-compatible routes
router.post('/tasks/:id/upload', upload.single('file'), uploadAttachment);
router.get('/tasks/:id/attachments', getAttachments);
router.post('/notes/:id/upload', upload.single('file'), uploadAttachment);
router.get('/notes/:id/attachments', getAttachments);

// Secure file serving route
router.get('/files/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get attachment info from database to verify ownership/access
    const [rows] = await pool.execute(
      `SELECT a.*, t.created_by as task_owner, n.created_by as note_owner 
       FROM attachments a
       LEFT JOIN tasks t ON a.task_id = t.id
       LEFT JOIN notes n ON a.note_id = n.id
       WHERE a.id = ?`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    const attachment = rows[0];
    
    // Check if user has access to this file
    const hasAccess = attachment.uploaded_by === userId || 
                     attachment.task_owner === userId || 
                     attachment.note_owner === userId;
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Check if file exists on disk
    const filePath = path.resolve(attachment.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on disk' });
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
  } catch (error) {
    next(error);
  }
});

export default router; 