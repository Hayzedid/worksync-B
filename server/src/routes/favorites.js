import express from 'express';
import { pool } from '../config/database.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Get all favorites for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, limit = 50 } = req.query;

    let query = `
      SELECT * FROM favorites 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (type) {
      query += ` AND item_type = ?`;
      params.push(type);
    }

    query += ` ORDER BY updated_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [favorites] = await pool.execute(query, params);
    
    // Parse JSON metadata
    const formattedFavorites = favorites.map(favorite => ({
      ...favorite,
      metadata: favorite.metadata ? JSON.parse(favorite.metadata) : null
    }));

    res.json(formattedFavorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add item to favorites
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

    const [result] = await pool.execute(`
      INSERT INTO favorites (user_id, item_id, item_type, title, description, url, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
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
      metadata ? JSON.stringify(metadata) : null
    ]);

    // Fetch the created/updated favorite
    const [favorites] = await pool.execute(`
      SELECT * FROM favorites 
      WHERE user_id = ? AND item_id = ? AND item_type = ?
    `, [userId, item_id, item_type]);

    const favorite = favorites[0];
    const formattedFavorite = {
      ...favorite,
      metadata: favorite.metadata ? JSON.parse(favorite.metadata) : null
    };

    res.status(201).json(formattedFavorite);
  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Remove item from favorites
router.delete('/:type/:itemId', authenticateToken, async (req, res) => {
  try {
    const { type, itemId } = req.params;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      DELETE FROM favorites 
      WHERE user_id = ? AND item_id = ? AND item_type = ?
    `, [userId, itemId, type]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    res.json({ message: 'Removed from favorites successfully' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

// Check if item is favorited
router.get('/check/:type/:itemId', authenticateToken, async (req, res) => {
  try {
    const { type, itemId } = req.params;
    const userId = req.user.id;

    const [favorites] = await pool.execute(`
      SELECT id FROM favorites 
      WHERE user_id = ? AND item_id = ? AND item_type = ?
    `, [userId, itemId, type]);

    res.json({ isFavorited: favorites.length > 0 });
  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
});

// Update favorite metadata
router.patch('/:type/:itemId', authenticateToken, async (req, res) => {
  try {
    const { type, itemId } = req.params;
    const { metadata } = req.body;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      UPDATE favorites 
      SET metadata = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND item_id = ? AND item_type = ?
    `, [
      metadata ? JSON.stringify(metadata) : null,
      userId,
      itemId,
      type
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    res.json({ message: 'Favorite metadata updated successfully' });
  } catch (error) {
    console.error('Error updating favorite metadata:', error);
    res.status(500).json({ error: 'Failed to update favorite metadata' });
  }
});

// Clear all favorites
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.execute('DELETE FROM favorites WHERE user_id = ?', [userId]);
    res.json({ message: 'All favorites cleared successfully' });
  } catch (error) {
    console.error('Error clearing favorites:', error);
    res.status(500).json({ error: 'Failed to clear favorites' });
  }
});

// Get favorites by type with pagination
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    const [favorites] = await pool.execute(`
      SELECT * FROM favorites 
      WHERE user_id = ? AND item_type = ?
      ORDER BY updated_at DESC 
      LIMIT ? OFFSET ?
    `, [userId, type, parseInt(limit), offset]);

    const [countResult] = await pool.execute(`
      SELECT COUNT(*) as total FROM favorites 
      WHERE user_id = ? AND item_type = ?
    `, [userId, type]);

    const formattedFavorites = favorites.map(favorite => ({
      ...favorite,
      metadata: favorite.metadata ? JSON.parse(favorite.metadata) : null
    }));

    res.json({
      favorites: formattedFavorites,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult[0].total / limit)
    });
  } catch (error) {
    console.error('Error fetching favorites by type:', error);
    res.status(500).json({ error: 'Failed to fetch favorites by type' });
  }
});

export default router;
