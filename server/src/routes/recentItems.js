import express from 'express';
import { pool } from '../config/database.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Get recent items for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit = 20, days = 30 } = req.query;

    let query = `
      SELECT * FROM recent_items 
      WHERE user_id = ? AND accessed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const params = [userId, parseInt(days)];

    if (type) {
      query += ` AND item_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY accessed_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [recentItems] = await pool.execute(query, params);
    
    // Parse JSON metadata
    const formattedItems = recentItems.map(item => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching recent items:', error);
    res.status(500).json({ error: 'Failed to fetch recent items' });
  }
});

// Add or update recent item access
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      item_id,
      item_type,
      title,
      url,
      metadata
    } = req.body;
    const userId = req.user.id;

    await pool.execute(`
      INSERT INTO recent_items (user_id, item_id, item_type, title, url, metadata, accessed_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
        title = VALUES(title),
        url = VALUES(url),
        metadata = VALUES(metadata),
        accessed_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      item_id,
      item_type,
      title,
      url,
      metadata ? JSON.stringify(metadata) : null
    ]);

    // Clean up old entries (keep only last 100 per user)
    await pool.execute(`
      DELETE FROM recent_items 
      WHERE user_id = ? AND id NOT IN (
        SELECT id FROM (
          SELECT id FROM recent_items 
          WHERE user_id = ? 
          ORDER BY accessed_at DESC 
          LIMIT 100
        ) as recent_subset
      )
    `, [userId, userId]);

    res.json({ message: 'Recent item updated successfully' });
  } catch (error) {
    console.error('Error updating recent item:', error);
    res.status(500).json({ error: 'Failed to update recent item' });
  }
});

// Remove item from recent items
router.delete('/:type/:itemId', authenticateToken, async (req, res) => {
  try {
    const { type, itemId } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      DELETE FROM recent_items 
      WHERE user_id = ? AND item_id = ? AND item_type = ?
    `, [userId, itemId, type]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Recent item not found' });
    }

    res.json({ message: 'Removed from recent items successfully' });
  } catch (error) {
    console.error('Error removing from recent items:', error);
    res.status(500).json({ error: 'Failed to remove from recent items' });
  }
});

// Get recent items by type
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 10, days = 30 } = req.query;
    const userId = req.user.id;

    const [recentItems] = await pool.execute(`
      SELECT * FROM recent_items 
      WHERE user_id = ? AND item_type = ? AND accessed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY accessed_at DESC 
      LIMIT ?
    `, [userId, type, parseInt(days), parseInt(limit)]);

    const formattedItems = recentItems.map(item => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null
    }));

    res.json(formattedItems);
  } catch (error) {
    console.error('Error fetching recent items by type:', error);
    res.status(500).json({ error: 'Failed to fetch recent items by type' });
  }
});

// Clear recent items
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, olderThan } = req.query;

    let query = 'DELETE FROM recent_items WHERE user_id = ?';
    const params = [userId];

    if (type) {
      query += ' AND item_type = ?';
      params.push(type);
    }

    if (olderThan) {
      query += ' AND accessed_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
      params.push(parseInt(olderThan));
    }

    await pool.execute(query, params);
    res.json({ message: 'Recent items cleared successfully' });
  } catch (error) {
    console.error('Error clearing recent items:', error);
    res.status(500).json({ error: 'Failed to clear recent items' });
  }
});

// Get recent items statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [stats] = await pool.execute(`
      SELECT 
        item_type,
        COUNT(*) as count,
        MAX(accessed_at) as last_accessed
      FROM recent_items 
      WHERE user_id = ? AND accessed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY item_type
      ORDER BY count DESC
    `, [userId]);

    const [totalCount] = await pool.execute(`
      SELECT COUNT(*) as total 
      FROM recent_items 
      WHERE user_id = ? AND accessed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [userId]);

    res.json({
      total: totalCount[0].total,
      byType: stats
    });
  } catch (error) {
    console.error('Error fetching recent items stats:', error);
    res.status(500).json({ error: 'Failed to fetch recent items stats' });
  }
});

// Update recent item metadata
router.patch('/:type/:itemId', authenticateToken, async (req, res) => {
  try {
    const { type, itemId } = req.params;
    const { metadata } = req.body;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      UPDATE recent_items 
      SET metadata = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND item_id = ? AND item_type = ?
    `, [
      metadata ? JSON.stringify(metadata) : null,
      userId,
      itemId,
      type
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Recent item not found' });
    }

    res.json({ message: 'Recent item metadata updated successfully' });
  } catch (error) {
    console.error('Error updating recent item metadata:', error);
    res.status(500).json({ error: 'Failed to update recent item metadata' });
  }
});

export default router;
