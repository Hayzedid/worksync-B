// controllers/workspaceController.js
import {
  createWorkspaceService,
  getWorkspacesService,
  getWorkspaceService,
  updateWorkspaceService,
  deleteWorkspaceService
  // ...other service functions
} from '../services/workspaceService.js';
import { getUserByEmail } from '../models/User.js';
import { addUserToWorkspace, getWorkspaceMembers } from '../models/Workspace.js';

// Create new workspace
export async function createWorkspaceHandler(req, res) {
  const { name, description } = req.body;
  const created_by = req.user.id;

  try {
    const workspaceId = await createWorkspaceService({ name, description, created_by });
    await addUserToWorkspace(workspaceId, created_by); // add creator as member
    res.status(201).json({ message: 'Workspace created', workspaceId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
}

// Invite by email -> resolves to user_id and adds as member
export async function inviteByEmailHandler(req, res) {
  const { workspace_id, email } = req.body;
  if (!workspace_id || !email) {
    return res.status(400).json({ error: 'workspace_id and email are required' });
  }
  try {
    const user = await getUserByEmail(String(email).toLowerCase().trim());
    if (!user) {
      return res.status(404).json({ error: 'User with that email not found' });
    }
    await addUserToWorkspace(workspace_id, user.id);
    return res.status(200).json({ message: 'User invited', userId: user.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to invite user' });
  }
}

// Get single workspace
export async function getWorkspaceHandler(req, res) {
  const { id } = req.params;
  try {
    const workspace = await getWorkspaceService(id);
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
    const workspaces = await getWorkspacesService(userId);
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

// Update workspace (only creator)
export async function updateWorkspaceHandler(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;
  const userId = req.user.id;

  try {
    const affected = await updateWorkspaceService({ id, userId, name, description });
    if (!affected) {
      return res.status(404).json({ error: 'Workspace not found or unauthorized' });
    }
    // Return updated resource
    const ws = await getWorkspaceService(id);
    return res.json({ message: 'Workspace updated', workspace: ws });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update workspace' });
  }
}

// Delete workspace (only creator)
export async function deleteWorkspaceHandler(req, res) {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const affected = await deleteWorkspaceService(id, userId);
    if (!affected) {
      return res.status(404).json({ error: 'Workspace not found or unauthorized' });
    }
    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to delete workspace' });
  }
}
