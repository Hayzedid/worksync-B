// Comment validation
export const validateComment = [
  body('content').notEmpty().withMessage('Comment content is required'),
  body('commentable_type').optional().isIn(['task', 'note']),
  body('commentable_id').optional().isInt(),
  body('parent_id').optional().isInt()
];
// Project validation
export const validateProject = [
  body('name').notEmpty().withMessage('Project name is required'),
  body('description').optional().isString(),
];

// Task validation
export const validateTask = [
  body('title').notEmpty().withMessage('Task title is required'),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('description').optional().isString(),
  body('due_date').optional().isISO8601().toDate(),
  body('project_id').optional().isInt(),
];

// Note validation
export const validateNote = [
  body('title').notEmpty().withMessage('Note title is required'),
  body('content').optional().isString(),
  body('project_id').optional().isInt(),
];
// src/utils/validator.js
import { body } from 'express-validator';

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
