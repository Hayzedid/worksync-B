import { pool } from '../config/database.js';
import { cache } from '../config/redis.js';
import { sanitizeInput } from '../utils/validation.js';

/**
 * Kanban Board Controller
 * Handles all Kanban board operations for Phase 3
 */

// Get all boards for a project
export const getProjectBoards = async (req, res) => {
  try {
    const { projectId } = req.params;
    const cacheKey = `project:${projectId}:boards`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    const [result] = await pool.execute(
      `SELECT b.*, 
       (SELECT COUNT(*) FROM kanban_columns WHERE board_id = b.id) as column_count,
       (SELECT COUNT(*) FROM kanban_cards c 
        JOIN kanban_columns col ON c.column_id = col.id 
        WHERE col.board_id = b.id) as card_count
       FROM kanban_boards b 
       WHERE b.project_id = ? 
       ORDER BY b.created_at`,
      [projectId]
    );

    // Cache for 5 minutes
    await cache.set(cacheKey, result, 300);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get project boards error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch boards' 
    });
  }
};

// Create new board
export const createBoard = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, settings } = req.body;
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Create board
      const boardResult = await client.query(
        `INSERT INTO kanban_boards (project_id, name, description, settings, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
        [projectId, sanitizeInput(name), sanitizeInput(description), settings || {}]
      );

      const board = boardResult.rows[0];

      // Create default columns
      const defaultColumns = [
        { name: 'Backlog', position: 1, color: '#6c757d' },
        { name: 'To Do', position: 2, color: '#007bff' },
        { name: 'In Progress', position: 3, color: '#ffc107' },
        { name: 'Review', position: 4, color: '#17a2b8' },
        { name: 'Done', position: 5, color: '#28a745', is_done: true }
      ];

      const columns = [];
      for (const col of defaultColumns) {
        const columnResult = await client.query(
          `INSERT INTO kanban_columns (board_id, name, position, color, is_done_column, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
          [board.id, col.name, col.position, col.color, col.is_done || false]
        );
        columns.push(columnResult.rows[0]);
      }

      // Log activity
      await client.query(
        `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
         VALUES ((SELECT workspace_id FROM projects WHERE id = $1), $2, $3, $4, $5, $6, NOW())`,
        [projectId, userId, 'kanban_board_created', 'kanban_board', board.id, { boardName: name }]
      );

      return { ...board, columns };
    });

    // Clear cache
    await cache.del(`project:${projectId}:boards`);

    // Emit real-time event
    req.io?.to(`project:${projectId}`).emit('kanban:board:created', result);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create board' 
    });
  }
};

// Get board with columns and cards
export const getBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const cacheKey = `board:${boardId}:full`;

    // Check cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached });
    }

    // Get board details
    const boardResult = await query(
      'SELECT * FROM kanban_boards WHERE id = $1',
      [boardId]
    );

    if (boardResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Board not found' 
      });
    }

    const board = boardResult.rows[0];

    // Get columns with cards
    const columnsResult = await query(
      `SELECT c.*, 
       COALESCE(
         json_agg(
           json_build_object(
             'id', card.id,
             'title', card.title,
             'description', card.description,
             'position', card.position,
             'priority', card.priority,
             'due_date', card.due_date,
             'estimated_hours', card.estimated_hours,
             'actual_hours', card.actual_hours,
             'labels', card.labels,
             'assignee', json_build_object(
               'id', u.id,
               'name', u.name,
               'avatar_url', u.avatar_url
             ),
             'created_at', card.created_at,
             'updated_at', card.updated_at
           ) ORDER BY card.position
         ) FILTER (WHERE card.id IS NOT NULL), 
         '[]'
       ) as cards
       FROM kanban_columns c
       LEFT JOIN kanban_cards card ON card.column_id = c.id
       LEFT JOIN users u ON card.assignee_id = u.id
       WHERE c.board_id = $1
       GROUP BY c.id
       ORDER BY c.position`,
      [boardId]
    );

    const fullBoard = {
      ...board,
      columns: columnsResult.rows
    };

    // Cache for 2 minutes
    await cache.set(cacheKey, fullBoard, 120);

    res.json({
      success: true,
      data: fullBoard
    });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch board' 
    });
  }
};

// Update board
export const updateBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name, description, settings } = req.body;
    const userId = req.user.id;

    const result = await query(
      `UPDATE kanban_boards 
       SET name = $1, description = $2, settings = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [sanitizeInput(name), sanitizeInput(description), settings, boardId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Board not found' 
      });
    }

    const board = result.rows[0];

    // Clear caches
    await cache.del(`board:${boardId}:full`);
    await cache.del(`project:${board.project_id}:boards`);

    // Log activity
    await query(
      `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
       VALUES ((SELECT workspace_id FROM projects WHERE id = $1), $2, $3, $4, $5, $6, NOW())`,
      [board.project_id, userId, 'kanban_board_updated', 'kanban_board', boardId, { boardName: name }]
    );

    // Emit real-time event
    req.io?.to(`project:${board.project_id}`).emit('kanban:board:updated', board);

    res.json({
      success: true,
      data: board
    });
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update board' 
    });
  }
};

// Delete board
export const deleteBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Get board details first
      const boardResult = await client.query(
        'SELECT * FROM kanban_boards WHERE id = $1',
        [boardId]
      );

      if (boardResult.rows.length === 0) {
        throw new Error('Board not found');
      }

      const board = boardResult.rows[0];

      // Delete board (cascade will handle columns and cards)
      await client.query('DELETE FROM kanban_boards WHERE id = $1', [boardId]);

      // Log activity
      await client.query(
        `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
         VALUES ((SELECT workspace_id FROM projects WHERE id = $1), $2, $3, $4, $5, $6, NOW())`,
        [board.project_id, userId, 'kanban_board_deleted', 'kanban_board', boardId, { boardName: board.name }]
      );

      return board;
    });

    // Clear caches
    await cache.del(`board:${boardId}:full`);
    await cache.del(`project:${result.project_id}:boards`);

    // Emit real-time event
    req.io?.to(`project:${result.project_id}`).emit('kanban:board:deleted', { id: boardId });

    res.json({
      success: true,
      message: 'Board deleted successfully'
    });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete board' 
    });
  }
};

// Create column
export const createColumn = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { name, color, wip_limit } = req.body;
    const userId = req.user.id;

    // Get next position
    const positionResult = await query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM kanban_columns WHERE board_id = $1',
      [boardId]
    );

    const position = positionResult.rows[0].next_position;

    const result = await query(
      `INSERT INTO kanban_columns (board_id, name, position, color, wip_limit, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
      [boardId, sanitizeInput(name), position, color || '#007bff', wip_limit]
    );

    const column = result.rows[0];

    // Clear cache
    await cache.del(`board:${boardId}:full`);

    // Log activity
    await query(
      `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
       VALUES ((SELECT workspace_id FROM projects p JOIN kanban_boards b ON p.id = b.project_id WHERE b.id = $1), $2, $3, $4, $5, $6, NOW())`,
      [boardId, userId, 'kanban_column_created', 'kanban_column', column.id, { columnName: name }]
    );

    // Get project ID for real-time event
    const projectResult = await query(
      'SELECT project_id FROM kanban_boards WHERE id = $1',
      [boardId]
    );

    if (projectResult.rows.length > 0) {
      req.io?.to(`project:${projectResult.rows[0].project_id}`).emit('kanban:column:created', column);
    }

    res.status(201).json({
      success: true,
      data: column
    });
  } catch (error) {
    console.error('Create column error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create column' 
    });
  }
};

// Update column
export const updateColumn = async (req, res) => {
  try {
    const { columnId } = req.params;
    const { name, color, wip_limit, is_done_column } = req.body;
    const userId = req.user.id;

    const result = await query(
      `UPDATE kanban_columns 
       SET name = $1, color = $2, wip_limit = $3, is_done_column = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [sanitizeInput(name), color, wip_limit, is_done_column, columnId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Column not found' 
      });
    }

    const column = result.rows[0];

    // Clear cache
    await cache.del(`board:${column.board_id}:full`);

    // Log activity
    await query(
      `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
       VALUES ((SELECT workspace_id FROM projects p JOIN kanban_boards b ON p.id = b.project_id WHERE b.id = $1), $2, $3, $4, $5, $6, NOW())`,
      [column.board_id, userId, 'kanban_column_updated', 'kanban_column', columnId, { columnName: name }]
    );

    // Get project ID for real-time event
    const projectResult = await query(
      'SELECT project_id FROM kanban_boards WHERE id = $1',
      [column.board_id]
    );

    if (projectResult.rows.length > 0) {
      req.io?.to(`project:${projectResult.rows[0].project_id}`).emit('kanban:column:updated', column);
    }

    res.json({
      success: true,
      data: column
    });
  } catch (error) {
    console.error('Update column error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update column' 
    });
  }
};

// Delete column
export const deleteColumn = async (req, res) => {
  try {
    const { columnId } = req.params;
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Get column details first
      const columnResult = await client.query(
        'SELECT * FROM kanban_columns WHERE id = $1',
        [columnId]
      );

      if (columnResult.rows.length === 0) {
        throw new Error('Column not found');
      }

      const column = columnResult.rows[0];

      // Check if column has cards
      const cardsResult = await client.query(
        'SELECT COUNT(*) as count FROM kanban_cards WHERE column_id = $1',
        [columnId]
      );

      if (parseInt(cardsResult.rows[0].count) > 0) {
        throw new Error('Cannot delete column with cards. Move cards first.');
      }

      // Delete column
      await client.query('DELETE FROM kanban_columns WHERE id = $1', [columnId]);

      // Reorder remaining columns
      await client.query(
        `UPDATE kanban_columns 
         SET position = position - 1 
         WHERE board_id = $1 AND position > $2`,
        [column.board_id, column.position]
      );

      // Log activity
      await client.query(
        `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
         VALUES ((SELECT workspace_id FROM projects p JOIN kanban_boards b ON p.id = b.project_id WHERE b.id = $1), $2, $3, $4, $5, $6, NOW())`,
        [column.board_id, userId, 'kanban_column_deleted', 'kanban_column', columnId, { columnName: column.name }]
      );

      return column;
    });

    // Clear cache
    await cache.del(`board:${result.board_id}:full`);

    // Get project ID for real-time event
    const projectResult = await query(
      'SELECT project_id FROM kanban_boards WHERE id = $1',
      [result.board_id]
    );

    if (projectResult.rows.length > 0) {
      req.io?.to(`project:${projectResult.rows[0].project_id}`).emit('kanban:column:deleted', { id: columnId });
    }

    res.json({
      success: true,
      message: 'Column deleted successfully'
    });
  } catch (error) {
    console.error('Delete column error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete column' 
    });
  }
};

// Update column positions
export const updateColumnPositions = async (req, res) => {
  try {
    const { boardId } = req.params;
    const { columns } = req.body; // Array of { id, position }
    const userId = req.user.id;

    await transaction(async (client) => {
      for (const col of columns) {
        await client.query(
          'UPDATE kanban_columns SET position = $1, updated_at = NOW() WHERE id = $2 AND board_id = $3',
          [col.position, col.id, boardId]
        );
      }

      // Log activity
      await client.query(
        `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
         VALUES ((SELECT workspace_id FROM projects p JOIN kanban_boards b ON p.id = b.project_id WHERE b.id = $1), $2, $3, $4, $5, $6, NOW())`,
        [boardId, userId, 'kanban_columns_reordered', 'kanban_board', boardId, { columnCount: columns.length }]
      );
    });

    // Clear cache
    await cache.del(`board:${boardId}:full`);

    // Get project ID for real-time event
    const projectResult = await query(
      'SELECT project_id FROM kanban_boards WHERE id = $1',
      [boardId]
    );

    if (projectResult.rows.length > 0) {
      req.io?.to(`project:${projectResult.rows[0].project_id}`).emit('kanban:columns:reordered', { boardId, columns });
    }

    res.json({
      success: true,
      message: 'Column positions updated'
    });
  } catch (error) {
    console.error('Update column positions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update column positions' 
    });
  }
};
