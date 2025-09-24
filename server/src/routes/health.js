import express from 'express';
import { NODE_ENV } from '../config/config.js';
import { pool } from '../config/database.js';

const router = express.Router();

// Handle preflight requests for health endpoint
router.options('/', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || 'https://worksync-app.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

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
