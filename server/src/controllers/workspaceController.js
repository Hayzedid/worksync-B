// controllers/workspaceController.js
import {
  createWorkspace,
  getWorkspaceById,
  getWorkspacesByUser,
  addUserToWorkspace,
  getWorkspaceMembers,
} from '../models/Workspace.js';

// Create new workspace
export async function createWorkspaceHandler(req, res) {
  const { name, description } = req.body;
  const created_by = req.user.id;

  try {
    const workspaceId = await createWorkspace({ name, description, created_by });
    await addUserToWorkspace(workspaceId, created_by); // add creator as member
    res.status(201).json({ message: 'Workspace created', workspaceId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
}

// Get single workspace
export async function getWorkspaceHandler(req, res) {
  const { id } = req.params;
  try {
    const workspace = await getWorkspaceById(id);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    res.json(workspace);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
}

// Get all workspaces for current user
export async function getMyWorkspacesHandler(req, res) {
  const userId = req.user.id;
  try {
    const workspaces = await getWorkspacesByUser(userId);
    res.json(workspaces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
}

// Add user to workspace
export async function addUserToWorkspaceHandler(req, res) {
  const { workspace_id, user_id } = req.body;

  try {
    await addUserToWorkspace(workspace_id, user_id);
    res.status(200).json({ message: 'User added to workspace' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add user' });
  }
}

// Get members of workspace
export async function getWorkspaceMembersHandler(req, res) {
  const { id } = req.params;

  try {
    const members = await getWorkspaceMembers(id);
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}
