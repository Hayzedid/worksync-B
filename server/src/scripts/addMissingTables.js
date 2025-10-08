import { pool } from '../config/database.js';

async function addMissingTables() {
  try {
    console.log('🚀 Adding missing database tables...');

    // Create user_presence table for tracking user online status
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_presence (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        status ENUM('ONLINE', 'OFFLINE', 'AWAY') DEFAULT 'OFFLINE',
        current_page VARCHAR(255),
        last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        socket_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_presence (user_id)
      )
    `);
    console.log('✅ user_presence table created');

    // Create collaborative_sessions table for tracking collaborative editing
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS collaborative_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_type ENUM('task', 'note', 'project') NOT NULL,
        item_id INT NOT NULL,
        user_id INT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        session_data JSON,
        cursor_position JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_session (item_type, item_id, user_id),
        INDEX idx_active_sessions (item_type, item_id, is_active),
        INDEX idx_user_sessions (user_id, is_active)
      )
    `);
    console.log('✅ collaborative_sessions table created');

    // Create comment_reactions table for comment reactions
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS comment_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        comment_id INT NOT NULL,
        user_id INT NOT NULL,
        emoji VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_reaction (comment_id, user_id, emoji)
      )
    `);
    console.log('✅ comment_reactions table created');

    console.log('🎉 All missing tables have been created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
addMissingTables()
  .then(() => {
    console.log('✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
