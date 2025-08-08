// routes/userRoutes.js
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

const router = express.Router();

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);
router.put('/me', authenticateToken, updateUserProfile);

// Admin or public endpoints (adjust access as needed)
router.get('/', authenticateToken, getAllUsersController);
router.get('/online', authenticateToken, getOnlineUsersController);
router.get('/:id', authenticateToken, getUserByIdController);
router.delete('/:id', authenticateToken, deleteUserController);

export default router;
