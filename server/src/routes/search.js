import { Router } from 'express';
import authenticateToken from '../middleware/auth.js';
import { globalSearchController, advancedSearchController } from '../controllers/searchController.js';

const router = Router();

// Global search endpoint - searches across tasks, projects, and notes
router.get('/global', authenticateToken, globalSearchController);

// Advanced search with pagination and sorting
router.get('/advanced', authenticateToken, advancedSearchController);

export default router;