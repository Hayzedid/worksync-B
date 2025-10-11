import express from 'express';
import { pool } from '../config/database.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();

// Get all custom fields for a workspace or item type
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { itemType, workspaceId } = req.query;
    const userId = req.user.id;

    let query = `
      SELECT cf.*, u.first_name, u.last_name 
      FROM custom_fields cf
      LEFT JOIN users u ON cf.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (workspaceId) {
      query += ` AND (cf.workspace_id = ? OR cf.workspace_id IS NULL)`;
      params.push(workspaceId);
    }

    if (itemType) {
      query += ` AND JSON_CONTAINS(cf.applies_to, ?)`;
      params.push(`"${itemType}"`);
    }

    query += ` ORDER BY cf.created_at DESC`;

    const [fields] = await pool.execute(query, params);
    
    // Parse JSON fields
    const formattedFields = fields.map(field => ({
      ...field,
      options: field.options ? JSON.parse(field.options) : null,
      validation: field.validation ? JSON.parse(field.validation) : null,
      metadata: field.metadata ? JSON.parse(field.metadata) : null,
      applies_to: field.applies_to ? JSON.parse(field.applies_to) : []
    }));

    res.json(formattedFields);
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    res.status(500).json({ error: 'Failed to fetch custom fields' });
  }
});

// Create a new custom field
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      required = false,
      defaultValue,
      options,
      validation,
      metadata,
      appliesTo,
      workspaceId
    } = req.body;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      INSERT INTO custom_fields (
        name, type, description, required, default_value, options, 
        validation, metadata, applies_to, workspace_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      type,
      description,
      required,
      defaultValue,
      options ? JSON.stringify(options) : null,
      validation ? JSON.stringify(validation) : null,
      metadata ? JSON.stringify(metadata) : null,
      JSON.stringify(appliesTo || []),
      workspaceId,
      userId
    ]);

    // Fetch the created field
    const [fields] = await pool.execute(`
      SELECT cf.*, u.first_name, u.last_name 
      FROM custom_fields cf
      LEFT JOIN users u ON cf.created_by = u.id
      WHERE cf.id = ?
    `, [result.insertId]);

    const field = fields[0];
    const formattedField = {
      ...field,
      options: field.options ? JSON.parse(field.options) : null,
      validation: field.validation ? JSON.parse(field.validation) : null,
      metadata: field.metadata ? JSON.parse(field.metadata) : null,
      applies_to: field.applies_to ? JSON.parse(field.applies_to) : []
    };

    res.status(201).json(formattedField);
  } catch (error) {
    console.error('Error creating custom field:', error);
    res.status(500).json({ error: 'Failed to create custom field' });
  }
});

// Update a custom field
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      description,
      required,
      defaultValue,
      options,
      validation,
      metadata,
      appliesTo
    } = req.body;
    const userId = req.user.id;

    // Check if user owns the field or has permission
    const [existing] = await pool.execute(`
      SELECT * FROM custom_fields WHERE id = ? AND created_by = ?
    `, [id, userId]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Custom field not found or access denied' });
    }

    await pool.execute(`
      UPDATE custom_fields 
      SET name = ?, type = ?, description = ?, required = ?, default_value = ?,
          options = ?, validation = ?, metadata = ?, applies_to = ?
      WHERE id = ?
    `, [
      name,
      type,
      description,
      required,
      defaultValue,
      options ? JSON.stringify(options) : null,
      validation ? JSON.stringify(validation) : null,
      metadata ? JSON.stringify(metadata) : null,
      JSON.stringify(appliesTo || []),
      id
    ]);

    // Fetch updated field
    const [fields] = await pool.execute(`
      SELECT cf.*, u.first_name, u.last_name 
      FROM custom_fields cf
      LEFT JOIN users u ON cf.created_by = u.id
      WHERE cf.id = ?
    `, [id]);

    const field = fields[0];
    const formattedField = {
      ...field,
      options: field.options ? JSON.parse(field.options) : null,
      validation: field.validation ? JSON.parse(field.validation) : null,
      metadata: field.metadata ? JSON.parse(field.metadata) : null,
      applies_to: field.applies_to ? JSON.parse(field.applies_to) : []
    };

    res.json(formattedField);
  } catch (error) {
    console.error('Error updating custom field:', error);
    res.status(500).json({ error: 'Failed to update custom field' });
  }
});

// Delete a custom field
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user owns the field
    const [existing] = await pool.execute(`
      SELECT * FROM custom_fields WHERE id = ? AND created_by = ?
    `, [id, userId]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Custom field not found or access denied' });
    }

    await pool.execute('DELETE FROM custom_fields WHERE id = ?', [id]);
    res.json({ message: 'Custom field deleted successfully' });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    res.status(500).json({ error: 'Failed to delete custom field' });
  }
});

// Get custom field values for an item
router.get('/values/:itemType/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemType, itemId } = req.params;

    const [values] = await pool.execute(`
      SELECT cfv.*, cf.name, cf.type 
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.field_id = cf.id
      WHERE cfv.item_type = ? AND cfv.item_id = ?
    `, [itemType, itemId]);

    const formattedValues = values.reduce((acc, value) => {
      acc[value.field_id] = value.value ? JSON.parse(value.value) : null;
      return acc;
    }, {});

    res.json(formattedValues);
  } catch (error) {
    console.error('Error fetching custom field values:', error);
    res.status(500).json({ error: 'Failed to fetch custom field values' });
  }
});

// Set custom field value for an item
router.put('/values/:itemType/:itemId/:fieldId', authenticateToken, async (req, res) => {
  try {
    const { itemType, itemId, fieldId } = req.params;
    const { value } = req.body;

    await pool.execute(`
      INSERT INTO custom_field_values (field_id, item_id, item_type, value)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE value = VALUES(value)
    `, [fieldId, itemId, itemType, JSON.stringify(value)]);

    res.json({ message: 'Custom field value updated successfully' });
  } catch (error) {
    console.error('Error setting custom field value:', error);
    res.status(500).json({ error: 'Failed to set custom field value' });
  }
});

// Batch update custom field values for an item
router.put('/values/:itemType/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const { values } = req.body;

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      for (const [fieldId, value] of Object.entries(values)) {
        await connection.execute(`
          INSERT INTO custom_field_values (field_id, item_id, item_type, value)
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE value = VALUES(value)
        `, [fieldId, itemId, itemType, JSON.stringify(value)]);
      }

      await connection.commit();
      res.json({ message: 'Custom field values updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error batch updating custom field values:', error);
    res.status(500).json({ error: 'Failed to update custom field values' });
  }
});

export default router;
