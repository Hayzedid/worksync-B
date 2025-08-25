// services/workspaceService.js
import {
  createWorkspace,
  getWorkspacesByUser,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspaceById,
  // ...other model functions
} from '../models/Workspace.js';

export async function createWorkspaceService(data) {
  return createWorkspace(data);
}

export async function getWorkspacesService(userId) {
  return getWorkspacesByUser(userId);
}

export async function getWorkspaceService(id) {
  return getWorkspaceById(id);
}

export async function updateWorkspaceService(id, updateData) {
  return updateWorkspace(id, updateData);
}

export async function deleteWorkspaceService(id) {
  return deleteWorkspaceById(id);
}
// Add more as needed
