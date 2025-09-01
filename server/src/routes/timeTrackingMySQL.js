// =====================================================
// WorkSync Phase 3 - MySQL Time Tracking Routes
// RESTful API routes for time tracking features
// Compatible with existing MySQL infrastructure
// =====================================================

import express from 'express';
import { body, query, param } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import timeTrackingController from '../controllers/timeTrackingControllerMySQL.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// =====================================================
// TIME TRACKING SETTINGS ROUTES
// =====================================================

// Get user's time tracking settings
router.get('/settings', timeTrackingController.getSettings);

// Update user's time tracking settings
router.put('/settings', [
  body('defaultHourlyRate').optional().isFloat({ min: 0 }),
  body('trackIdleTime').optional().isBoolean(),
  body('idleTimeoutMinutes').optional().isInt({ min: 1, max: 120 }),
  body('autoStopTimer').optional().isBoolean(),
  body('dailyGoalHours').optional().isFloat({ min: 0, max: 24 }),
  body('weeklyGoalHours').optional().isFloat({ min: 0, max: 168 }),
  body('timezone').optional().isString().isLength({ max: 50 }),
  body('dateFormat').optional().isString().isLength({ max: 20 }),
  body('timeFormat').optional().isString().isLength({ max: 20 }),
  handleValidationErrors
], timeTrackingController.updateSettings);

// =====================================================
// ACTIVE TIMER ROUTES
// =====================================================

// Get user's active timer
router.get('/timer', timeTrackingController.getActiveTimer);

// Start new timer
router.post('/timer/start', [
  body('projectId').optional().isInt(),
  body('taskId').optional().isInt(),
  body('cardId').optional().isInt(),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('tags').optional().isArray(),
  handleValidationErrors
], timeTrackingController.startTimer);

// Stop active timer
router.post('/timer/stop', [
  body('description').optional().isString().isLength({ max: 1000 }),
  body('isBillable').optional().isBoolean(),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  handleValidationErrors
], timeTrackingController.stopTimer);

// Pause active timer
router.post('/timer/pause', timeTrackingController.pauseTimer);

// Resume paused timer
router.post('/timer/resume', timeTrackingController.resumeTimer);

// =====================================================
// TIME ENTRIES ROUTES
// =====================================================

// Get user's time entries
router.get('/entries', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('projectId').optional().isInt(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  handleValidationErrors
], timeTrackingController.getTimeEntries);

// Create manual time entry
router.post('/entries', [
  body('projectId').optional().isInt(),
  body('taskId').optional().isInt(),
  body('cardId').optional().isInt(),
  body('description').isString().isLength({ min: 1, max: 1000 }),
  body('startTime').isISO8601(),
  body('endTime').optional().isISO8601(),
  body('durationSeconds').optional().isInt({ min: 1 }),
  body('isBillable').optional().isBoolean(),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('tags').optional().isArray(),
  handleValidationErrors
], timeTrackingController.createTimeEntry);

// Update time entry
router.put('/entries/:entryId', [
  param('entryId').isInt(),
  body('description').optional().isString().isLength({ max: 1000 }),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('durationSeconds').optional().isInt({ min: 1 }),
  body('isBillable').optional().isBoolean(),
  body('hourlyRate').optional().isFloat({ min: 0 }),
  body('tags').optional().isArray(),
  handleValidationErrors
], timeTrackingController.updateTimeEntry);

// Delete time entry
router.delete('/entries/:entryId', [
  param('entryId').isInt(),
  handleValidationErrors
], timeTrackingController.deleteTimeEntry);

// =====================================================
// REPORTING ROUTES
// =====================================================

// Get time tracking reports
router.get('/reports', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('groupBy').optional().isIn(['date', 'project', 'week']),
  query('projectId').optional().isInt(),
  handleValidationErrors
], timeTrackingController.getTimeReport);

export default router;
