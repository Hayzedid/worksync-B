// routes/workspaceRoutes.js
import express from 'express';
import {
  createWorkspaceHandler,
  getWorkspaceHandler,
  getMyWorkspacesHandler,
  addUserToWorkspaceHandler,
  getWorkspaceMembersHandler,
  updateWorkspaceHandler,
  deleteWorkspaceHandler,
  inviteByEmailHandler
} from '../controllers/workspaceController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.post('/', authenticateToken, createWorkspaceHandler);                // Create
router.get('/', authenticateToken, getMyWorkspacesHandler);                // Get all for current user
router.get('/:id', authenticateToken, getWorkspaceHandler);                // Get by id
router.post('/add-member', authenticateToken, addUserToWorkspaceHandler); // Add user
router.get('/:id/members', authenticateToken, getWorkspaceMembersHandler);// Get members
router.patch('/:id', authenticateToken, updateWorkspaceHandler);          // Update
router.delete('/:id', authenticateToken, deleteWorkspaceHandler);         // Delete
router.post('/invite', authenticateToken, inviteByEmailHandler);          // Invite by email -> { workspace_id, email }

export default router;
