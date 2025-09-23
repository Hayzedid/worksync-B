import { pool } from '../config/database.js';
import { sanitizeParams } from '../utils/sql.js';
import crypto from 'crypto';

// Create a workspace invitation
export async function createWorkspaceInvitation({ workspace_id, email, invited_by, expiresInHours = 72 }) {
  const invite_token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000)); // Default 72 hours

  const [result] = await pool.execute(
    'INSERT INTO workspace_invitations (workspace_id, email, invite_token, invited_by, expires_at) VALUES (?, ?, ?, ?, ?)',
    sanitizeParams([workspace_id, email.toLowerCase(), invite_token, invited_by, expires_at])
  );

  return {
    id: result.insertId,
    invite_token,
    expires_at
  };
}

// Get invitation by token
export async function getInvitationByToken(token) {
  const [rows] = await pool.execute(
    `SELECT wi.*, w.name as workspace_name, u.first_name as inviter_first_name, u.last_name as inviter_last_name 
     FROM workspace_invitations wi
     JOIN workspaces w ON wi.workspace_id = w.id
     JOIN users u ON wi.invited_by = u.id
     WHERE wi.invite_token = ? AND wi.status = 'pending' AND wi.expires_at > NOW()`,
    sanitizeParams([token])
  );

  return rows[0] || null;
}

// Accept invitation (mark as accepted)
export async function acceptInvitation(token) {
  const [result] = await pool.execute(
    'UPDATE workspace_invitations SET status = "accepted", accepted_at = NOW() WHERE invite_token = ? AND status = "pending"',
    sanitizeParams([token])
  );

  return result.affectedRows > 0;
}

// Get pending invitations by email
export async function getPendingInvitationsByEmail(email) {
  const [rows] = await pool.execute(
    `SELECT wi.*, w.name as workspace_name, u.first_name as inviter_first_name, u.last_name as inviter_last_name 
     FROM workspace_invitations wi
     JOIN workspaces w ON wi.workspace_id = w.id
     JOIN users u ON wi.invited_by = u.id
     WHERE wi.email = ? AND wi.status = 'pending' AND wi.expires_at > NOW()`,
    sanitizeParams([email.toLowerCase()])
  );

  return rows;
}

// Expire old invitations (cleanup job)
export async function expireOldInvitations() {
  const [result] = await pool.execute(
    'UPDATE workspace_invitations SET status = "expired" WHERE status = "pending" AND expires_at < NOW()'
  );

  return result.affectedRows;
}

// Get all invitations for a workspace (admin view)
export async function getWorkspaceInvitations(workspace_id) {
  const [rows] = await pool.execute(
    `SELECT wi.*, u.first_name as inviter_first_name, u.last_name as inviter_last_name 
     FROM workspace_invitations wi
     JOIN users u ON wi.invited_by = u.id
     WHERE wi.workspace_id = ?
     ORDER BY wi.created_at DESC`,
    sanitizeParams([workspace_id])
  );

  return rows;
}
