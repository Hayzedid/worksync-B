import { pool } from '../config/database.js';



export async function createNote(req, res) {
    
        const [result] = await pool.execute(
            `INSERT INTO notes (title, content, project_id, created_by) VALUES (?, ?, ?, ?)`,
            [title, content || '', project_id || null, userId]
        );
         return result.insertId;
    }


 export async function getNotes(req, res) {
    
        const [notes] = await pool.execute(
            `SELECT * FROM notes WHERE created_by = ? ORDER BY created_at DESC`,
            [userId]
        );
          return notes;
}   


export async function updateNote(req, res) {
    
        const [result] = await pool.execute(
            `UPDATE notes SET title = ?, content = ? WHERE id = ? AND created_by = ?`,
            [title, content, noteId, userId]
        );
         return result.affectedRows;
}

export async function deleteNote(req, res) {
    
        const [result] = await pool.execute(
            `DELETE FROM notes WHERE id = ? AND created_by = ?`,
            [noteId, userId]
        );
           return result.affectedRows;
      
}
