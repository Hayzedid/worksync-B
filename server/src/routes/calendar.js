import express from 'express';
import { getCalendar } from '../controllers/calendarController.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', getCalendar);

export default router; 