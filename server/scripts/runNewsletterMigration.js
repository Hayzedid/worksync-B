#!/usr/bin/env node

/**
 * Newsletter Migration Runner
 * Runs the newsletter database migration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runNewsletterMigration() {
  try {
    console.log('🚀 Starting newsletter migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/20250125000000_newsletter_subscriptions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          await pool.execute(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`⚠️  Table already exists, skipping...`);
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('🎉 Newsletter migration completed successfully!');
    
    // Verify the tables were created
    console.log('🔍 Verifying tables...');
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME LIKE 'newsletter_%'
    `);
    
    console.log('📊 Created tables:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME}`);
    });
    
    // Check if we have the welcome template
    const [templates] = await pool.execute(
      'SELECT COUNT(*) as count FROM newsletter_templates WHERE template_type = "welcome"'
    );
    
    if (templates[0].count > 0) {
      console.log('✅ Welcome email template created');
    } else {
      console.log('⚠️  Welcome email template not found');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
runNewsletterMigration();
