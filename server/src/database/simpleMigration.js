import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../config/database.js';

console.log('🚀 Starting simple migration test...');

async function testMigration() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    const [result] = await pool.execute('SELECT 1 as test');
    console.log('✅ Connection successful:', result);
    
    // Try creating one simple table
    console.log('📝 Creating test table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS test_phase1 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Test table created successfully');
    
    // Clean up
    await pool.execute('DROP TABLE IF EXISTS test_phase1');
    console.log('✅ Test table cleaned up');
    
    console.log('🎉 Migration test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    process.exit(1);
  }
}

testMigration();
