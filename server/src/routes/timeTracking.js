import express from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation.js';
import authenticateToken from '../middleware/auth.js';
import {
  getTimeTrackingSettings,
  updateTimeTrackingSettings,
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
  getActiveTimer,
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeTrackingReport
} from '../controllers/timeTrackingController.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Settings routes
router.get('/settings', getTimeTrackingSettings);

router.put('/settings',
  body('default_hourly_rate')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Default hourly rate must be between 0 and 10000'),
  body('auto_stop_timer')
    .optional()
    .isBoolean()
    .withMessage('Auto stop timer must be a boolean'),
  body('auto_stop_duration')
    .optional()
    .isInt({ min: 300, max: 28800 }) // 5 minutes to 8 hours
    .withMessage('Auto stop duration must be between 300 and 28800 seconds'),
  body('require_description')
    .optional()
    .isBoolean()
    .withMessage('Require description must be a boolean'),
  body('default_billable')
    .optional()
    .isBoolean()
    .withMessage('Default billable must be a boolean'),
  body('timezone')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Timezone must be between 1 and 50 characters'),
  validateRequest,
  updateTimeTrackingSettings
);

// Timer control routes
router.post('/start',
  body('project_id')
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  body('task_id')
    .optional()
    .isUUID()
    .withMessage('Task ID must be a valid UUID'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Description must be between 1 and 255 characters'),
  body('is_billable')
    .optional()
    .isBoolean()
    .withMessage('Is billable must be a boolean'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Hourly rate must be between 0 and 10000'),
  validateRequest,
  startTimer
);

router.put('/stop', stopTimer);

router.put('/pause', pauseTimer);

router.put('/resume', resumeTimer);

router.get('/active', getActiveTimer);

// Time entries routes
router.get('/entries',
  query('project_id')
    .optional()
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('is_billable')
    .optional()
    .isBoolean()
    .withMessage('Is billable must be a boolean'),
  validateRequest,
  getTimeEntries
);

router.post('/entries',
  body('project_id')
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  body('task_id')
    .optional()
    .isUUID()
    .withMessage('Task ID must be a valid UUID'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Description must be between 1 and 255 characters'),
  body('start_time')
    .isISO8601()
    .withMessage('Start time must be a valid ISO date'),
  body('end_time')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid ISO date'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 86400 }) // Max 24 hours
    .withMessage('Duration must be between 1 and 86400 seconds'),
  body('is_billable')
    .optional()
    .isBoolean()
    .withMessage('Is billable must be a boolean'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Hourly rate must be between 0 and 10000'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  validateRequest,
  createTimeEntry
);

router.put('/entries/:entryId',
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Description must be between 1 and 255 characters'),
  body('start_time')
    .optional()
    .isISO8601()
    .withMessage('Start time must be a valid ISO date'),
  body('end_time')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid ISO date'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 86400 })
    .withMessage('Duration must be between 1 and 86400 seconds'),
  body('is_billable')
    .optional()
    .isBoolean()
    .withMessage('Is billable must be a boolean'),
  body('hourly_rate')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Hourly rate must be between 0 and 10000'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  validateRequest,
  updateTimeEntry
);

router.delete('/entries/:entryId',
  param('entryId').isUUID().withMessage('Invalid entry ID'),
  validateRequest,
  deleteTimeEntry
);

// Reports routes
router.get('/report',
  query('project_id')
    .optional()
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  query('group_by')
    .optional()
    .isIn(['day', 'week', 'month', 'project'])
    .withMessage('Group by must be day, week, month, or project'),
  validateRequest,
  getTimeTrackingReport
);

// Quick access routes for common operations
router.get('/today',
  query('project_id')
    .optional()
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  validateRequest,
  async (req, res, next) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    req.query.start_date = startOfDay.toISOString();
    req.query.end_date = endOfDay.toISOString();
    
    next();
  },
  getTimeEntries
);

router.get('/week',
  query('project_id')
    .optional()
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  validateRequest,
  async (req, res, next) => {
    const today = new Date();
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 7);
    
    req.query.start_date = startOfWeek.toISOString();
    req.query.end_date = endOfWeek.toISOString();
    
    next();
  },
  getTimeEntries
);

router.get('/month',
  query('project_id')
    .optional()
    .isUUID()
    .withMessage('Project ID must be a valid UUID'),
  validateRequest,
  async (req, res, next) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    req.query.start_date = startOfMonth.toISOString();
    req.query.end_date = endOfMonth.toISOString();
    
    next();
  },
  getTimeEntries
);

export default router;
