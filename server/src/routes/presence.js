// Phase 2 Presence Routes
import express from 'express';
import {
  getWorkspacePresenceController,
  updateUserPresence,
  getUserPresence
} from '../controllers/presenceController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Presence API
router.get('/workspace/:workspaceId', authenticateToken, getWorkspacePresenceController); // GET /api/presence/workspace/:workspaceId
router.post('/update', authenticateToken, updateUserPresence); // POST /api/presence/update
router.get('/users/:userId', authenticateToken, getUserPresence); // GET /api/presence/users/:userId

export default router;
