import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../config/database.js';

async function createPhase1Tables() {
  try {
    console.log('🚀 Starting Phase 1 database migration...');
    console.log('Creating Phase 1 database tables...');

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

    console.log('✅ custom_fields table created successfully');

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

    console.log('✅ custom_field_values table created successfully');

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

    console.log('✅ favorites table created successfully');

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

    console.log('✅ pinned_items table created successfully');

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

    console.log('✅ recent_items table created successfully');

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

    console.log('✅ task_templates table created successfully');

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

    console.log('✅ saved_filters table created successfully');

    // Create action_history table for undo/redo
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

    console.log('✅ action_history table created successfully');

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

    console.log('✅ export_history table created successfully');

    // Create search_history table for global search
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

    console.log('✅ search_history table created successfully');

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

    console.log('✅ notification_settings table created successfully');
    console.log('✅ Phase 1 database tables created successfully!');
    
    // Create indexes for better performance
    console.log('Creating additional indexes...');
    
    // Add indexes to existing tables for Phase 1 features
    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position)
    `);
    
    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status)
    `);
    
    await pool.execute(`
      CREATE INDEX IF NOT EXISTS idx_projects_workspace_archived ON projects(workspace_id, is_archived)
    `);

    console.log('✅ Additional indexes created successfully!');
    console.log('🎉 Phase 1 database migration completed!');

  } catch (error) {
    console.error('❌ Error creating Phase 1 tables:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createPhase1Tables()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { createPhase1Tables };
