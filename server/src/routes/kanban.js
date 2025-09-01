import express from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/permissions.js';
import {
  getProjectBoards,
  createBoard,
  getBoard,
  updateBoard,
  deleteBoard,
  createColumn,
  updateColumn,
  deleteColumn,
  updateColumnPositions
} from '../controllers/kanbanController.js';
import {
  getColumnCards,
  createCard,
  getCard,
  updateCard,
  moveCard,
  deleteCard,
  addCardComment,
  getCardActivities
} from '../controllers/kanbanCardsController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Board routes
router.get('/projects/:projectId/boards', 
  param('projectId').isUUID().withMessage('Invalid project ID'),
  validateRequest,
  checkProjectAccess,
  getProjectBoards
);

router.post('/projects/:projectId/boards',
  param('projectId').isUUID().withMessage('Invalid project ID'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Board name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  validateRequest,
  checkProjectAccess,
  createBoard
);

router.get('/boards/:boardId',
  param('boardId').isUUID().withMessage('Invalid board ID'),
  validateRequest,
  getBoard
);

router.put('/boards/:boardId',
  param('boardId').isUUID().withMessage('Invalid board ID'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Board name must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  validateRequest,
  updateBoard
);

router.delete('/boards/:boardId',
  param('boardId').isUUID().withMessage('Invalid board ID'),
  validateRequest,
  deleteBoard
);

// Column routes
router.post('/boards/:boardId/columns',
  param('boardId').isUUID().withMessage('Invalid board ID'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Column name must be between 1 and 255 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color'),
  body('wip_limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('WIP limit must be between 1 and 100'),
  validateRequest,
  createColumn
);

router.put('/columns/:columnId',
  param('columnId').isUUID().withMessage('Invalid column ID'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Column name must be between 1 and 255 characters'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color'),
  body('wip_limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('WIP limit must be between 1 and 100'),
  body('is_done_column')
    .optional()
    .isBoolean()
    .withMessage('is_done_column must be a boolean'),
  validateRequest,
  updateColumn
);

router.delete('/columns/:columnId',
  param('columnId').isUUID().withMessage('Invalid column ID'),
  validateRequest,
  deleteColumn
);

router.put('/boards/:boardId/columns/positions',
  param('boardId').isUUID().withMessage('Invalid board ID'),
  body('columns')
    .isArray({ min: 1 })
    .withMessage('Columns must be a non-empty array'),
  body('columns.*.id')
    .isUUID()
    .withMessage('Each column must have a valid ID'),
  body('columns.*.position')
    .isInt({ min: 1 })
    .withMessage('Each column must have a valid position'),
  validateRequest,
  updateColumnPositions
);

// Card routes
router.get('/columns/:columnId/cards',
  param('columnId').isUUID().withMessage('Invalid column ID'),
  validateRequest,
  getColumnCards
);

router.post('/columns/:columnId/cards',
  param('columnId').isUUID().withMessage('Invalid column ID'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Card title must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO date'),
  body('estimated_hours')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('Estimated hours must be between 0 and 999.99'),
  body('assignee_id')
    .optional()
    .isUUID()
    .withMessage('Assignee ID must be a valid UUID'),
  body('labels')
    .optional()
    .isArray()
    .withMessage('Labels must be an array'),
  validateRequest,
  createCard
);

router.get('/cards/:cardId',
  param('cardId').isUUID().withMessage('Invalid card ID'),
  validateRequest,
  getCard
);

router.put('/cards/:cardId',
  param('cardId').isUUID().withMessage('Invalid card ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Card title must be between 1 and 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent'),
  body('due_date')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid ISO date'),
  body('estimated_hours')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('Estimated hours must be between 0 and 999.99'),
  body('actual_hours')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('Actual hours must be between 0 and 999.99'),
  body('assignee_id')
    .optional()
    .isUUID()
    .withMessage('Assignee ID must be a valid UUID'),
  body('labels')
    .optional()
    .isArray()
    .withMessage('Labels must be an array'),
  validateRequest,
  updateCard
);

router.put('/cards/:cardId/move',
  param('cardId').isUUID().withMessage('Invalid card ID'),
  body('target_column_id')
    .isUUID()
    .withMessage('Target column ID must be a valid UUID'),
  body('target_position')
    .isInt({ min: 1 })
    .withMessage('Target position must be a positive integer'),
  validateRequest,
  moveCard
);

router.delete('/cards/:cardId',
  param('cardId').isUUID().withMessage('Invalid card ID'),
  validateRequest,
  deleteCard
);

// Card comments
router.post('/cards/:cardId/comments',
  param('cardId').isUUID().withMessage('Invalid card ID'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment content must be between 1 and 1000 characters'),
  validateRequest,
  addCardComment
);

// Card activities
router.get('/cards/:cardId/activities',
  param('cardId').isUUID().withMessage('Invalid card ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validateRequest,
  getCardActivities
);

export default router;
