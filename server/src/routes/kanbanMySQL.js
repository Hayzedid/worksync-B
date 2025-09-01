// =====================================================
// WorkSync Phase 3 - MySQL Kanban Routes
// RESTful API routes for Kanban boards and cards
// Compatible with existing MySQL infrastructure
// =====================================================

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import kanbanController from '../controllers/kanbanControllerMySQL.js';
import kanbanCardsController from '../controllers/kanbanCardsControllerMySQL.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// =====================================================
// KANBAN BOARDS ROUTES
// =====================================================

// Get all boards for a project
router.get('/projects/:projectId/boards', kanbanController.getProjectBoards);

// Create new board
router.post('/projects/:projectId/boards', kanbanController.createBoard);

// Update board
router.put('/boards/:boardId', kanbanController.updateBoard);

// Delete board
router.delete('/boards/:boardId', kanbanController.deleteBoard);

// Get board analytics
router.get('/boards/:boardId/analytics', kanbanController.getBoardAnalytics);

// =====================================================
// KANBAN COLUMNS ROUTES
// =====================================================

// Get columns for a board
router.get('/boards/:boardId/columns', kanbanController.getBoardColumns);

// Create new column
router.post('/boards/:boardId/columns', kanbanController.createColumn);

// =====================================================
// KANBAN CARDS ROUTES
// =====================================================

// Get all cards for a board
router.get('/boards/:boardId/cards', kanbanCardsController.getBoardCards);

// Create new card
router.post('/boards/:boardId/cards', kanbanCardsController.createCard);

// Update card
router.put('/cards/:cardId', kanbanCardsController.updateCard);

// Move card (drag and drop)
router.patch('/cards/:cardId/move', kanbanCardsController.moveCard);

// Delete card
router.delete('/cards/:cardId', kanbanCardsController.deleteCard);

// Add comment to card
router.post('/cards/:cardId/comments', kanbanCardsController.addComment);

// Get card activities
router.get('/cards/:cardId/activities', kanbanCardsController.getCardActivities);

export default router;
