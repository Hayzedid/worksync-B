import { pool } from './src/config/database.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Running workspace invitations migration...');
    
    const sqlPath = path.join(process.cwd(), 'migrations', 'workspace_invitations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.execute(sql);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
