import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Simple DB check
    await pool.query('SELECT 1');
    res.json({ success: true, status: 'ok', uptime: process.uptime() });
  } catch (err) {
    res.status(500).json({ success: false, status: 'error', message: err.message });
  }
});

export default router;
