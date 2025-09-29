import { readFileSync } from 'fs';
import { pool } from './src/config/database.js';

async function runMigration() {
  try {
    console.log('📄 Reading enhanced schema file...');
    const sqlContent = readFileSync('./migrations/simple_enhanced_schema.sql', 'utf8');
    
    console.log('🔗 Connecting to database...');
    
    // Remove comment lines and split by semicolon
    const cleanContent = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log('Statements found:', statements.length);
    console.log(`🚀 Executing ${statements.length} migration statements...`);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await pool.execute(statement);
      }
    }
    
    console.log('✅ Enhanced schema migration completed successfully!');
    console.log('📧 Email reminders functionality is now available');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();