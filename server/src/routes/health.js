import express from 'express';
import { NODE_ENV } from '../config/config.js';
import { pool } from '../config/database.js';

const router = express.Router();

// Preflight requests are handled by the main CORS middleware

router.get('/', async (req, res) => {
  try {
    // Get database connection info (Railway MySQL compatible)
    const [dbInfo] = await pool.query(`
      SELECT 
        DATABASE() as current_database,
        USER() as current_user,
        VERSION() as mysql_version,
        1 as connection_test
    `);
    
    // Add server info from environment (Railway doesn't expose system variables)
    const serverInfo = {
      hostname: process.env.DB_HOST || 'railway-mysql',
      port: process.env.DB_PORT || '3306'
    };
    
    // Get table count from current database
    const [tableInfo] = await pool.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);
    
    // Get user count (if users table exists)
    let userCount = 'N/A';
    try {
      const [userInfo] = await pool.query('SELECT COUNT(*) as user_count FROM users');
      userCount = userInfo[0].user_count;
    } catch (e) {
      userCount = `Error: ${e.message}`;
    }
    
    res.json({ 
      ok: true, 
      environment: NODE_ENV, 
      timestamp: new Date().toISOString(), 
      uptime: process.uptime(),
      database: {
        name: dbInfo[0].current_database,
        user: dbInfo[0].current_user,
        hostname: serverInfo.hostname,
        port: serverInfo.port,
        version: dbInfo[0].mysql_version,
        table_count: tableInfo[0].table_count,
        user_count: userCount
      },
      config: {
        DB_HOST: process.env.DB_HOST || 'not set',
        DB_PORT: process.env.DB_PORT || 'not set', 
        DB_NAME: process.env.DB_NAME || 'not set',
        DB_USER: process.env.DB_USER || 'not set',
        NODE_ENV: process.env.NODE_ENV || 'not set'
      },
      corsHeaders: {
        origin: req.headers.origin,
        allowOrigin: res.getHeader('Access-Control-Allow-Origin'),
        allowCredentials: res.getHeader('Access-Control-Allow-Credentials'),
        allowMethods: res.getHeader('Access-Control-Allow-Methods')
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      status: 'error', 
      message: err.message,
      config: {
        DB_HOST: process.env.DB_HOST || 'not set',
        DB_PORT: process.env.DB_PORT || 'not set', 
        DB_NAME: process.env.DB_NAME || 'not set',
        DB_USER: process.env.DB_USER || 'not set',
        NODE_ENV: process.env.NODE_ENV || 'not set'
      }
    });
  }
});

export default router;
