import express from 'express';
import multer from 'multer';
import { uploadAttachment, getAttachments, deleteAttachmentHandler } from '../controllers/attachmentController.js';
import authenticateToken from '../middleware/auth.js';

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

export default router; 