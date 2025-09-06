import { pool } from '../config/database.js';
import { sanitizeParams } from '../utils/sql.js';
import * as config from '../config/config.js';

// Delete a note by ID (admin/service use, no user check)
export async function deleteNoteById(noteId) {
  const [result] = await pool.execute(
    `DELETE FROM notes WHERE id = ?`,
    [noteId]
  );
  return result.affectedRows;
}


export async function createNote({
  title,
  content,
  project_id,
  created_by,
  workspace_id
}) {
  const [result] = await pool.execute(
    `INSERT INTO notes (title, content, project_id, created_by, workspace_id)
     VALUES (?, ?, ?, ?, ?)`,
  sanitizeParams([title, content || '', project_id || null, created_by, workspace_id || null])
  );
  return result.insertId;
}

export async function getNotes({ userId, limit = 20, offset = 0 }) {
  const lim = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 20;
  const off = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;
  if (config.NODE_ENV !== 'production') {
    // Lightweight debug of bindings
     
    console.debug('[getNotes] params', { userId, limit: lim, offset: off });
  }
  // Inline LIMIT/OFFSET to avoid MySQL binding issues (values are validated integers)
  const [rows] = await pool.query(
    `SELECT * FROM notes WHERE created_by = ? ORDER BY created_at DESC LIMIT ${lim} OFFSET ${off}`,
  sanitizeParams([userId])
  );
  const [[{ total }]] = await pool.query(
    'SELECT COUNT(*) AS total FROM notes WHERE created_by = ?',
  sanitizeParams([userId])
  );
  return { notes: rows, total };
}

export async function updateNote({ noteId, title, content, userId }) {
    const [result] = await pool.execute(
        `UPDATE notes SET title = ?, content = ? WHERE id = ? AND created_by = ?`,
  sanitizeParams([title, content, noteId, userId])
    );
    return result.affectedRows;
}

export async function deleteNote(noteId, userId) {
    const [result] = await pool.execute(
        `DELETE FROM notes WHERE id = ? AND created_by = ?`,
  sanitizeParams([noteId, userId])
    );
    return result.affectedRows;
}


// Get all notes created by or assigned to a user
export async function getAllNotesForUser(userId, limit = 20, offset = 0, workspaceId) {
  const lim = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 20;
  const off = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;
  if (config.NODE_ENV !== 'production') {
    console.debug('[getAllNotesForUser] params', { userId, limit: lim, offset: off, workspaceId });
  }
  
  let sql = `SELECT n.*, w.name AS workspace_name, p.name AS project_name,
             p.workspace_id as project_workspace_id
             FROM notes n
             LEFT JOIN workspaces w ON n.workspace_id = w.id
             LEFT JOIN projects p ON n.project_id = p.id
             WHERE n.created_by = ?`;
  
  const params = [userId];
  
  if (workspaceId !== undefined) {
    // Filter by workspace_id - includes both direct workspace notes and notes from projects in workspace
    sql += ' AND (n.workspace_id = ? OR p.workspace_id = ?)';
    params.push(workspaceId, workspaceId);
  }
  
  sql += ` ORDER BY n.created_at DESC LIMIT ${lim} OFFSET ${off}`;
  
  const [rows] = await pool.query(sql, sanitizeParams(params));
  
  let countSql = 'SELECT COUNT(*) AS total FROM notes n LEFT JOIN projects p ON n.project_id = p.id WHERE n.created_by = ?';
  const countParams = [userId];
  
  if (workspaceId !== undefined) {
    countSql += ' AND (n.workspace_id = ? OR p.workspace_id = ?)';
    countParams.push(workspaceId, workspaceId);
  }
  
  const [[{ total }]] = await pool.query(countSql, sanitizeParams(countParams));
  return { notes: rows, total };
}

export async function getNoteById(noteId, userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM notes WHERE id = ? AND created_by = ? LIMIT 1`,
  sanitizeParams([noteId, userId])
  );
  return rows[0] || null;
}

export async function getNotesByProject(projectId, userId) {
  const [rows] = await pool.execute(
    `SELECT * FROM notes WHERE project_id = ? AND created_by = ? ORDER BY created_at DESC`,
  sanitizeParams([projectId, userId])
  );
  return rows;
}

export async function searchNotes({ userId, q, project_id, workspace_id }) {
  let sql = `SELECT * FROM notes WHERE created_by = ?`;
  const params = [userId];
  if (q) {
    sql += ' AND MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE)';
  params.push(q);
  }
  if (project_id) {
    sql += ' AND project_id = ?';
    params.push(project_id);
  }
  if (workspace_id) {
    sql += ' AND workspace_id = ?';
    params.push(workspace_id);
  }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await pool.execute(sql, sanitizeParams(params));
  return rows;
}

export async function addMentions(userIds, source_type, source_id) {
  if (!userIds || userIds.length === 0) return;
  const values = userIds.map(userId => [userId, source_type, source_id]);
  await pool.query(
    'INSERT INTO mentions (user_id, source_type, source_id) VALUES ?',[values]
  );
}

const noteSearchCache = new Map();

export function getCachedSearchNotes(cacheKey) {
  return noteSearchCache.get(cacheKey);
}

export function setCachedSearchNotes(cacheKey, notes) {
  noteSearchCache.set(cacheKey, notes);
}
