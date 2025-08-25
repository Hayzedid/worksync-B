// services/userService.js
import {
  getUserById,
  updateUser,
  getAllUsers,
  getPublicUserById,
  deleteUserById,
  // ...other model functions
} from '../models/User.js';

export async function getUserService(userId) {
  return getUserById(userId);
}

export async function updateUserService(id, username, profile_picture) {
  return updateUser(id, username, profile_picture);
}

export async function getAllUsersService() {
  return getAllUsers();
}

export async function getPublicUserService(id) {
  return getPublicUserById(id);
}

export async function deleteUserService(id) {
  return deleteUserById(id);
}
// Add more as needed
