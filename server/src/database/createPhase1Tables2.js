import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../config/database.js';

console.log('🚀 Creating remaining Phase 1 tables...');

async function createRemainingTables() {
  try {
    // Create custom_field_values table
    console.log('📝 Creating custom_field_values table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS custom_field_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        field_id INT NOT NULL,
        item_id INT NOT NULL,
        item_type ENUM('task', 'project', 'workspace', 'user') NOT NULL,
        value JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE,
        UNIQUE KEY unique_field_item (field_id, item_id, item_type),
        INDEX idx_custom_values_item (item_type, item_id),
        INDEX idx_custom_values_field (field_id)
      )
    `);
    console.log('✅ custom_field_values table created');

    // Create task_templates table
    console.log('📝 Creating task_templates table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS task_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        title_template VARCHAR(255) NOT NULL,
        description_template TEXT,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        estimated_hours DECIMAL(5,2),
        category VARCHAR(100),
        tags JSON,
        subtasks JSON,
        custom_fields JSON,
        workspace_id INT,
        created_by INT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_templates_workspace (workspace_id),
        INDEX idx_templates_category (category)
      )
    `);
    console.log('✅ task_templates table created');

    // Create saved_filters table
    console.log('📝 Creating saved_filters table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS saved_filters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        filter_type ENUM('tasks', 'projects', 'notes') NOT NULL,
        filter_config JSON NOT NULL,
        user_id INT NOT NULL,
        workspace_id INT,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        INDEX idx_saved_filters_user (user_id),
        INDEX idx_saved_filters_type (filter_type)
      )
    `);
    console.log('✅ saved_filters table created');

    // Create action_history table
    console.log('📝 Creating action_history table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS action_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        action_description VARCHAR(255) NOT NULL,
        item_type ENUM('task', 'project', 'workspace', 'note', 'user') NOT NULL,
        item_id INT NOT NULL,
        before_data JSON,
        after_data JSON,
        workspace_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        INDEX idx_action_history_user (user_id, created_at DESC),
        INDEX idx_action_history_item (item_type, item_id)
      )
    `);
    console.log('✅ action_history table created');

    console.log('🎉 Remaining Phase 1 tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createRemainingTables();
