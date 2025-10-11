import express from 'express';
import { pool } from '../config/database.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Get all pinned items for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const [pinnedItems] = await pool.execute(`
      SELECT * FROM pinned_items 
      WHERE user_id = ?
      ORDER BY order_position ASC, created_at DESC
      LIMIT ?
    `, [userId, parseInt(limit)]);
    
    // Parse JSON metadata
    const formattedItems = pinnedItems.map(item => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching pinned items:', error);
    res.status(500).json({ error: 'Failed to fetch pinned items' });
  }
});

// Pin an item
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      item_id,
      item_type,
      title,
      description,
      url,
      metadata
    } = req.body;
    const userId = req.user.id;

    // Get the next order position
    const [maxOrder] = await pool.execute(`
      SELECT COALESCE(MAX(order_position), -1) + 1 as next_order 
      FROM pinned_items WHERE user_id = ?
    `, [userId]);

    const orderPosition = maxOrder[0].next_order;

    const [result] = await pool.execute(`
      INSERT INTO pinned_items (
        user_id, item_id, item_type, title, description, url, metadata, order_position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        title = VALUES(title),
        description = VALUES(description),
        url = VALUES(url),
        metadata = VALUES(metadata),
        updated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      item_id,
      item_type,
      title,
      description,
      url,
      metadata ? JSON.stringify(metadata) : null,
      orderPosition
    ]);

    // Fetch the created/updated pinned item
    const [pinnedItems] = await pool.execute(`
      SELECT * FROM pinned_items 
      WHERE user_id = ? AND item_id = ? AND item_type = ?
    `, [userId, item_id, item_type]);

    const pinnedItem = pinnedItems[0];
    const formattedItem = {
      ...pinnedItem,
      metadata: pinnedItem.metadata ? JSON.parse(pinnedItem.metadata) : null
    };

    res.status(201).json(formattedItem);
  } catch (error) {
    console.error('Error pinning item:', error);
    res.status(500).json({ error: 'Failed to pin item' });
  }
});

// Unpin an item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      DELETE FROM pinned_items 
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pinned item not found' });
    }

    res.json({ message: 'Item unpinned successfully' });
  } catch (error) {
    console.error('Error unpinning item:', error);
    res.status(500).json({ error: 'Failed to unpin item' });
  }
});

// Reorder pinned items
router.put('/reorder', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, order }
    const userId = req.user.id;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      for (const item of items) {
        await connection.execute(`
          UPDATE pinned_items 
          SET order_position = ? 
          WHERE id = ? AND user_id = ?
        `, [item.order, item.id, userId]);
      }

      await connection.commit();
      res.json({ message: 'Pinned items reordered successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error reordering pinned items:', error);
    res.status(500).json({ error: 'Failed to reorder pinned items' });
  }
});

// Check if item is pinned
router.get('/check/:type/:itemId', authenticateToken, async (req, res) => {
  try {
    const { type, itemId } = req.params;
    const userId = req.user.id;

    const [pinnedItems] = await pool.execute(`
      SELECT id FROM pinned_items 
      WHERE user_id = ? AND item_id = ? AND item_type = ?
    `, [userId, itemId, type]);

    res.json({ isPinned: pinnedItems.length > 0 });
  } catch (error) {
    console.error('Error checking pinned status:', error);
    res.status(500).json({ error: 'Failed to check pinned status' });
  }
});

// Update pinned item metadata
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, metadata } = req.body;
    const userId = req.user.id;

    const updateFields = [];
    const params = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      params.push(description);
    }
    if (metadata !== undefined) {
      updateFields.push('metadata = ?');
      params.push(metadata ? JSON.stringify(metadata) : null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id, userId);

    const [result] = await pool.execute(`
      UPDATE pinned_items 
      SET ${updateFields.join(', ')}
      WHERE id = ? AND user_id = ?
    `, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pinned item not found' });
    }

    res.json({ message: 'Pinned item updated successfully' });
  } catch (error) {
    console.error('Error updating pinned item:', error);
    res.status(500).json({ error: 'Failed to update pinned item' });
  }
});

// Get pinned items by type
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;

    const [pinnedItems] = await pool.execute(`
      SELECT * FROM pinned_items 
      WHERE user_id = ? AND item_type = ?
      ORDER BY order_position ASC, created_at DESC
    `, [userId, type]);

    const formattedItems = pinnedItems.map(item => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching pinned items by type:', error);
    res.status(500).json({ error: 'Failed to fetch pinned items by type' });
  }
});

// Clear all pinned items
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.execute('DELETE FROM pinned_items WHERE user_id = ?', [userId]);
    res.json({ message: 'All pinned items cleared successfully' });
  } catch (error) {
    console.error('Error clearing pinned items:', error);
    res.status(500).json({ error: 'Failed to clear pinned items' });
  }
});

export default router;
