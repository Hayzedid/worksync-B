// Phase 2 Comments API Controller
import { pool } from '../config/database.js';
// GET /api/comments - Return all comments
export const getAllComments = async (req, res, next) => {
  try {
    const [comments] = await pool.execute('SELECT * FROM comments ORDER BY created_at DESC');
    res.json({ success: true, comments });
  } catch (err) {
    next(err);
  }
};

// Get comments for an item
export const getItemComments = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

  const [comments] = await pool.execute(`
      SELECT 
        c.*,
        u.username,
        u.first_name,
        u.last_name,
        u.profile_picture,
        COUNT(cr.id) as reaction_count
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN comment_reactions cr ON c.id = cr.comment_id
      WHERE c.entity_type = ? AND c.entity_id = ?
      GROUP BY c.id
      ORDER BY c.created_at ASC
      LIMIT ? OFFSET ?
    `, [itemType, itemId, parseInt(limit), parseInt(offset)]);

    // Get reactions for each comment
    for (const comment of comments) {
  const [reactions] = await pool.execute(`
        SELECT emoji, COUNT(*) as count, 
        GROUP_CONCAT(u.username) as users
        FROM comment_reactions cr
        JOIN users u ON cr.user_id = u.id
        WHERE cr.comment_id = ?
        GROUP BY emoji
      `, [comment.id]);
      
      comment.reactions = reactions;
    }

    res.json({
      success: true,
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: comments.length
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
};

// Create new comment
export const createComment = async (req, res) => {
  try {
    const { content, itemType, itemId, parentId = null } = req.body;
    const userId = req.user.id;

    if (!content || !itemType || !itemId) {
      return res.status(400).json({
        success: false,
        message: 'Content, itemType, and itemId are required'
      });
    }

  const [result] = await pool.execute(`
      INSERT INTO comments (content, entity_type, entity_id, user_id, parent_id)
      VALUES (?, ?, ?, ?, ?)
    `, [content, itemType, itemId, userId, parentId]);

    // Get the created comment with user info
  const [commentRows] = await pool.execute(`
      SELECT c.*, u.username, u.first_name, u.last_name, u.profile_picture
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      comment: commentRows[0]
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create comment' });
  }
};

// Update comment
export const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Verify ownership
  const [commentRows] = await pool.execute(
      'SELECT * FROM comments WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (commentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found or permission denied'
      });
    }

  await pool.execute(
      'UPDATE comments SET content = ?, updated_at = NOW() WHERE id = ?',
      [content, id]
    );

    res.json({
      success: true,
      message: 'Comment updated successfully'
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to update comment' });
  }
};

// Delete comment
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify ownership
  const [commentRows] = await pool.execute(
      'SELECT * FROM comments WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (commentRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found or permission denied'
      });
    }

  await pool.execute('DELETE FROM comments WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
};

// Add/remove comment reaction
export const toggleCommentReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    // Check if reaction exists
  const [existingReaction] = await pool.execute(
      'SELECT id FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND emoji = ?',
      [id, userId, emoji]
    );

    let action = 'add';
    if (existingReaction.length > 0) {
      // Remove reaction
  await pool.execute(
        'DELETE FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND emoji = ?',
        [id, userId, emoji]
      );
      action = 'remove';
    } else {
      // Add reaction
  await pool.execute(
        'INSERT INTO comment_reactions (comment_id, user_id, emoji) VALUES (?, ?, ?)',
        [id, userId, emoji]
      );
    }

    // Get updated reaction counts
  const [reactions] = await pool.execute(`
      SELECT emoji, COUNT(*) as count
      FROM comment_reactions
      WHERE comment_id = ?
      GROUP BY emoji
    `, [id]);

    res.json({
      success: true,
      action,
      reactions
    });
  } catch (error) {
    console.error('Toggle reaction error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle reaction' });
  }
};
