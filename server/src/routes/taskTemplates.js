import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all task templates for a workspace
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, category } = req.query;
    const userId = req.user.id;

    let query = `
      SELECT tt.*, u.first_name, u.last_name 
      FROM task_templates tt
      LEFT JOIN users u ON tt.created_by = u.id
      WHERE (tt.workspace_id = ? OR tt.workspace_id IS NULL OR tt.created_by = ?)
    `;
    const params = [workspaceId, userId];

    if (category) {
      query += ` AND tt.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY tt.is_default DESC, tt.created_at DESC`;

    const [templates] = await pool.execute(query, params);
    
    // Parse JSON fields
    const formattedTemplates = templates.map(template => ({
      ...template,
      tags: template.tags ? JSON.parse(template.tags) : [],
      subtasks: template.subtasks ? JSON.parse(template.subtasks) : [],
      custom_fields: template.custom_fields ? JSON.parse(template.custom_fields) : {}
    }));

    res.json(formattedTemplates);
  } catch (error) {
    console.error('Error fetching task templates:', error);
    res.status(500).json({ error: 'Failed to fetch task templates' });
  }
});

// Create a new task template
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      description,
      title_template,
      description_template,
      priority = 'medium',
      estimated_hours,
      category,
      tags = [],
      subtasks = [],
      custom_fields = {},
      workspace_id,
      is_default = false
    } = req.body;
    const userId = req.user.id;

    const [result] = await pool.execute(`
      INSERT INTO task_templates (
        name, description, title_template, description_template, priority,
        estimated_hours, category, tags, subtasks, custom_fields,
        workspace_id, created_by, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      description,
      title_template,
      description_template,
      priority,
      estimated_hours,
      category,
      JSON.stringify(tags),
      JSON.stringify(subtasks),
      JSON.stringify(custom_fields),
      workspace_id,
      userId,
      is_default
    ]);

    // Fetch the created template
    const [templates] = await pool.execute(`
      SELECT tt.*, u.first_name, u.last_name 
      FROM task_templates tt
      LEFT JOIN users u ON tt.created_by = u.id
      WHERE tt.id = ?
    `, [result.insertId]);

    const template = templates[0];
    const formattedTemplate = {
      ...template,
      tags: template.tags ? JSON.parse(template.tags) : [],
      subtasks: template.subtasks ? JSON.parse(template.subtasks) : [],
      custom_fields: template.custom_fields ? JSON.parse(template.custom_fields) : {}
    };

    res.status(201).json(formattedTemplate);
  } catch (error) {
    console.error('Error creating task template:', error);
    res.status(500).json({ error: 'Failed to create task template' });
  }
});

// Update a task template
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      title_template,
      description_template,
      priority,
      estimated_hours,
      category,
      tags,
      subtasks,
      custom_fields,
      is_default
    } = req.body;
    const userId = req.user.id;

    // Check if user owns the template or has permission
    const [existing] = await pool.execute(`
      SELECT * FROM task_templates WHERE id = ? AND created_by = ?
    `, [id, userId]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task template not found or access denied' });
    }

    await pool.execute(`
      UPDATE task_templates 
      SET name = ?, description = ?, title_template = ?, description_template = ?,
          priority = ?, estimated_hours = ?, category = ?, tags = ?, subtasks = ?,
          custom_fields = ?, is_default = ?
      WHERE id = ?
    `, [
      name,
      description,
      title_template,
      description_template,
      priority,
      estimated_hours,
      category,
      JSON.stringify(tags || []),
      JSON.stringify(subtasks || []),
      JSON.stringify(custom_fields || {}),
      is_default,
      id
    ]);

    // Fetch updated template
    const [templates] = await pool.execute(`
      SELECT tt.*, u.first_name, u.last_name 
      FROM task_templates tt
      LEFT JOIN users u ON tt.created_by = u.id
      WHERE tt.id = ?
    `, [id]);

    const template = templates[0];
    const formattedTemplate = {
      ...template,
      tags: template.tags ? JSON.parse(template.tags) : [],
      subtasks: template.subtasks ? JSON.parse(template.subtasks) : [],
      custom_fields: template.custom_fields ? JSON.parse(template.custom_fields) : {}
    };

    res.json(formattedTemplate);
  } catch (error) {
    console.error('Error updating task template:', error);
    res.status(500).json({ error: 'Failed to update task template' });
  }
});

// Delete a task template
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user owns the template
    const [existing] = await pool.execute(`
      SELECT * FROM task_templates WHERE id = ? AND created_by = ?
    `, [id, userId]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task template not found or access denied' });
    }

    await pool.execute('DELETE FROM task_templates WHERE id = ?', [id]);
    res.json({ message: 'Task template deleted successfully' });
  } catch (error) {
    console.error('Error deleting task template:', error);
    res.status(500).json({ error: 'Failed to delete task template' });
  }
});

// Get a specific task template
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [templates] = await pool.execute(`
      SELECT tt.*, u.first_name, u.last_name 
      FROM task_templates tt
      LEFT JOIN users u ON tt.created_by = u.id
      WHERE tt.id = ?
    `, [id]);

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Task template not found' });
    }

    const template = templates[0];
    const formattedTemplate = {
      ...template,
      tags: template.tags ? JSON.parse(template.tags) : [],
      subtasks: template.subtasks ? JSON.parse(template.subtasks) : [],
      custom_fields: template.custom_fields ? JSON.parse(template.custom_fields) : {}
    };

    res.json(formattedTemplate);
  } catch (error) {
    console.error('Error fetching task template:', error);
    res.status(500).json({ error: 'Failed to fetch task template' });
  }
});

// Duplicate a task template
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    // Get the original template
    const [templates] = await pool.execute(`
      SELECT * FROM task_templates WHERE id = ?
    `, [id]);

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Task template not found' });
    }

    const original = templates[0];
    const duplicateName = name || `${original.name} (Copy)`;

    const [result] = await pool.execute(`
      INSERT INTO task_templates (
        name, description, title_template, description_template, priority,
        estimated_hours, category, tags, subtasks, custom_fields,
        workspace_id, created_by, is_default
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      duplicateName,
      original.description,
      original.title_template,
      original.description_template,
      original.priority,
      original.estimated_hours,
      original.category,
      original.tags,
      original.subtasks,
      original.custom_fields,
      original.workspace_id,
      userId,
      false // Duplicates are never default
    ]);

    // Fetch the duplicated template
    const [newTemplates] = await pool.execute(`
      SELECT tt.*, u.first_name, u.last_name 
      FROM task_templates tt
      LEFT JOIN users u ON tt.created_by = u.id
      WHERE tt.id = ?
    `, [result.insertId]);

    const template = newTemplates[0];
    const formattedTemplate = {
      ...template,
      tags: template.tags ? JSON.parse(template.tags) : [],
      subtasks: template.subtasks ? JSON.parse(template.subtasks) : [],
      custom_fields: template.custom_fields ? JSON.parse(template.custom_fields) : {}
    };

    res.status(201).json(formattedTemplate);
  } catch (error) {
    console.error('Error duplicating task template:', error);
    res.status(500).json({ error: 'Failed to duplicate task template' });
  }
});

// Get template categories
router.get('/categories/list', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const userId = req.user.id;

    const [categories] = await pool.execute(`
      SELECT DISTINCT category 
      FROM task_templates 
      WHERE (workspace_id = ? OR workspace_id IS NULL OR created_by = ?)
        AND category IS NOT NULL AND category != ''
      ORDER BY category
    `, [workspaceId, userId]);

    res.json(categories.map(cat => cat.category));
  } catch (error) {
    console.error('Error fetching template categories:', error);
    res.status(500).json({ error: 'Failed to fetch template categories' });
  }
});

export default router;
