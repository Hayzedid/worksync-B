import { pool } from '../config/database.js';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const [rows] = await pool.execute('SELECT 1 as test');
    console.log('✅ Database connection successful:', rows);
    
    // Check existing tables
    const [tables] = await pool.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n📋 Existing tables:');
    tables.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });
    
    // Check if Phase 1 tables exist
    const phase1Tables = [
      'custom_fields',
      'custom_field_values', 
      'favorites',
      'pinned_items',
      'recent_items',
      'task_templates',
      'saved_filters',
      'action_history',
      'export_history',
      'search_history',
      'notification_settings'
    ];
    
    console.log('\n🔍 Phase 1 tables status:');
    for (const tableName of phase1Tables) {
      const tableExists = tables.some(t => t.TABLE_NAME === tableName);
      console.log(`  ${tableExists ? '✅' : '❌'} ${tableName}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
