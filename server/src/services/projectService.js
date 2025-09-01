// services/projectService.js
import {
  getAllProjectsForUser,
  getProjectById,
  createNewProject,
  updateProjectById,
  deleteProjectById,
  // ...other model functions
} from '../models/Project.js';

export async function getProjectsService(userId, workspaceId) {
  return getAllProjectsForUser(userId, workspaceId);
}

export async function getProjectService(projectId, userId) {
  return getProjectById(projectId, userId);
}

export async function createProjectService(projectData) {
  return createNewProject(projectData);
}

export async function updateProjectService(updateData) {
  return updateProjectById(updateData);
}

export async function deleteProjectService(projectId, userId) {
  console.log('[deleteProjectService] Called with:', { projectId, userId });
  return deleteProjectById(projectId, userId);
}
// Add more as needed
