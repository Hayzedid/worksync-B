// controllers/userController.js
import {
  getUserService,
  updateUserService,
  getAllUsersService,
  getPublicUserService,
  deleteUserService
} from '../services/userService.js';
import { getOnlineUsers } from '../socket/socketHandler.js';

export const getCurrentUser = async (req, res, next) => {
  try {
    const { id } = req.user;
    const user = await getUserService(id);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const { username, profile_picture, name, email, first_name, last_name, firstName, lastName } = req.body;
    const { id } = req.user;
    
    // Support multiple frontend formats and split name if provided
    let finalFirstName = first_name || firstName;
    let finalLastName = last_name || lastName;
    
    // If name is provided, split it into first and last name
    if (name && !finalFirstName && !finalLastName) {
      const nameParts = name.trim().split(' ');
      finalFirstName = nameParts[0] || '';
      finalLastName = nameParts.slice(1).join(' ') || '';
    }
    
    const finalUsername = username;
    const finalEmail = email;
    
    if (!finalUsername && !finalEmail && !profile_picture && !finalFirstName && !finalLastName) {
      return res.status(400).json({ success: false, message: 'At least one field is required for update' });
    }
    
    const updated = await updateUserService(id, finalUsername, profile_picture, finalEmail, finalFirstName, finalLastName);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = await getUserService(id);
    res.json({ success: true, message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
};

export const getAllUsersController = async (req, res, next) => {
  try {
    const users = await getAllUsersService();
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

export const getUserByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await getPublicUserService(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const deleteUserController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await deleteUserService(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export async function getOnlineUsersController(req, res, next) {
  try {
    const onlineUsers = getOnlineUsers();
    res.json({ success: true, onlineUsers });
  } catch (error) {
    next(error);
  }
}
