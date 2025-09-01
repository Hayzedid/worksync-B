// Phase 2 Collaboration Routes
import express from 'express';
import {
  getCollaborativeSession,
  syncDocumentChanges,
  leaveCollaborativeSession,
  getCollaborationHistory
} from '../controllers/collaborationController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Collaboration API
router.get('/:itemType/:itemId', authenticateToken, getCollaborativeSession); // GET /api/collaboration/:itemType/:itemId
router.post('/:itemType/:itemId/sync', authenticateToken, syncDocumentChanges); // POST /api/collaboration/:itemType/:itemId/sync
router.delete('/:itemType/:itemId/leave', authenticateToken, leaveCollaborativeSession); // DELETE /api/collaboration/:itemType/:itemId/leave
router.get('/:itemType/:itemId/history', authenticateToken, getCollaborationHistory); // GET /api/collaboration/:itemType/:itemId/history

export default router;
