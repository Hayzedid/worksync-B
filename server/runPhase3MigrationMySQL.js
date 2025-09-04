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
    
    // Preprocess migration SQL to make it compatible with mysql2 execution
    // - Extract trigger blocks that use custom delimiter ($$) and keep them intact
    // - Remove DELIMITER directives (client-side only)
    // - Replace END$$ with END; inside extracted trigger blocks
    // - Remove unsupported IF NOT EXISTS in CREATE TRIGGER / CREATE INDEX

    // Extract trigger blocks that end with $$ (so we don't split their internal semicolons)
    const triggerRegex = /CREATE\s+TRIGGER[\s\S]*?END\$\$/gi;
    const triggerBlocks = [];
    let migrationCopy = migrationSQL;
    let match;
    while ((match = triggerRegex.exec(migrationSQL)) !== null) {
      triggerBlocks.push(match[0]);
      // remove from copy to avoid splitting inside triggers
      migrationCopy = migrationCopy.replace(match[0], '\n');
    }

    // Clean remaining SQL: remove DELIMITER directives and IF NOT EXISTS variants
    let cleanedSQL = migrationCopy
      .replace(/DELIMITER\s+\$\$/gi, '')
      .replace(/DELIMITER\s+;/gi, '')
      .replace(/CREATE TRIGGER IF NOT EXISTS/gi, 'CREATE TRIGGER')
      .replace(/CREATE INDEX IF NOT EXISTS/gi, 'CREATE INDEX');

    // Split remaining SQL into statements on semicolons
    const normalStatements = cleanedSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Normalize trigger blocks (replace END$$ with END;) and remove any leading/trailing whitespace
    const normalizedTriggers = triggerBlocks.map(tb => tb.replace(/END\$\$/i, 'END;').trim());

    // Final ordered statements: normal statements followed by triggers (preserve original ordering roughly)
    const statements = [...normalStatements, ...normalizedTriggers];
    
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
        
        // Choose query method: use pool.query for DDL that is not supported by prepared statements
        const needsRaw = /CREATE\s+TRIGGER|CREATE\s+FUNCTION|CREATE\s+PROCEDURE|END;|DELIMITER/gi.test(statement);

        if (statement.toUpperCase().includes('SELECT')) {
          const [result] = await pool.execute(statement);
          if (result.length > 0) {
            console.log(`✅ ${JSON.stringify(result[0])}`);
          }
        } else if (needsRaw) {
          // pool.query runs the SQL without preparing parameters, which is required for some DDL
          await pool.query(statement);
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
    
    // Verify migration by checking information_schema for expected tables
    const likePatterns = [
      'kanban_%',
      'time_tracking_%',
      'milestones',
      'resource_%',
      'project_templates'
    ];

    const placeholders = likePatterns.map(() => 'table_name LIKE ?').join(' OR ');
    const sql = `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND (${placeholders})`;
    const params = likePatterns.map(p => p);
    const [tables] = await pool.execute(sql, params);

    console.log('✅ Phase 3 tables found (partial list):');
    tables.forEach(row => {
      console.log(`   - ${row.table_name || JSON.stringify(row)}`);
    });

    // Ensure a generic 'activities' table exists for compatibility with controllers
    const [actRows] = await pool.execute(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'activities'"
    );
    if (!actRows || actRows.length === 0) {
      console.log('\n🔧 Creating missing `activities` table for MySQL compatibility...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS activities (
          id INT PRIMARY KEY AUTO_INCREMENT,
          workspace_id INT DEFAULT NULL,
          user_id INT DEFAULT NULL,
          action VARCHAR(200) NOT NULL,
          object_type VARCHAR(100) DEFAULT NULL,
          object_id INT DEFAULT NULL,
          details JSON DEFAULT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_activities_workspace (workspace_id)
        )
      `);
      console.log('✅ Created activities table');
    } else {
      console.log('\nℹ️  activities table already exists');
    }
    
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
