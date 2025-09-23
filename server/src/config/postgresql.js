import { Pool } from 'pg';
import { config } from 'dotenv';

config();

// PostgreSQL connection configuration
const postgresConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  database: process.env.POSTGRES_DATABASE || 'worksync_v3',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DATABASE_POOL_MAX) || 20,
  min: parseInt(process.env.DATABASE_POOL_MIN) || 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create PostgreSQL connection pool
const pool = new Pool(postgresConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection
pool.on('connect', (client) => {
  console.log('🐘 Connected to PostgreSQL database');
});

// Connection helper functions
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('🚨 Database query error:', { text: text.substring(0, 50), error: error.message });
    throw error;
  }
};

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// UUID helper function
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Database health check
export const healthCheck = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    return {
      status: 'healthy',
      timestamp: result.rows[0].now,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// Close pool
export const closePool = async () => {
  try {
    await pool.end();
    console.log('🔌 Database pool closed');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
};

export { pool };
export default pool;
