import { pool } from '../config/database.js';


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
    [title, content || '', project_id || null, created_by, workspace_id || null]
  );
  return result.insertId;
}

export async function getNotes({ userId, limit = 20, offset = 0 }) {
  const [rows] = await pool.execute(
    'SELECT SQL_CALC_FOUND_ROWS * FROM notes WHERE created_by = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [userId, Number(limit), Number(offset)]
  );
  const [[{ 'FOUND_ROWS()': total }]] = await pool.query('SELECT FOUND_ROWS()');
  return { notes: rows, total };
}

export async function updateNote({ noteId, title, content, userId }) {
    const [result] = await pool.execute(
        `UPDATE notes SET title = ?, content = ? WHERE id = ? AND created_by = ?`,
        [title, content, noteId, userId]
    );
    return result.affectedRows;
}

export async function deleteNote(noteId, userId) {
    const [result] = await pool.execute(
        `DELETE FROM notes WHERE id = ? AND created_by = ?`,
        [noteId, userId]
    );
    return result.affectedRows;
}


// Get all notes created by or assigned to a user
export async function getAllNotesForUser(userId, limit = 20, offset = 0) {
  const [rows] = await pool.execute(
    `SELECT SQL_CALC_FOUND_ROWS notes.*, workspaces.name AS workspace_name, projects.name AS project_name
     FROM notes
     LEFT JOIN workspaces ON notes.workspace_id = workspaces.id
     LEFT JOIN projects ON notes.project_id = projects.id
     WHERE notes.created_by = ?
     ORDER BY notes.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, Number(limit), Number(offset)]
  );
  const [[{ 'FOUND_ROWS()': total }]] = await pool.query('SELECT FOUND_ROWS()');
  return { notes: rows, total };
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
  const [rows] = await pool.execute(sql, params);
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
