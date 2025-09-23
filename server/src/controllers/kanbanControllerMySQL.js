// =====================================================
// WorkSync Phase 3 - MySQL Kanban Controller
// Enterprise-grade Kanban board management
// Compatible with existing MySQL infrastructure
// =====================================================

import { pool } from '../config/database.js';

/**
 * Get all Kanban boards for a project
 */
export const getProjectBoards = async (req, res) => {
  try {
    const { projectId } = req.params;

    const [boards] = await pool.execute(`
      SELECT 
        kb.*,
        u.username as created_by_username,
        (SELECT COUNT(*) FROM kanban_columns WHERE board_id = kb.id) as column_count,
        (SELECT COUNT(*) FROM kanban_cards kc 
         JOIN kanban_columns kcol ON kc.column_id = kcol.id 
         WHERE kcol.board_id = kb.id AND kc.status = 'ACTIVE') as card_count
      FROM kanban_boards kb
      LEFT JOIN users u ON kb.created_by = u.id
      WHERE kb.project_id = ?
      ORDER BY kb.position ASC
    `, [projectId]);

    res.json({
      success: true,
      boards
    });
  } catch (error) {
    console.error('Error fetching project boards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch boards',
      error: error.message
    });
  }
};

/**
 * Create a new Kanban board
 */
export const createBoard = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { projectId } = req.params;
    const { name, description, color = '#3B82F6', isDefault = false } = req.body;
    
    // Get next position
    const [positionResult] = await connection.execute(
      'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM kanban_boards WHERE project_id = ?',
      [projectId]
    );
    const position = positionResult[0].next_position;

    // Create board
    const [boardResult] = await connection.execute(`
      INSERT INTO kanban_boards (project_id, name, description, color, position, is_default, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [projectId, name, description, color, position, isDefault, req.user.id]);

    const boardId = boardResult.insertId;

    // Create default columns
    const defaultColumns = [
      { name: 'Backlog', color: '#6B7280', position: 0 },
      { name: 'To Do', color: '#3B82F6', position: 1 },
      { name: 'In Progress', color: '#F59E0B', position: 2 },
      { name: 'Review', color: '#8B5CF6', position: 3 },
      { name: 'Done', color: '#10B981', position: 4, isDoneColumn: true }
    ];

    // Insert columns
    for (const column of defaultColumns) {
      await connection.execute(`
        INSERT INTO kanban_columns (board_id, name, color, position, is_done_column)
        VALUES (?, ?, ?, ?, ?)
      `, [boardId, column.name, column.color, column.position, column.isDoneColumn || false]);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Board created successfully',
      board: {
        id: boardId,
        name,
        description,
        color,
        position,
        isDefault
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating board:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create board',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Get columns for a board
 */
export const getBoardColumns = async (req, res) => {
  try {
    const { boardId } = req.params;

    const [columns] = await pool.execute(`
      SELECT 
        kc.*,
        COUNT(kcard.id) as card_count,
        SUM(CASE WHEN kcard.status = 'ACTIVE' THEN 1 ELSE 0 END) as active_card_count
      FROM kanban_columns kc
      LEFT JOIN kanban_cards kcard ON kc.id = kcard.column_id
      WHERE kc.board_id = ?
      GROUP BY kc.id
      ORDER BY kc.position ASC
    `, [boardId]);

    res.json({
      success: true,
      columns
    });
  } catch (error) {
    console.error('Error fetching board columns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch columns',
      error: error.message
    });
  }
};

/**
 * Create a new column
 */
export const createColumn = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name, color = '#6B7280', wipLimit, isDoneColumn = false } = req.body;

    // Get next position
    const [positionResult] = await pool.execute(
      'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM kanban_columns WHERE board_id = ?',
      [boardId]
    );
    const position = positionResult[0].next_position;

    const [result] = await pool.execute(`
      INSERT INTO kanban_columns (board_id, name, color, position, wip_limit, is_done_column)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [boardId, name, color, position, wipLimit, isDoneColumn]);

    res.status(201).json({
      success: true,
      message: 'Column created successfully',
      column: {
        id: result.insertId,
        name,
        color,
        position,
        wipLimit,
        isDoneColumn
      }
    });
  } catch (error) {
    console.error('Error creating column:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create column',
      error: error.message
    });
  }
};

/**
 * Update board details
 */
export const updateBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name, description, color, settings } = req.body;

    const [result] = await pool.execute(`
      UPDATE kanban_boards 
      SET name = ?, description = ?, color = ?, settings = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, description, color, JSON.stringify(settings || {}), boardId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    res.json({
      success: true,
      message: 'Board updated successfully'
    });
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update board',
      error: error.message
    });
  }
};

/**
 * Delete a board
 */
export const deleteBoard = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { boardId } = req.params;

    // Get board info before deletion
    const [boardData] = await connection.execute(
      'SELECT project_id, name FROM kanban_boards WHERE id = ?',
      [boardId]
    );

    if (boardData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Board not found'
      });
    }

    // Delete board (cascade will handle related data)
    await connection.execute('DELETE FROM kanban_boards WHERE id = ?', [boardId]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Board deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting board:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete board',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Get board analytics
 */
export const getBoardAnalytics = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { timeframe = '30' } = req.query; // days

    const [analytics] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT kc.id) as total_cards,
        COUNT(DISTINCT CASE WHEN kcol.is_done_column = 1 THEN kc.id END) as completed_cards,
        AVG(CASE WHEN kc.completed_at IS NOT NULL 
            THEN TIMESTAMPDIFF(HOUR, kc.created_at, kc.completed_at) 
            END) as avg_completion_time_hours,
        COUNT(DISTINCT kc.assignee_id) as unique_assignees,
        SUM(COALESCE(kc.story_points, 0)) as total_story_points,
        SUM(CASE WHEN kcol.is_done_column = 1 
            THEN COALESCE(kc.story_points, 0) 
            ELSE 0 END) as completed_story_points
      FROM kanban_cards kc
      JOIN kanban_columns kcol ON kc.column_id = kcol.id
      WHERE kcol.board_id = ? 
      AND kc.status = 'ACTIVE'
      AND kc.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [boardId, timeframe]);

    res.json({
      success: true,
      analytics: analytics[0]
    });
  } catch (error) {
    console.error('Error fetching board analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch board analytics',
      error: error.message
    });
  }
};

export default {
  getProjectBoards,
  createBoard,
  getBoardColumns,
  createColumn,
  updateBoard,
  deleteBoard,
  getBoardAnalytics
};
