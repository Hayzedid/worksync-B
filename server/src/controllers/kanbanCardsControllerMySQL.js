// =====================================================
// WorkSync Phase 3 - MySQL Kanban Cards Controller
// Enterprise-grade Kanban card management  
// Compatible with existing MySQL infrastructure
// =====================================================

import { pool } from '../config/database.js';

/**
 * Get all cards for a board
 */
export const getBoardCards = async (req, res) => {
  try {
    const { boardId } = req.params;

    const [cards] = await pool.execute(`
      SELECT 
        kc.*,
        u_assignee.username as assignee_username,
        u_assignee.first_name as assignee_first_name,
        u_assignee.last_name as assignee_last_name,
        u_reporter.username as reporter_username,
        kcol.name as column_name,
        (SELECT COUNT(*) FROM kanban_card_comments WHERE card_id = kc.id) as comment_count,
        (SELECT COUNT(*) FROM kanban_card_attachments WHERE card_id = kc.id) as attachment_count
      FROM kanban_cards kc
      JOIN kanban_columns kcol ON kc.column_id = kcol.id
      LEFT JOIN users u_assignee ON kc.assignee_id = u_assignee.id
      LEFT JOIN users u_reporter ON kc.reporter_id = u_reporter.id
      WHERE kcol.board_id = ? AND kc.status = 'ACTIVE'
      ORDER BY kcol.position ASC, kc.position ASC
    `, [boardId]);

    res.json({
      success: true,
      cards
    });
  } catch (error) {
    console.error('Error fetching board cards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cards',
      error: error.message
    });
  }
};

/**
 * Create a new card
 */
export const createCard = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { boardId } = req.params;
    const { 
      columnId,
      title, 
      description, 
      assigneeId, 
      priority = 'MEDIUM',
      storyPoints,
      estimatedHours,
      dueDate,
      labels = [],
      customFields = {}
    } = req.body;

    // Get next position in column
    const [positionResult] = await connection.execute(
      'SELECT COALESCE(MAX(position), -1) + 1 as next_position FROM kanban_cards WHERE column_id = ?',
      [columnId]
    );
    const position = positionResult[0].next_position;

    // Create card
    const [cardResult] = await connection.execute(`
      INSERT INTO kanban_cards (
        board_id, column_id, title, description, assignee_id, reporter_id,
        priority, story_points, estimated_hours, due_date, position, 
        labels, custom_fields
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      boardId, columnId, title, description, assigneeId, req.user.id,
      priority, storyPoints, estimatedHours, dueDate, position,
      JSON.stringify(labels), JSON.stringify(customFields)
    ]);

    const cardId = cardResult.insertId;

    // Log activity
    await connection.execute(`
      INSERT INTO kanban_card_activities (card_id, user_id, action, details)
      VALUES (?, ?, 'CREATED', ?)
    `, [cardId, req.user.id, JSON.stringify({ title, columnId })]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Card created successfully',
      card: {
        id: cardId,
        title,
        description,
        position,
        columnId,
        boardId
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create card',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Update card details
 */
export const updateCard = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { cardId } = req.params;
    const updates = req.body;

    // Get current card data for activity logging
    const [currentCard] = await connection.execute(
      'SELECT * FROM kanban_cards WHERE id = ?',
      [cardId]
    );

    if (currentCard.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const oldData = currentCard[0];

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'title', 'description', 'assignee_id', 'priority', 
      'story_points', 'estimated_hours', 'due_date', 
      'labels', 'custom_fields', 'blocked', 'blocked_reason'
    ];

    for (const field of allowedFields) {
      if (updates.hasOwnProperty(field)) {
        updateFields.push(`${field} = ?`);
        
        if (field === 'labels' || field === 'custom_fields') {
          updateValues.push(JSON.stringify(updates[field]));
        } else {
          updateValues.push(updates[field]);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(cardId);

    // Update card
    await connection.execute(
      `UPDATE kanban_cards SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Log activity
    await connection.execute(`
      INSERT INTO kanban_card_activities (card_id, user_id, action, old_values, new_values)
      VALUES (?, ?, 'UPDATED', ?, ?)
    `, [
      cardId, 
      req.user.id, 
      JSON.stringify(oldData), 
      JSON.stringify(updates)
    ]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Card updated successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update card',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Move card to different column (drag and drop)
 */
export const moveCard = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { cardId } = req.params;
    const { columnId, position } = req.body;

    // Get current card data
    const [currentCard] = await connection.execute(
      'SELECT column_id, position, title FROM kanban_cards WHERE id = ?',
      [cardId]
    );

    if (currentCard.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    const oldColumnId = currentCard[0].column_id;
    const oldPosition = currentCard[0].position;

    // If moving to different column, check if it's a done column
    let completedAt = null;
    const [columnInfo] = await connection.execute(
      'SELECT is_done_column FROM kanban_columns WHERE id = ?',
      [columnId]
    );

    if (columnInfo.length > 0 && columnInfo[0].is_done_column) {
      completedAt = new Date();
    }

    // Update positions in old column (if moving between columns)
    if (oldColumnId !== columnId) {
      await connection.execute(
        'UPDATE kanban_cards SET position = position - 1 WHERE column_id = ? AND position > ?',
        [oldColumnId, oldPosition]
      );
    }

    // Update positions in new column
    await connection.execute(
      'UPDATE kanban_cards SET position = position + 1 WHERE column_id = ? AND position >= ?',
      [columnId, position]
    );

    // Move the card
    const updateQuery = completedAt
      ? 'UPDATE kanban_cards SET column_id = ?, position = ?, completed_at = ?, updated_at = NOW() WHERE id = ?'
      : 'UPDATE kanban_cards SET column_id = ?, position = ?, updated_at = NOW() WHERE id = ?';
    
    const updateValues = completedAt
      ? [columnId, position, completedAt, cardId]
      : [columnId, position, cardId];

    await connection.execute(updateQuery, updateValues);

    // Log activity
    await connection.execute(`
      INSERT INTO kanban_card_activities (card_id, user_id, action, details)
      VALUES (?, ?, 'MOVED', ?)
    `, [cardId, req.user.id, JSON.stringify({
      from_column: oldColumnId,
      to_column: columnId,
      from_position: oldPosition,
      to_position: position,
      completed: !!completedAt
    })]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Card moved successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error moving card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to move card',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Delete a card
 */
export const deleteCard = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { cardId } = req.params;

    // Get card info before deletion
    const [cardData] = await connection.execute(
      'SELECT title, column_id, position FROM kanban_cards WHERE id = ?',
      [cardId]
    );

    if (cardData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Card not found'
      });
    }

    // Soft delete (mark as deleted)
    await connection.execute(
      'UPDATE kanban_cards SET status = "DELETED", updated_at = NOW() WHERE id = ?',
      [cardId]
    );

    // Update positions of cards below this one
    await connection.execute(
      'UPDATE kanban_cards SET position = position - 1 WHERE column_id = ? AND position > ? AND status = "ACTIVE"',
      [cardData[0].column_id, cardData[0].position]
    );

    // Log activity
    await connection.execute(`
      INSERT INTO kanban_card_activities (card_id, user_id, action, details)
      VALUES (?, ?, 'ARCHIVED', ?)
    `, [cardId, req.user.id, JSON.stringify({ title: cardData[0].title })]);

    await connection.commit();

    res.json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error deleting card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete card',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * Add comment to card
 */
export const addComment = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { content } = req.body;

    const [result] = await pool.execute(`
      INSERT INTO kanban_card_comments (card_id, user_id, content)
      VALUES (?, ?, ?)
    `, [cardId, req.user.id, content]);

    // Log activity
    await pool.execute(`
      INSERT INTO kanban_card_activities (card_id, user_id, action, details)
      VALUES (?, ?, 'COMMENTED', ?)
    `, [cardId, req.user.id, JSON.stringify({ commentId: result.insertId })]);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: {
        id: result.insertId,
        content,
        userId: req.user.id,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
};

/**
 * Get card activities
 */
export const getCardActivities = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { limit = 50 } = req.query;

    const [activities] = await pool.execute(`
      SELECT 
        kca.*,
        u.username,
        u.first_name,
        u.last_name
      FROM kanban_card_activities kca
      JOIN users u ON kca.user_id = u.id
      WHERE kca.card_id = ?
      ORDER BY kca.created_at DESC
      LIMIT ?
    `, [cardId, parseInt(limit)]);

    res.json({
      success: true,
      activities
    });
  } catch (error) {
    console.error('Error fetching card activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: error.message
    });
  }
};

export default {
  getBoardCards,
  createCard,
  updateCard,
  moveCard,
  deleteCard,
  addComment,
  getCardActivities
};
