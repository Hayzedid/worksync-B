import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

async function runPhase2Migration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'worksync_db',
    multipleStatements: true
  });

  try {
    console.log('🚀 Starting Phase 2 Collaboration Migration...');

    const sqlFile = fs.readFileSync(
      path.join(process.cwd(), 'migrations', 'phase2_collaboration_schema.sql'),
      'utf8'
    );

    // Split SQL file into individual statements
    const statements = sqlFile
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          await connection.execute(statement);
          console.log('✅ Success');
        } catch (error) {
          if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_TABLE_EXISTS_ERROR' || error.message.includes('Duplicate column')) {
            console.log('⚠️  Already exists, skipping...');
          } else {
            console.error('❌ Error:', error.message);
          }
        }
      }
    }

    console.log('🎉 Phase 2 Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

runPhase2Migration();
