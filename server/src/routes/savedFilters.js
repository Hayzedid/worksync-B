import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all saved filters for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { filterType, workspaceId } = req.query;

    let query = `
      SELECT sf.*, u.first_name, u.last_name 
      FROM saved_filters sf
      LEFT JOIN users u ON sf.user_id = u.id
      WHERE sf.user_id = ?
    `;
    const params = [userId];

    if (filterType) {
      query += ` AND sf.filter_type = ?`;
      params.push(filterType);
    }

    if (workspaceId) {
      query += ` AND (sf.workspace_id = ? OR sf.workspace_id IS NULL)`;
      params.push(workspaceId);
    }

    query += ` ORDER BY sf.is_default DESC, sf.created_at DESC`;

    const [filters] = await pool.execute(query, params);
    
    // Parse JSON filter_config
    const formattedFilters = filters.map(filter => ({
      ...filter,
      filter_config: filter.filter_config ? JSON.parse(filter.filter_config) : {}
    }));

    res.json(formattedFilters);
  } catch (error) {
    console.error('Error fetching saved filters:', error);
    res.status(500).json({ error: 'Failed to fetch saved filters' });
  }
});

// Create a new saved filter
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      filter_type,
      filter_config,
      workspace_id,
      is_default = false
    } = req.body;
    const userId = req.user.id;

    // If setting as default, unset other defaults for this filter type
    if (is_default) {
      await pool.execute(`
        UPDATE saved_filters 
        SET is_default = FALSE 
        WHERE user_id = ? AND filter_type = ? AND workspace_id = ?
      `, [userId, filter_type, workspace_id]);
    }

    const [result] = await pool.execute(`
      INSERT INTO saved_filters (
        name, description, filter_type, filter_config, user_id, workspace_id, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description,
      filter_type,
      JSON.stringify(filter_config),
      userId,
      workspace_id,
      is_default
    ]);

    // Fetch the created filter
    const [filters] = await pool.execute(`
      SELECT sf.*, u.first_name, u.last_name 
      FROM saved_filters sf
      LEFT JOIN users u ON sf.user_id = u.id
      WHERE sf.id = ?
    `, [result.insertId]);

    const filter = filters[0];
    const formattedFilter = {
      ...filter,
      filter_config: filter.filter_config ? JSON.parse(filter.filter_config) : {}
    };

    res.status(201).json(formattedFilter);
  } catch (error) {
    console.error('Error creating saved filter:', error);
    res.status(500).json({ error: 'Failed to create saved filter' });
  }
});

// Update a saved filter
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      filter_config,
      is_default
    } = req.body;
    const userId = req.user.id;

    // Check if user owns the filter
    const [existing] = await pool.execute(`
      SELECT * FROM saved_filters WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Saved filter not found or access denied' });
    }

    // If setting as default, unset other defaults for this filter type
    if (is_default) {
      await pool.execute(`
        UPDATE saved_filters 
        SET is_default = FALSE 
        WHERE user_id = ? AND filter_type = ? AND workspace_id = ? AND id != ?
      `, [userId, existing[0].filter_type, existing[0].workspace_id, id]);
    }

    await pool.execute(`
      UPDATE saved_filters 
      SET name = ?, description = ?, filter_config = ?, is_default = ?
      WHERE id = ?
    `, [
      name,
      description,
      JSON.stringify(filter_config),
      is_default,
      id
    ]);

    // Fetch updated filter
    const [filters] = await pool.execute(`
      SELECT sf.*, u.first_name, u.last_name 
      FROM saved_filters sf
      LEFT JOIN users u ON sf.user_id = u.id
      WHERE sf.id = ?
    `, [id]);

    const filter = filters[0];
    const formattedFilter = {
      ...filter,
      filter_config: filter.filter_config ? JSON.parse(filter.filter_config) : {}
    };

    res.json(formattedFilter);
  } catch (error) {
    console.error('Error updating saved filter:', error);
    res.status(500).json({ error: 'Failed to update saved filter' });
  }
});

// Delete a saved filter
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user owns the filter
    const [existing] = await pool.execute(`
      SELECT * FROM saved_filters WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Saved filter not found or access denied' });
    }

    await pool.execute('DELETE FROM saved_filters WHERE id = ?', [id]);
    res.json({ message: 'Saved filter deleted successfully' });
  } catch (error) {
    console.error('Error deleting saved filter:', error);
    res.status(500).json({ error: 'Failed to delete saved filter' });
  }
});

// Get a specific saved filter
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const [filters] = await pool.execute(`
      SELECT sf.*, u.first_name, u.last_name 
      FROM saved_filters sf
      LEFT JOIN users u ON sf.user_id = u.id
      WHERE sf.id = ? AND sf.user_id = ?
    `, [id, userId]);

    if (filters.length === 0) {
      return res.status(404).json({ error: 'Saved filter not found' });
    }

    const filter = filters[0];
    const formattedFilter = {
      ...filter,
      filter_config: filter.filter_config ? JSON.parse(filter.filter_config) : {}
    };

    res.json(formattedFilter);
  } catch (error) {
    console.error('Error fetching saved filter:', error);
    res.status(500).json({ error: 'Failed to fetch saved filter' });
  }
});

// Duplicate a saved filter
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    // Get the original filter
    const [filters] = await pool.execute(`
      SELECT * FROM saved_filters WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (filters.length === 0) {
      return res.status(404).json({ error: 'Saved filter not found' });
    }

    const original = filters[0];
    const duplicateName = name || `${original.name} (Copy)`;

    const [result] = await pool.execute(`
      INSERT INTO saved_filters (
        name, description, filter_type, filter_config, user_id, workspace_id, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      duplicateName,
      original.description,
      original.filter_type,
      original.filter_config,
      userId,
      original.workspace_id,
      false // Duplicates are never default
    ]);

    // Fetch the duplicated filter
    const [newFilters] = await pool.execute(`
      SELECT sf.*, u.first_name, u.last_name 
      FROM saved_filters sf
      LEFT JOIN users u ON sf.user_id = u.id
      WHERE sf.id = ?
    `, [result.insertId]);

    const filter = newFilters[0];
    const formattedFilter = {
      ...filter,
      filter_config: filter.filter_config ? JSON.parse(filter.filter_config) : {}
    };

    res.status(201).json(formattedFilter);
  } catch (error) {
    console.error('Error duplicating saved filter:', error);
    res.status(500).json({ error: 'Failed to duplicate saved filter' });
  }
});

// Set filter as default
router.patch('/:id/default', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get the filter to check ownership and get filter type
    const [filters] = await pool.execute(`
      SELECT * FROM saved_filters WHERE id = ? AND user_id = ?
    `, [id, userId]);

    if (filters.length === 0) {
      return res.status(404).json({ error: 'Saved filter not found' });
    }

    const filter = filters[0];

    // Unset other defaults for this filter type
    await pool.execute(`
      UPDATE saved_filters 
      SET is_default = FALSE 
      WHERE user_id = ? AND filter_type = ? AND workspace_id = ?
    `, [userId, filter.filter_type, filter.workspace_id]);

    // Set this filter as default
    await pool.execute(`
      UPDATE saved_filters 
      SET is_default = TRUE 
      WHERE id = ?
    `, [id]);

    res.json({ message: 'Filter set as default successfully' });
  } catch (error) {
    console.error('Error setting filter as default:', error);
    res.status(500).json({ error: 'Failed to set filter as default' });
  }
});

// Get default filter for a type
router.get('/default/:filterType', authenticateToken, async (req, res) => {
  try {
    const { filterType } = req.params;
    const { workspaceId } = req.query;
    const userId = req.user.id;

    const [filters] = await pool.execute(`
      SELECT sf.*, u.first_name, u.last_name 
      FROM saved_filters sf
      LEFT JOIN users u ON sf.user_id = u.id
      WHERE sf.user_id = ? AND sf.filter_type = ? AND sf.is_default = TRUE
        AND (sf.workspace_id = ? OR sf.workspace_id IS NULL)
      ORDER BY sf.workspace_id DESC
      LIMIT 1
    `, [userId, filterType, workspaceId]);

    if (filters.length === 0) {
      return res.status(404).json({ error: 'No default filter found' });
    }

    const filter = filters[0];
    const formattedFilter = {
      ...filter,
      filter_config: filter.filter_config ? JSON.parse(filter.filter_config) : {}
    };

    res.json(formattedFilter);
  } catch (error) {
    console.error('Error fetching default filter:', error);
    res.status(500).json({ error: 'Failed to fetch default filter' });
  }
});

export default router;
