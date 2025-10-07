// src/utils/validator.js
import { body } from 'express-validator';

// Comment validation
export const validateComment = [
  body('content').notEmpty().withMessage('Comment content is required'),
  body('commentable_type').optional().isIn(['task', 'note']),
  body('commentable_id').optional().isInt(),
  body('parent_id').optional().isInt()
];
// Project validation for creation
export const validateProject = [
  body('name').notEmpty().withMessage('Project name is required'),
  body('description').optional().isString(),
];

// Project validation for updates (all fields optional)
export const validateProjectUpdate = [
  body('name').optional().notEmpty().withMessage('Project name cannot be empty'),
  body('description').optional().isString(),
  body('status').optional().isIn(['active', 'planning', 'completed', 'archived']).withMessage('Invalid status'),
];

// Task validation for creation (requires title)
export const validateTask = [
  body('title').notEmpty().withMessage('Task title is required'),
  body('status').optional().custom((value, { req }) => {
    // General tasks (no project_id): only basic statuses
    if (!req.body.project_id) {
      if (!['todo', 'in_progress', 'done'].includes(value)) {
        throw new Error('General tasks can only have status: todo, in_progress, done');
      }
    } else {
      // Project tasks: all statuses allowed
      if (!['todo', 'in_progress', 'done', 'review', 'cancelled'].includes(value)) {
        throw new Error('Invalid status for project task');
      }
    }
    return true;
  }),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('description').optional().isString(),
  body('due_date').optional().isISO8601().toDate(),
  body('project_id').optional().isInt(),
];

// Task validation for updates (title is optional)
export const validateTaskUpdate = [
  body('title').optional().notEmpty().withMessage('Task title cannot be empty'),
  body('status').optional().custom(async (value, { req }) => {
    // We need to check the current task to see if it belongs to a project
    const taskId = req.params.id;
    if (taskId && value) {
      // Import pool here to avoid circular dependencies
      const { pool } = await import('../config/database.js');
      
      try {
        const [rows] = await pool.execute('SELECT project_id FROM tasks WHERE id = ?', [taskId]);
        const task = rows[0];
        
        if (task) {
          // General tasks (no project_id): only basic statuses
          if (!task.project_id) {
            if (!['todo', 'in_progress', 'done'].includes(value)) {
              throw new Error('General tasks can only have status: todo, in_progress, done');
            }
          } else {
            // Project tasks: all statuses allowed
            if (!['todo', 'in_progress', 'done', 'review', 'cancelled'].includes(value)) {
              throw new Error('Invalid status for project task');
            }
          }
        }
      } catch (error) {
        throw new Error('Error validating task status');
      }
    }
    return true;
  }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('description').optional().isString(),
  body('due_date').optional().isISO8601().toDate(),
  body('project_id').optional().isInt(),
  body('assigned_to').optional().isInt(),
  body('start_date').optional().isISO8601().toDate(),
  body('completion_date').optional().isISO8601().toDate(),
  body('estimated_hours').optional().isNumeric(),
  body('actual_hours').optional().isNumeric(),
  body('position').optional().isInt(),
];

// Note validation
export const validateNote = [
  body('title').notEmpty().withMessage('Note title is required'),
  body('content').optional().isString(),
  body('project_id').optional().isInt(),
];

export const validateRegister = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('userName').notEmpty().withMessage('Username is required')
];

export const validateLogin = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required')
];
