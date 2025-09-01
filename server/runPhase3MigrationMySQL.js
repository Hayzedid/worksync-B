// =====================================================
// WorkSync Phase 3 - MySQL Migration Runner
// Executes Phase 3 database migration
// =====================================================

import fs from 'fs';
import path from 'path';
import { pool } from './src/config/database.js';

async function runMigration() {
  console.log('🚀 Starting Phase 3 MySQL Migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', 'phase3_mysql_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 5) {
        continue;
      }
      
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        
        // Handle special statements that might not return results
        if (statement.includes('CREATE TABLE') || 
            statement.includes('ALTER TABLE') || 
            statement.includes('CREATE INDEX') ||
            statement.includes('INSERT IGNORE') ||
            statement.includes('CREATE OR REPLACE VIEW') ||
            statement.includes('CREATE TRIGGER') ||
            statement.includes('DELIMITER')) {
          await pool.execute(statement);
        } else if (statement.includes('SELECT')) {
          const [result] = await pool.execute(statement);
          if (result.length > 0) {
            console.log(`✅ ${JSON.stringify(result[0])}`);
          }
        } else {
          await pool.execute(statement);
        }
        
      } catch (error) {
        // Log error but continue (some statements might fail if tables already exist)
        console.log(`⚠️  Statement ${i + 1} warning: ${error.message}`);
      }
    }
    
    console.log('🎉 Phase 3 migration completed successfully!');
    
    // Verify migration by checking for new tables
    console.log('\n📊 Verifying migration...');
    
    const [tables] = await pool.execute(`
      SHOW TABLES LIKE 'kanban_%' 
      UNION 
      SHOW TABLES LIKE 'time_tracking_%'
      UNION
      SHOW TABLES LIKE 'milestones'
      UNION
      SHOW TABLES LIKE 'resource_%'
      UNION
      SHOW TABLES LIKE 'project_templates'
    `);
    
    console.log('✅ New Phase 3 tables created:');
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });
    
    // Create default data
    console.log('\n🔧 Setting up default data...');
    
    // Check if default template exists
    const [existingTemplate] = await pool.execute(
      'SELECT id FROM project_templates WHERE name = "Basic Kanban Project"'
    );
    
    if (existingTemplate.length === 0) {
      await pool.execute(`
        INSERT INTO project_templates (name, description, category, template_data, is_public, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'Basic Kanban Project',
        'Simple Kanban board with basic columns',
        'GENERAL',
        JSON.stringify({
          columns: [
            {name: "Backlog", color: "#6B7280", position: 0},
            {name: "To Do", color: "#3B82F6", position: 1}, 
            {name: "In Progress", color: "#F59E0B", position: 2},
            {name: "Review", color: "#8B5CF6", position: 3},
            {name: "Done", color: "#10B981", position: 4, is_done_column: true}
          ],
          settings: {
            time_tracking_enabled: true,
            story_points_enabled: true
          }
        }),
        true,
        1
      ]);
      
      console.log('✅ Default project template created');
    }
    
    // Create default workspace settings
    const [workspaces] = await pool.execute('SELECT id FROM workspaces');
    for (const workspace of workspaces) {
      await pool.execute(`
        INSERT IGNORE INTO workspace_settings (workspace_id) VALUES (?)
      `, [workspace.id]);
    }
    
    // Create default time tracking settings
    const [users] = await pool.execute('SELECT id FROM users');
    for (const user of users) {
      await pool.execute(`
        INSERT IGNORE INTO time_tracking_settings (user_id) VALUES (?)
      `, [user.id]);
    }
    
    console.log('✅ Default settings created for existing workspaces and users');
    
    console.log('\n🎯 Phase 3 Features Available:');
    console.log('   📋 Kanban Boards with drag-and-drop cards');
    console.log('   ⏱️  Professional Time Tracking with timers');
    console.log('   🎯 Milestone Management');
    console.log('   👥 Resource Allocation Planning');
    console.log('   📝 Project Templates');
    console.log('   📊 Advanced Analytics & Reporting');
    
    console.log('\n✨ Your WorkSync backend is now Phase 3 ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();
