import { pool } from './src/config/database.js';

async function checkPasswordResetTable() {
  try {
    console.log('🔍 Checking for password_resets table...');
    
    // Check if table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'password_resets'");
    
    if (tables.length === 0) {
      console.log('❌ password_resets table does not exist');
      console.log('📝 Creating password_resets table...');
      
      await pool.execute(`
        CREATE TABLE password_resets (
          id INT PRIMARY KEY AUTO_INCREMENT,
          user_id INT NOT NULL,
          token_hash VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_token_hash (token_hash),
          INDEX idx_user_id (user_id)
        )
      `);
      
      console.log('✅ password_resets table created successfully');
    } else {
      console.log('✅ password_resets table exists');
    }
    
    // Show table structure
    const [structure] = await pool.execute('DESCRIBE password_resets');
    console.log('\n📋 Table structure:');
    structure.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'YES' ? '(nullable)' : '(not null)'} ${field.Key ? `[${field.Key}]` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking password_resets table:', error);
  } finally {
    process.exit(0);
  }
}

checkPasswordResetTable();