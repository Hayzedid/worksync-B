import { query, transaction } from '../config/postgresql.js';
import { cache } from '../config/redis.js';
import { validateUUID, sanitizeInput } from '../utils/validation.js';

/**
 * Kanban Cards Controller
 * Handles all Kanban card operations for Phase 3
 */

// Get cards for a column
export const getColumnCards = async (req, res) => {
  try {
    const { columnId } = req.params;

    const result = await query(
      `SELECT c.*, 
       json_build_object(
         'id', u.id,
         'name', u.name,
         'avatar_url', u.avatar_url
       ) as assignee,
       (SELECT COUNT(*) FROM card_comments WHERE card_id = c.id) as comment_count
       FROM kanban_cards c
       LEFT JOIN users u ON c.assignee_id = u.id
       WHERE c.column_id = $1
       ORDER BY c.position`,
      [columnId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get column cards error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch cards' 
    });
  }
};

// Create new card
export const createCard = async (req, res) => {
  try {
    const { columnId } = req.params;
    const { 
      title, 
      description, 
      priority, 
      due_date, 
      estimated_hours, 
      assignee_id, 
      labels 
    } = req.body;
    const userId = req.user.id;

    // Get next position
    const positionResult = await query(
      'SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM kanban_cards WHERE column_id = $1',
      [columnId]
    );

    const position = positionResult.rows[0].next_position;

    const result = await transaction(async (client) => {
      // Create card
      const cardResult = await client.query(
        `INSERT INTO kanban_cards (
          column_id, title, description, position, priority, due_date, 
          estimated_hours, assignee_id, created_by, labels, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *`,
        [
          columnId,
          sanitizeInput(title),
          sanitizeInput(description),
          position,
          priority || 'medium',
          due_date,
          estimated_hours,
          assignee_id,
          userId,
          JSON.stringify(labels || [])
        ]
      );

      const card = cardResult.rows[0];

      // Get board and project info for activity logging
      const boardResult = await client.query(
        `SELECT b.id as board_id, b.project_id, p.workspace_id
         FROM kanban_columns c
         JOIN kanban_boards b ON c.board_id = b.id
         JOIN projects p ON b.project_id = p.id
         WHERE c.id = $1`,
        [columnId]
      );

      const boardInfo = boardResult.rows[0];

      // Log activity
      await client.query(
        `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          boardInfo.workspace_id,
          userId,
          'kanban_card_created',
          'kanban_card',
          card.id,
          { cardTitle: title, columnId, boardId: boardInfo.board_id }
        ]
      );

      // Log card activity
      await client.query(
        `INSERT INTO card_activities (card_id, user_id, action, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [card.id, userId, 'created', { title }]
      );

      return { ...card, boardInfo };
    });

    // Clear board cache
    const boardResult = await query(
      'SELECT board_id FROM kanban_columns WHERE id = $1',
      [columnId]
    );

    if (boardResult.rows.length > 0) {
      await cache.del(`board:${boardResult.rows[0].board_id}:full`);
    }

    // Emit real-time event
    req.io?.to(`project:${result.boardInfo.project_id}`).emit('kanban:card:created', result);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create card' 
    });
  }
};

// Get single card with details
export const getCard = async (req, res) => {
  try {
    const { cardId } = req.params;

    const result = await query(
      `SELECT c.*, 
       json_build_object(
         'id', u.id,
         'name', u.name,
         'avatar_url', u.avatar_url
       ) as assignee,
       json_build_object(
         'id', creator.id,
         'name', creator.name,
         'avatar_url', creator.avatar_url
       ) as created_by_user,
       col.name as column_name,
       col.board_id,
       b.name as board_name,
       b.project_id
       FROM kanban_cards c
       LEFT JOIN users u ON c.assignee_id = u.id
       LEFT JOIN users creator ON c.created_by = creator.id
       LEFT JOIN kanban_columns col ON c.column_id = col.id
       LEFT JOIN kanban_boards b ON col.board_id = b.id
       WHERE c.id = $1`,
      [cardId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Card not found' 
      });
    }

    const card = result.rows[0];

    // Get card comments
    const commentsResult = await query(
      `SELECT cc.*, 
       json_build_object(
         'id', u.id,
         'name', u.name,
         'avatar_url', u.avatar_url
       ) as user
       FROM card_comments cc
       LEFT JOIN users u ON cc.user_id = u.id
       WHERE cc.card_id = $1
       ORDER BY cc.created_at`,
      [cardId]
    );

    // Get card activities
    const activitiesResult = await query(
      `SELECT ca.*, 
       json_build_object(
         'id', u.id,
         'name', u.name,
         'avatar_url', u.avatar_url
       ) as user
       FROM card_activities ca
       LEFT JOIN users u ON ca.user_id = u.id
       WHERE ca.card_id = $1
       ORDER BY ca.created_at DESC
       LIMIT 20`,
      [cardId]
    );

    const fullCard = {
      ...card,
      comments: commentsResult.rows,
      activities: activitiesResult.rows
    };

    res.json({
      success: true,
      data: fullCard
    });
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch card' 
    });
  }
};

// Update card
export const updateCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { 
      title, 
      description, 
      priority, 
      due_date, 
      estimated_hours, 
      actual_hours,
      assignee_id, 
      labels 
    } = req.body;
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Get current card data
      const currentResult = await client.query(
        'SELECT * FROM kanban_cards WHERE id = $1',
        [cardId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Card not found');
      }

      const currentCard = currentResult.rows[0];

      // Update card
      const cardResult = await client.query(
        `UPDATE kanban_cards 
         SET title = $1, description = $2, priority = $3, due_date = $4, 
             estimated_hours = $5, actual_hours = $6, assignee_id = $7, 
             labels = $8, updated_at = NOW()
         WHERE id = $9 RETURNING *`,
        [
          sanitizeInput(title),
          sanitizeInput(description),
          priority,
          due_date,
          estimated_hours,
          actual_hours,
          assignee_id,
          JSON.stringify(labels || []),
          cardId
        ]
      );

      const updatedCard = cardResult.rows[0];

      // Get board and project info
      const boardResult = await client.query(
        `SELECT b.id as board_id, b.project_id, p.workspace_id
         FROM kanban_columns c
         JOIN kanban_boards b ON c.board_id = b.id
         JOIN projects p ON b.project_id = p.id
         WHERE c.id = $1`,
        [updatedCard.column_id]
      );

      const boardInfo = boardResult.rows[0];

      // Track changes for activity log
      const changes = {};
      if (currentCard.title !== title) changes.title = { from: currentCard.title, to: title };
      if (currentCard.priority !== priority) changes.priority = { from: currentCard.priority, to: priority };
      if (currentCard.assignee_id !== assignee_id) changes.assignee = { from: currentCard.assignee_id, to: assignee_id };
      if (currentCard.due_date !== due_date) changes.due_date = { from: currentCard.due_date, to: due_date };

      // Log activity if there are changes
      if (Object.keys(changes).length > 0) {
        await client.query(
          `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [
            boardInfo.workspace_id,
            userId,
            'kanban_card_updated',
            'kanban_card',
            cardId,
            { cardTitle: title, changes }
          ]
        );

        await client.query(
          `INSERT INTO card_activities (card_id, user_id, action, details, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [cardId, userId, 'updated', changes]
        );
      }

      return { ...updatedCard, boardInfo };
    });

    // Clear board cache
    const boardResult = await query(
      'SELECT board_id FROM kanban_columns WHERE id = $1',
      [result.column_id]
    );

    if (boardResult.rows.length > 0) {
      await cache.del(`board:${boardResult.rows[0].board_id}:full`);
    }

    // Emit real-time event
    req.io?.to(`project:${result.boardInfo.project_id}`).emit('kanban:card:updated', result);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to update card' 
    });
  }
};

// Move card to different column
export const moveCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { target_column_id, target_position } = req.body;
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Get current card data
      const currentResult = await client.query(
        'SELECT * FROM kanban_cards WHERE id = $1',
        [cardId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Card not found');
      }

      const currentCard = currentResult.rows[0];
      const sourceColumnId = currentCard.column_id;

      // If moving within same column, just update position
      if (sourceColumnId === target_column_id) {
        // Update positions for cards in the same column
        if (target_position > currentCard.position) {
          // Moving down
          await client.query(
            `UPDATE kanban_cards 
             SET position = position - 1 
             WHERE column_id = $1 AND position > $2 AND position <= $3`,
            [sourceColumnId, currentCard.position, target_position]
          );
        } else {
          // Moving up
          await client.query(
            `UPDATE kanban_cards 
             SET position = position + 1 
             WHERE column_id = $1 AND position >= $2 AND position < $3`,
            [sourceColumnId, target_position, currentCard.position]
          );
        }

        // Update card position
        await client.query(
          'UPDATE kanban_cards SET position = $1, updated_at = NOW() WHERE id = $2',
          [target_position, cardId]
        );
      } else {
        // Moving to different column

        // Shift down cards in source column
        await client.query(
          `UPDATE kanban_cards 
           SET position = position - 1 
           WHERE column_id = $1 AND position > $2`,
          [sourceColumnId, currentCard.position]
        );

        // Shift up cards in target column
        await client.query(
          `UPDATE kanban_cards 
           SET position = position + 1 
           WHERE column_id = $1 AND position >= $2`,
          [target_column_id, target_position]
        );

        // Move card to new column and position
        await client.query(
          `UPDATE kanban_cards 
           SET column_id = $1, position = $2, updated_at = NOW() 
           WHERE id = $3`,
          [target_column_id, target_position, cardId]
        );

        // Check if target column is a "done" column
        const columnResult = await client.query(
          'SELECT is_done_column FROM kanban_columns WHERE id = $1',
          [target_column_id]
        );

        if (columnResult.rows[0]?.is_done_column && !currentCard.completed_at) {
          // Mark card as completed
          await client.query(
            'UPDATE kanban_cards SET completed_at = NOW() WHERE id = $1',
            [cardId]
          );
        } else if (!columnResult.rows[0]?.is_done_column && currentCard.completed_at) {
          // Unmark completion if moved out of done column
          await client.query(
            'UPDATE kanban_cards SET completed_at = NULL WHERE id = $1',
            [cardId]
          );
        }
      }

      // Get board and project info
      const boardResult = await client.query(
        `SELECT b.id as board_id, b.project_id, p.workspace_id,
         source_col.name as source_column, target_col.name as target_column
         FROM kanban_columns source_col
         JOIN kanban_boards b ON source_col.board_id = b.id
         JOIN projects p ON b.project_id = p.id
         JOIN kanban_columns target_col ON target_col.id = $2
         WHERE source_col.id = $1`,
        [sourceColumnId, target_column_id]
      );

      const boardInfo = boardResult.rows[0];

      // Log activity
      await client.query(
        `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          boardInfo.workspace_id,
          userId,
          'kanban_card_moved',
          'kanban_card',
          cardId,
          {
            cardTitle: currentCard.title,
            fromColumn: boardInfo.source_column,
            toColumn: boardInfo.target_column,
            position: target_position
          }
        ]
      );

      await client.query(
        `INSERT INTO card_activities (card_id, user_id, action, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          cardId,
          userId,
          'moved',
          {
            fromColumn: boardInfo.source_column,
            toColumn: boardInfo.target_column,
            position: target_position
          }
        ]
      );

      // Get updated card
      const updatedResult = await client.query(
        'SELECT * FROM kanban_cards WHERE id = $1',
        [cardId]
      );

      return { ...updatedResult.rows[0], boardInfo };
    });

    // Clear board cache
    const boardResult = await query(
      'SELECT DISTINCT board_id FROM kanban_columns WHERE id IN ($1, $2)',
      [result.column_id, req.body.target_column_id]
    );

    for (const board of boardResult.rows) {
      await cache.del(`board:${board.board_id}:full`);
    }

    // Emit real-time event
    req.io?.to(`project:${result.boardInfo.project_id}`).emit('kanban:card:moved', {
      cardId,
      sourceColumnId: req.body.source_column_id,
      targetColumnId: target_column_id,
      targetPosition: target_position
    });

    res.json({
      success: true,
      data: result,
      message: 'Card moved successfully'
    });
  } catch (error) {
    console.error('Move card error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to move card' 
    });
  }
};

// Delete card
export const deleteCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Get card details first
      const cardResult = await client.query(
        'SELECT * FROM kanban_cards WHERE id = $1',
        [cardId]
      );

      if (cardResult.rows.length === 0) {
        throw new Error('Card not found');
      }

      const card = cardResult.rows[0];

      // Get board and project info
      const boardResult = await client.query(
        `SELECT b.id as board_id, b.project_id, p.workspace_id
         FROM kanban_columns c
         JOIN kanban_boards b ON c.board_id = b.id
         JOIN projects p ON b.project_id = p.id
         WHERE c.id = $1`,
        [card.column_id]
      );

      const boardInfo = boardResult.rows[0];

      // Delete card (cascade will handle comments and activities)
      await client.query('DELETE FROM kanban_cards WHERE id = $1', [cardId]);

      // Reorder remaining cards in column
      await client.query(
        `UPDATE kanban_cards 
         SET position = position - 1 
         WHERE column_id = $1 AND position > $2`,
        [card.column_id, card.position]
      );

      // Log activity
      await client.query(
        `INSERT INTO activities (workspace_id, user_id, action, object_type, object_id, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          boardInfo.workspace_id,
          userId,
          'kanban_card_deleted',
          'kanban_card',
          cardId,
          { cardTitle: card.title }
        ]
      );

      return { ...card, boardInfo };
    });

    // Clear board cache
    const boardResult = await query(
      'SELECT board_id FROM kanban_columns WHERE id = $1',
      [result.column_id]
    );

    if (boardResult.rows.length > 0) {
      await cache.del(`board:${boardResult.rows[0].board_id}:full`);
    }

    // Emit real-time event
    req.io?.to(`project:${result.boardInfo.project_id}`).emit('kanban:card:deleted', { id: cardId });

    res.json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete card' 
    });
  }
};

// Add comment to card
export const addCardComment = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      // Create comment
      const commentResult = await client.query(
        `INSERT INTO card_comments (card_id, user_id, content, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
        [cardId, userId, sanitizeInput(content)]
      );

      const comment = commentResult.rows[0];

      // Get user info
      const userResult = await client.query(
        'SELECT id, name, avatar_url FROM users WHERE id = $1',
        [userId]
      );

      const user = userResult.rows[0];

      // Get board and project info
      const boardResult = await client.query(
        `SELECT b.id as board_id, b.project_id, p.workspace_id, c.title as card_title
         FROM kanban_cards c
         JOIN kanban_columns col ON c.column_id = col.id
         JOIN kanban_boards b ON col.board_id = b.id
         JOIN projects p ON b.project_id = p.id
         WHERE c.id = $1`,
        [cardId]
      );

      const boardInfo = boardResult.rows[0];

      // Log activity
      await client.query(
        `INSERT INTO card_activities (card_id, user_id, action, details, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [cardId, userId, 'commented', { content: content.substring(0, 100) }]
      );

      return { ...comment, user, boardInfo };
    });

    // Emit real-time event
    req.io?.to(`project:${result.boardInfo.project_id}`).emit('kanban:comment:created', result);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Add card comment error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add comment' 
    });
  }
};

// Get card activities
export const getCardActivities = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT ca.*, 
       json_build_object(
         'id', u.id,
         'name', u.name,
         'avatar_url', u.avatar_url
       ) as user
       FROM card_activities ca
       LEFT JOIN users u ON ca.user_id = u.id
       WHERE ca.card_id = $1
       ORDER BY ca.created_at DESC
       LIMIT $2 OFFSET $3`,
      [cardId, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: result.rows.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get card activities error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch activities' 
    });
  }
};
