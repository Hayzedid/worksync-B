// routes/users.js
import express from 'express';
import {
  getCurrentUser,
  updateUserProfile,
  getAllUsersController,
  getUserByIdController,
  deleteUserController,
  getOnlineUsersController
} from '../controllers/userController.js';
import authenticateToken from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = express.Router();

// Protected routes
// Align with tests expecting /api/users/profile
router.get('/profile', authenticateToken, getCurrentUser);
router.put('/profile', authenticateToken, updateUserProfile);

// Admin or public endpoints (adjust access as needed)
router.get('/', authenticateToken, requireRole('admin'), getAllUsersController);
router.get('/online', authenticateToken, requireRole('admin'), getOnlineUsersController);
router.get('/:id', authenticateToken, requireRole('admin'), getUserByIdController);
router.delete('/:id', authenticateToken, requireRole('admin'), deleteUserController);

export default router;
