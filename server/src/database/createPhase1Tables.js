import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../config/database.js';

console.log('🚀 Creating Phase 1 tables...');

async function createTables() {
  try {
    // Create custom_fields table
    console.log('📝 Creating custom_fields table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS custom_fields (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('text', 'number', 'dropdown', 'checkbox', 'date', 'url', 'email', 'multiselect', 'rating', 'currency') NOT NULL,
        description TEXT,
        required BOOLEAN DEFAULT FALSE,
        default_value TEXT,
        options JSON,
        validation JSON,
        metadata JSON,
        applies_to JSON NOT NULL,
        workspace_id INT,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_custom_fields_workspace (workspace_id),
        INDEX idx_custom_fields_type (type)
      )
    `);
    console.log('✅ custom_fields table created');

    // Create favorites table
    console.log('📝 Creating favorites table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        item_type ENUM('task', 'project', 'workspace', 'note', 'user') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500) NOT NULL,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_favorite (user_id, item_id, item_type),
        INDEX idx_favorites_user (user_id),
        INDEX idx_favorites_type (item_type)
      )
    `);
    console.log('✅ favorites table created');

    // Create pinned_items table
    console.log('📝 Creating pinned_items table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS pinned_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        item_type ENUM('task', 'project', 'workspace', 'note') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(500) NOT NULL,
        metadata JSON,
        order_position INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_pinned (user_id, item_id, item_type),
        INDEX idx_pinned_user_order (user_id, order_position),
        INDEX idx_pinned_type (item_type)
      )
    `);
    console.log('✅ pinned_items table created');

    // Create recent_items table
    console.log('📝 Creating recent_items table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS recent_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        item_type ENUM('task', 'project', 'workspace', 'note', 'user') NOT NULL,
        title VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        metadata JSON,
        accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_recent (user_id, item_id, item_type),
        INDEX idx_recent_user_accessed (user_id, accessed_at DESC),
        INDEX idx_recent_type (item_type)
      )
    `);
    console.log('✅ recent_items table created');

    console.log('🎉 Phase 1 core tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createTables();
