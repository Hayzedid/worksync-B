import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../config/database.js';

console.log('🚀 Creating final Phase 1 tables...');

async function createFinalTables() {
  try {
    // Create export_history table
    console.log('📝 Creating export_history table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS export_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        export_type VARCHAR(50) NOT NULL,
        format ENUM('pdf', 'docx', 'xlsx', 'csv', 'json', 'png') NOT NULL,
        item_type ENUM('tasks', 'projects', 'reports', 'dashboard') NOT NULL,
        item_count INT DEFAULT 0,
        file_path VARCHAR(500),
        file_size INT,
        export_options JSON,
        status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
        error_message TEXT,
        workspace_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        INDEX idx_export_history_user (user_id, created_at DESC),
        INDEX idx_export_history_status (status)
      )
    `);
    console.log('✅ export_history table created');

    // Create search_history table
    console.log('📝 Creating search_history table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        query VARCHAR(500) NOT NULL,
        filters JSON,
        result_count INT DEFAULT 0,
        workspace_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        INDEX idx_search_history_user (user_id, created_at DESC),
        INDEX idx_search_history_query (query)
      )
    `);
    console.log('✅ search_history table created');

    // Create notification_settings table
    console.log('📝 Creating notification_settings table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        sound_enabled BOOLEAN DEFAULT TRUE,
        desktop_notifications BOOLEAN DEFAULT FALSE,
        sound_theme ENUM('default', 'minimal', 'classic', 'modern') DEFAULT 'default',
        volume DECIMAL(3,2) DEFAULT 0.70,
        show_only_important BOOLEAN DEFAULT FALSE,
        workspace_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_workspace_settings (user_id, workspace_id)
      )
    `);
    console.log('✅ notification_settings table created');

    // Add indexes to existing tables
    console.log('📝 Adding performance indexes...');
    
    try {
      await pool.execute(`CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position)`);
      console.log('✅ Added position index to tasks table');
    } catch (error) {
      console.log('ℹ️ Position index already exists on tasks table');
    }
    
    try {
      await pool.execute(`CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status)`);
      console.log('✅ Added workspace_status index to tasks table');
    } catch (error) {
      console.log('ℹ️ Workspace_status index already exists on tasks table');
    }
    
    try {
      await pool.execute(`CREATE INDEX IF NOT EXISTS idx_projects_workspace_archived ON projects(workspace_id, is_archived)`);
      console.log('✅ Added workspace_archived index to projects table');
    } catch (error) {
      console.log('ℹ️ Workspace_archived index already exists on projects table');
    }

    console.log('🎉 All Phase 1 tables and indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating final tables:', error);
    process.exit(1);
  }
}

createFinalTables();
