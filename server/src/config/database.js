   import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import dotenv from 'dotenv';
dotenv.config();

// Open SQLite database
const dbPromise = open({
  filename: process.env.DB_PATH || './worksync.db',
  driver: sqlite3.Database
});

// Create a pool-like interface for SQLite
const pool = {
  execute: async (sql, params = []) => {
    const db = await dbPromise;
    // Remove backticks and convert MySQL-specific syntax to SQLite
    const sqliteSql = sql.replace(/`/g, '').replace(/\?/g, '?');
    
    if (sqliteSql.toUpperCase().startsWith('SELECT')) {
      const rows = await db.all(sqliteSql, params);
      return [rows];
    } else if (sqliteSql.toUpperCase().startsWith('INSERT')) {
      const result = await db.run(sqliteSql, params);
      return [{ insertId: result.lastID, affectedRows: result.changes }];
    } else {
      const result = await db.run(sqliteSql, params);
      return [{ affectedRows: result.changes }];
    }
  },
  query: async (sql, params = []) => {
    const db = await dbPromise;
    // Remove backticks and convert MySQL-specific syntax to SQLite
    const sqliteSql = sql.replace(/`/g, '').replace(/\?/g, '?');
    const rows = await db.all(sqliteSql, params);
    return [rows];
  },
  getConnection: async () => {
    // For SQLite, we don't need connection management like MySQL
    // Just return an object with a release method
    return { release: () => {} };
  }
};

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Database connection successful');
        connection.release();
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}


export { pool, testConnection };