import express from 'express';
import { NODE_ENV } from '../config/config.js';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Simple DB check
    await pool.query('SELECT 1');
    res.json({ ok: true, environment: NODE_ENV, timestamp: new Date().toISOString(), db: 'ok', uptime: process.uptime() });
  } catch (err) {
    res.status(500).json({ success: false, status: 'error', message: err.message });
  }
});

export default router;
