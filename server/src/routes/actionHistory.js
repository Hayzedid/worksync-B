import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get action history for undo/redo
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, workspaceId } = req.query;

    let query = `
      SELECT ah.*, u.first_name, u.last_name 
      FROM action_history ah
      LEFT JOIN users u ON ah.user_id = u.id
      WHERE ah.user_id = ?
    `;
    const params = [userId];

    if (workspaceId) {
      query += ` AND ah.workspace_id = ?`;
      params.push(workspaceId);
    }

    query += ` ORDER BY ah.created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [actions] = await pool.execute(query, params);
    
    // Parse JSON data
    const formattedActions = actions.map(action => ({
      ...action,
      before_data: action.before_data ? JSON.parse(action.before_data) : null,
      after_data: action.after_data ? JSON.parse(action.after_data) : null
    }));

    res.json(formattedActions);
  } catch (error) {
    console.error('Error fetching action history:', error);
    res.status(500).json({ error: 'Failed to fetch action history' });
  }
});

// Record a new action for undo/redo
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      action_type,
      action_description,
      item_type,
      item_id,
      before_data,
      after_data,
      workspace_id
    } = req.body;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      INSERT INTO action_history (
        user_id, action_type, action_description, item_type, item_id,
        before_data, after_data, workspace_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      action_type,
      action_description,
      item_type,
      item_id,
      before_data ? JSON.stringify(before_data) : null,
      after_data ? JSON.stringify(after_data) : null,
      workspace_id
    ]);

    // Clean up old history (keep only last 100 actions per user)
    await pool.execute(`
      DELETE FROM action_history 
      WHERE user_id = ? AND id NOT IN (
        SELECT id FROM (
          SELECT id FROM action_history 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT 100
        ) as recent_actions
      )
    `, [userId, userId]);

    // Fetch the created action
    const [actions] = await pool.execute(`
      SELECT ah.*, u.first_name, u.last_name 
      FROM action_history ah
      LEFT JOIN users u ON ah.user_id = u.id
      WHERE ah.id = ?
    `, [result.insertId]);

    const action = actions[0];
    const formattedAction = {
      ...action,
      before_data: action.before_data ? JSON.parse(action.before_data) : null,
      after_data: action.after_data ? JSON.parse(action.after_data) : null
    };

    res.status(201).json(formattedAction);
  } catch (error) {
    console.error('Error recording action:', error);
    res.status(500).json({ error: 'Failed to record action' });
  }
});

// Get specific action for undo/redo
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [actions] = await pool.execute(`
      SELECT ah.*, u.first_name, u.last_name 
      FROM action_history ah
      LEFT JOIN users u ON ah.user_id = u.id
      WHERE ah.id = ? AND ah.user_id = ?
    `, [id, userId]);

    if (actions.length === 0) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const action = actions[0];
    const formattedAction = {
      ...action,
      before_data: action.before_data ? JSON.parse(action.before_data) : null,
      after_data: action.after_data ? JSON.parse(action.after_data) : null
    };

    res.json(formattedAction);
  } catch (error) {
    console.error('Error fetching action:', error);
    res.status(500).json({ error: 'Failed to fetch action' });
  }
});

// Perform undo operation
router.post('/:id/undo', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get the action to undo
    const [actions] = await pool.execute(`
      SELECT * FROM action_history 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (actions.length === 0) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const action = actions[0];
    const beforeData = action.before_data ? JSON.parse(action.before_data) : null;

    if (!beforeData) {
      return res.status(400).json({ error: 'Cannot undo this action - no before state available' });
    }

    // Perform the undo operation based on item type
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      switch (action.item_type) {
        case 'task':
          await undoTaskAction(connection, action.item_id, beforeData);
          break;
        case 'project':
          await undoProjectAction(connection, action.item_id, beforeData);
          break;
        case 'note':
          await undoNoteAction(connection, action.item_id, beforeData);
          break;
        default:
          throw new Error(`Unsupported item type for undo: ${action.item_type}`);
      }

      await connection.commit();
      res.json({ message: 'Action undone successfully', action: action });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error performing undo:', error);
    res.status(500).json({ error: 'Failed to perform undo operation' });
  }
});

// Perform redo operation
router.post('/:id/redo', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get the action to redo
    const [actions] = await pool.execute(`
      SELECT * FROM action_history 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (actions.length === 0) {
      return res.status(404).json({ error: 'Action not found' });
    }

    const action = actions[0];
    const afterData = action.after_data ? JSON.parse(action.after_data) : null;

    if (!afterData) {
      return res.status(400).json({ error: 'Cannot redo this action - no after state available' });
    }

    // Perform the redo operation based on item type
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      switch (action.item_type) {
        case 'task':
          await redoTaskAction(connection, action.item_id, afterData);
          break;
        case 'project':
          await redoProjectAction(connection, action.item_id, afterData);
          break;
        case 'note':
          await redoNoteAction(connection, action.item_id, afterData);
          break;
        default:
          throw new Error(`Unsupported item type for redo: ${action.item_type}`);
      }

      await connection.commit();
      res.json({ message: 'Action redone successfully', action: action });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error performing redo:', error);
    res.status(500).json({ error: 'Failed to perform redo operation' });
  }
});

// Clear action history
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { olderThan } = req.query;

    let query = 'DELETE FROM action_history WHERE user_id = ?';
    const params = [userId];

    if (olderThan) {
      query += ' AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(parseInt(olderThan));
    }

    await pool.execute(query, params);
    res.json({ message: 'Action history cleared successfully' });
  } catch (error) {
    console.error('Error clearing action history:', error);
    res.status(500).json({ error: 'Failed to clear action history' });
  }
});

// Helper functions for undo/redo operations
async function undoTaskAction(connection, taskId, beforeData) {
  const updateFields = [];
  const params = [];

  Object.keys(beforeData).forEach(key => {
    if (key !== 'id') {
      updateFields.push(`${key} = ?`);
      params.push(beforeData[key]);
    }
  });

  if (updateFields.length > 0) {
    params.push(taskId);
    await connection.execute(`
      UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?
    `, params);
  }
}

async function redoTaskAction(connection, taskId, afterData) {
  const updateFields = [];
  const params = [];

  Object.keys(afterData).forEach(key => {
    if (key !== 'id') {
      updateFields.push(`${key} = ?`);
      params.push(afterData[key]);
    }
  });

  if (updateFields.length > 0) {
    params.push(taskId);
    await connection.execute(`
      UPDATE tasks SET ${updateFields.join(', ')} WHERE id = ?
    `, params);
  }
}

async function undoProjectAction(connection, projectId, beforeData) {
  const updateFields = [];
  const params = [];

  Object.keys(beforeData).forEach(key => {
    if (key !== 'id') {
      updateFields.push(`${key} = ?`);
      params.push(beforeData[key]);
    }
  });

  if (updateFields.length > 0) {
    params.push(projectId);
    await connection.execute(`
      UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?
    `, params);
  }
}

async function redoProjectAction(connection, projectId, afterData) {
  const updateFields = [];
  const params = [];

  Object.keys(afterData).forEach(key => {
    if (key !== 'id') {
      updateFields.push(`${key} = ?`);
      params.push(afterData[key]);
    }
  });

  if (updateFields.length > 0) {
    params.push(projectId);
    await connection.execute(`
      UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?
    `, params);
  }
}

async function undoNoteAction(connection, noteId, beforeData) {
  const updateFields = [];
  const params = [];

  Object.keys(beforeData).forEach(key => {
    if (key !== 'id') {
      updateFields.push(`${key} = ?`);
      params.push(beforeData[key]);
    }
  });

  if (updateFields.length > 0) {
    params.push(noteId);
    await connection.execute(`
      UPDATE notes SET ${updateFields.join(', ')} WHERE id = ?
    `, params);
  }
}

async function redoNoteAction(connection, noteId, afterData) {
  const updateFields = [];
  const params = [];

  Object.keys(afterData).forEach(key => {
    if (key !== 'id') {
      updateFields.push(`${key} = ?`);
      params.push(afterData[key]);
    }
  });

  if (updateFields.length > 0) {
    params.push(noteId);
    await connection.execute(`
      UPDATE notes SET ${updateFields.join(', ')} WHERE id = ?
    `, params);
  }
}

export default router;
