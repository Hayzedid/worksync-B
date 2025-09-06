// controllers/workspaceController.js
import { pool } from '../config/database.js';
import {
  createWorkspaceService,
  getWorkspacesService,
  getWorkspaceService,
  updateWorkspaceService,
  deleteWorkspaceService
  // ...other service functions
} from '../services/workspaceService.js';
import { getUserByEmail, getUserById } from '../models/User.js';
import { addUserToWorkspace, getWorkspaceMembers } from '../models/Workspace.js';
import { 
  createWorkspaceInvitation, 
  getInvitationByToken, 
  acceptInvitation, 
  getPendingInvitationsByEmail,
  getWorkspaceInvitations 
} from '../models/WorkspaceInvitation.js';
import { sendWorkspaceInvitation } from '../services/emailServices.js';

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

// Invite by email -> handles both existing and new users
export async function inviteByEmailHandler(req, res) {
  const { workspace_id, email } = req.body;
  const inviterId = req.user.id;
  
  if (!workspace_id || !email) {
    return res.status(400).json({ error: 'workspace_id and email are required' });
  }

  try {
    // Get the inviter's full details from database
    const inviterUser = await getUserById(inviterId);
    if (!inviterUser) {
      return res.status(401).json({ error: 'Inviter not found' });
    }

    // Check if workspace exists and user has permission to invite
    const workspace = await getWorkspaceService(workspace_id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // For now, let anyone in the workspace invite others
    // TODO: Add proper permission check (only admins/creators can invite)

    const normalizedEmail = String(email).toLowerCase().trim();
    const inviterName = `${inviterUser.first_name} ${inviterUser.last_name}`;
    
    // Check if user already exists
    const existingUser = await getUserByEmail(normalizedEmail);
    
    if (existingUser) {
      // Check if user is already a member
      const members = await getWorkspaceMembers(workspace_id);
      const isAlreadyMember = members.some(member => member.id === existingUser.id);
      
      if (isAlreadyMember) {
        return res.status(400).json({ error: 'User is already a member of this workspace' });
      }

      // Add existing user directly to workspace
      await addUserToWorkspace(workspace_id, existingUser.id);
      
      // Send notification email for existing user
      try {
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/workspace?ws=${workspace_id}`;
        await sendWorkspaceInvitation({
          to: normalizedEmail,
          workspaceName: workspace.name,
          inviterName: inviterName,
          inviteUrl,
          isExistingUser: true
        });
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the invitation if email fails
      }
      
      return res.status(200).json({ 
        message: 'User added to workspace and notified', 
        userId: existingUser.id 
      });
    } else {
      // Create invitation token for new user
      const invitation = await createWorkspaceInvitation({
        workspace_id,
        email: normalizedEmail,
        invited_by: inviterId,
        expiresInHours: 72 // 3 days
      });

      // Send invitation email
      try {
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/${invitation.invite_token}`;
        await sendWorkspaceInvitation({
          to: normalizedEmail,
          workspaceName: workspace.name,
          inviterName: inviterName,
          inviteUrl,
          isExistingUser: false
        });
        
        return res.status(200).json({ 
          message: 'Invitation sent successfully', 
          invitationId: invitation.id,
          expiresAt: invitation.expires_at
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        return res.status(500).json({ 
          error: 'Failed to send invitation email',
          details: emailError.message 
        });
      }
    }
  } catch (error) {
    console.error('Invitation error:', error);
    return res.status(500).json({ error: 'Failed to process invitation' });
  }
}

// Get invitation details by token (for invite page)
export async function getInvitationHandler(req, res) {
  const { token } = req.params;
  
  try {
    const invitation = await getInvitationByToken(token);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or expired' });
    }

    return res.status(200).json({
      workspaceName: invitation.workspace_name,
      inviterName: `${invitation.inviter_first_name} ${invitation.inviter_last_name}`,
      email: invitation.email,
      expiresAt: invitation.expires_at
    });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return res.status(500).json({ error: 'Failed to fetch invitation details' });
  }
}

// Accept invitation (after user signs up or logs in)
export async function acceptInvitationHandler(req, res) {
  const { token } = req.params;
  const userId = req.user.id;
  
  try {
    const invitation = await getInvitationByToken(token);
    
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or expired' });
    }

    // Verify the user's email matches the invitation
    if (req.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(400).json({ error: 'User email does not match invitation' });
    }

    // Add user to workspace
    await addUserToWorkspace(invitation.workspace_id, userId);
    
    // Mark invitation as accepted
    await acceptInvitation(token);

    return res.status(200).json({ 
      message: 'Invitation accepted successfully',
      workspaceId: invitation.workspace_id
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return res.status(500).json({ error: 'Failed to accept invitation' });
  }
}

// Get workspace invitations (admin view)
export async function getWorkspaceInvitationsHandler(req, res) {
  const { id: workspace_id } = req.params;
  
  try {
    const invitations = await getWorkspaceInvitations(workspace_id);
    return res.status(200).json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return res.status(500).json({ error: 'Failed to fetch invitations' });
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

// Remove member from workspace
export async function removeWorkspaceMemberHandler(req, res) {
  const { id: workspaceId, userId } = req.params;
  const requesterId = req.user.id;

  try {
    // Check if requester is workspace owner
    const workspace = await getWorkspaceService(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    if (workspace.created_by !== requesterId) {
      return res.status(403).json({ error: 'Only workspace owner can remove members' });
    }

    // Remove the member
    const [result] = await pool.execute(
      'DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
      [workspaceId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Member not found in workspace' });
    }

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove member' });
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
