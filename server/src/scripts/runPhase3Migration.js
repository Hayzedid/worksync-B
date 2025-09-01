import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query, transaction } from '../config/postgresql.js';
import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MySQL connection for data migration
const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'worksync'
};

/**
 * Run Phase 3 migration from MySQL to PostgreSQL
 */
async function runPhase3Migration() {
  console.log('🚀 Starting Phase 3 Migration: MySQL → PostgreSQL');
  
  let mysqlConnection;
  
  try {
    // 1. Create PostgreSQL schema
    console.log('📋 Step 1: Creating PostgreSQL schema...');
    const sqlFile = fs.readFileSync(
      path.join(__dirname, '..', '..', 'migrations', 'phase3_postgresql_migration.sql'),
      'utf8'
    );
    
    await transaction(async (client) => {
      // Split SQL file into individual statements
      const statements = sqlFile
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            console.log(`Executing: ${statement.substring(0, 50)}...`);
            await client.query(statement);
            console.log('✅ Success');
          } catch (error) {
            if (error.code === '42P07' || error.code === '42710') { // Table/type already exists
              console.log('⚠️  Already exists, skipping...');
            } else {
              throw error;
            }
          }
        }
      }
    });

    console.log('✅ PostgreSQL schema created successfully');

    // 2. Connect to MySQL for data migration
    console.log('📋 Step 2: Connecting to MySQL for data migration...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Connected to MySQL');

    // 3. Migrate data
    await migrateData(mysqlConnection);

    console.log('🎉 Phase 3 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
    }
  }
}

/**
 * Migrate data from MySQL to PostgreSQL
 */
async function migrateData(mysqlConnection) {
  console.log('📋 Step 3: Migrating data from MySQL to PostgreSQL...');

  // Mapping table for old IDs to new UUIDs
  const idMapping = {};

  try {
    // 1. Migrate Users
    console.log('👥 Migrating users...');
    const [users] = await mysqlConnection.execute('SELECT * FROM users ORDER BY id');
    
    for (const user of users) {
      const newUserId = await query(
        `INSERT INTO users (email, password_hash, name, role, is_active, email_verified, 
         last_seen, current_page, is_online, timezone, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [
          user.email,
          user.password_hash,
          `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
          'member',
          user.is_active || true,
          user.email_verified || false,
          user.last_seen || new Date(),
          user.current_page,
          user.is_online || false,
          user.timezone || 'UTC',
          user.created_at,
          user.updated_at
        ]
      );
      
      idMapping[`user_${user.id}`] = newUserId.rows[0].id;
    }
    console.log(`✅ Migrated ${users.length} users`);

    // 2. Migrate Workspaces
    console.log('🏢 Migrating workspaces...');
    const [workspaces] = await mysqlConnection.execute('SELECT * FROM workspaces ORDER BY id');
    
    for (const workspace of workspaces) {
      const newWorkspaceId = await query(
        `INSERT INTO workspaces (name, description, owner_id, settings, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          workspace.name,
          workspace.description,
          idMapping[`user_${workspace.created_by}`],
          '{}',
          true,
          workspace.created_at,
          workspace.updated_at
        ]
      );
      
      idMapping[`workspace_${workspace.id}`] = newWorkspaceId.rows[0].id;
    }
    console.log(`✅ Migrated ${workspaces.length} workspaces`);

    // 3. Migrate Workspace Members
    console.log('👨‍💼 Migrating workspace members...');
    const [workspaceMembers] = await mysqlConnection.execute('SELECT * FROM workspace_members ORDER BY id');
    
    for (const member of workspaceMembers) {
      await query(
        `INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, $4)`,
        [
          idMapping[`workspace_${member.workspace_id}`],
          idMapping[`user_${member.user_id}`],
          member.role || 'member',
          member.joined_at || member.created_at
        ]
      );
    }
    console.log(`✅ Migrated ${workspaceMembers.length} workspace members`);

    // 4. Migrate Projects
    console.log('📁 Migrating projects...');
    const [projects] = await mysqlConnection.execute('SELECT * FROM projects ORDER BY id');
    
    for (const project of projects) {
      const newProjectId = await query(
        `INSERT INTO projects (workspace_id, name, description, status, priority, 
         start_date, end_date, owner_id, settings, is_archived, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        [
          idMapping[`workspace_${project.workspace_id}`],
          project.name,
          project.description,
          'planning',
          'medium',
          project.start_date,
          project.end_date,
          idMapping[`user_${project.created_by}`],
          '{}',
          project.is_archived || false,
          project.created_at,
          project.updated_at
        ]
      );
      
      idMapping[`project_${project.id}`] = newProjectId.rows[0].id;
    }
    console.log(`✅ Migrated ${projects.length} projects`);

    // 5. Migrate Tasks
    console.log('📋 Migrating tasks...');
    const [tasks] = await mysqlConnection.execute('SELECT * FROM tasks ORDER BY id');
    
    for (const task of tasks) {
      const newTaskId = await query(
        `INSERT INTO tasks (project_id, title, description, status, priority,
         estimated_hours, actual_hours, assignee_id, created_by, due_date,
         completed_at, tags, dependencies, workspace_id, position, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING id`,
        [
          idMapping[`project_${task.project_id}`],
          task.title,
          task.description,
          task.status || 'todo',
          task.priority || 'medium',
          task.estimated_hours,
          task.actual_hours,
          task.assigned_to ? idMapping[`user_${task.assigned_to}`] : null,
          idMapping[`user_${task.created_by}`],
          task.due_date,
          task.completion_date,
          '[]',
          '[]',
          idMapping[`workspace_${task.workspace_id}`],
          task.position || 0,
          task.created_at,
          task.updated_at
        ]
      );
      
      idMapping[`task_${task.id}`] = newTaskId.rows[0].id;
    }
    console.log(`✅ Migrated ${tasks.length} tasks`);

    // 6. Migrate Comments
    console.log('💬 Migrating comments...');
    const [comments] = await mysqlConnection.execute('SELECT * FROM comments ORDER BY id');
    
    for (const comment of comments) {
      // Map commentable_id based on type
      let commentableId;
      if (comment.commentable_type === 'task') {
        commentableId = idMapping[`task_${comment.commentable_id}`];
      } else if (comment.commentable_type === 'project') {
        commentableId = idMapping[`project_${comment.commentable_id}`];
      } else {
        continue; // Skip unknown types
      }

      const newCommentId = await query(
        `INSERT INTO comments (commentable_type, commentable_id, user_id, content,
         parent_comment_id, is_edited, edited_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          comment.commentable_type,
          commentableId,
          idMapping[`user_${comment.created_by}`],
          comment.content,
          comment.parent_id ? idMapping[`comment_${comment.parent_id}`] : null,
          false,
          null,
          comment.created_at,
          comment.updated_at
        ]
      );
      
      idMapping[`comment_${comment.id}`] = newCommentId.rows[0].id;
    }
    console.log(`✅ Migrated ${comments.length} comments`);

    // 7. Migrate Tags
    console.log('🏷️ Migrating tags...');
    const [tags] = await mysqlConnection.execute('SELECT * FROM tags ORDER BY id');
    
    for (const tag of tags) {
      const newTagId = await query(
        `INSERT INTO tags (name, color, workspace_id, created_at)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          tag.name,
          '#007bff',
          null, // We'll need to determine workspace later
          tag.created_at
        ]
      );
      
      idMapping[`tag_${tag.id}`] = newTagId.rows[0].id;
    }
    console.log(`✅ Migrated ${tags.length} tags`);

    // 8. Migrate Notifications
    console.log('🔔 Migrating notifications...');
    const [notifications] = await mysqlConnection.execute('SELECT * FROM notifications ORDER BY id');
    
    for (const notification of notifications) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data, is_read, read_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          idMapping[`user_${notification.user_id}`],
          notification.type,
          notification.title,
          notification.message,
          '{}',
          notification.is_read || false,
          notification.read_at,
          notification.created_at
        ]
      );
    }
    console.log(`✅ Migrated ${notifications.length} notifications`);

    // 9. Create default Kanban boards for existing projects
    console.log('📊 Creating default Kanban boards...');
    const projectIds = Object.entries(idMapping)
      .filter(([key]) => key.startsWith('project_'))
      .map(([, value]) => value);

    for (const projectId of projectIds) {
      // Create default board
      const boardResult = await query(
        `INSERT INTO kanban_boards (project_id, name, description, settings, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [projectId, 'Main Board', 'Default project board', '{}']
      );

      const boardId = boardResult.rows[0].id;

      // Create default columns
      const defaultColumns = [
        { name: 'To Do', position: 1, color: '#6c757d' },
        { name: 'In Progress', position: 2, color: '#007bff' },
        { name: 'Review', position: 3, color: '#ffc107' },
        { name: 'Done', position: 4, color: '#28a745', is_done: true }
      ];

      for (const col of defaultColumns) {
        await query(
          `INSERT INTO kanban_columns (board_id, name, position, color, is_done_column, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [boardId, col.name, col.position, col.color, col.is_done || false]
        );
      }
    }
    console.log(`✅ Created Kanban boards for ${projectIds.length} projects`);

    // 10. Initialize user presence
    console.log('👁️ Initializing user presence...');
    const userIds = Object.entries(idMapping)
      .filter(([key]) => key.startsWith('user_'))
      .map(([, value]) => value);

    for (const userId of userIds) {
      // Get user's first workspace for initial presence
      const workspaceResult = await query(
        `SELECT workspace_id FROM workspace_members WHERE user_id = $1 LIMIT 1`,
        [userId]
      );

      if (workspaceResult.rows.length > 0) {
        await query(
          `INSERT INTO user_presence (user_id, workspace_id, current_page, last_activity, is_online, session_data)
           VALUES ($1, $2, $3, NOW(), false, '{}')`,
          [userId, workspaceResult.rows[0].workspace_id, null]
        );
      }
    }
    console.log(`✅ Initialized presence for ${userIds.length} users`);

    console.log('🎊 Data migration completed successfully!');

  } catch (error) {
    console.error('❌ Data migration failed:', error);
    throw error;
  }
}

/**
 * Create sample Phase 3 data
 */
async function createSampleData() {
  console.log('📋 Creating sample Phase 3 data...');

  try {
    // Get first user and workspace for samples
    const userResult = await query('SELECT id FROM users LIMIT 1');
    const workspaceResult = await query('SELECT id FROM workspaces LIMIT 1');
    const projectResult = await query('SELECT id FROM projects LIMIT 1');

    if (userResult.rows.length === 0) {
      console.log('⚠️  No users found, skipping sample data');
      return;
    }

    const userId = userResult.rows[0].id;
    const workspaceId = workspaceResult.rows[0]?.id;
    const projectId = projectResult.rows[0]?.id;

    // Create sample project template
    if (workspaceId) {
      const templateResult = await query(
        `INSERT INTO project_templates (name, description, category, tags, is_public, created_by, template_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id`,
        [
          'Software Development Template',
          'Complete template for software development projects',
          'Software',
          ['development', 'agile', 'scrum'],
          true,
          userId,
          JSON.stringify({
            phases: [
              { name: 'Planning', duration: 7, tasks: ['Requirements gathering', 'Architecture design'] },
              { name: 'Development', duration: 21, tasks: ['Frontend development', 'Backend development', 'Testing'] },
              { name: 'Deployment', duration: 3, tasks: ['Production deployment', 'Documentation'] }
            ]
          })
        ]
      );

      console.log(`✅ Created sample project template`);

      // Create sample milestone template
      await query(
        `INSERT INTO milestone_templates (name, description, category, milestones_data, created_by, is_public, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          'MVP Release Template',
          'Milestone template for MVP releases',
          'Product',
          JSON.stringify({
            milestones: [
              { title: 'Alpha Release', duration: 30, deliverables: ['Core features', 'Basic UI'] },
              { title: 'Beta Release', duration: 14, deliverables: ['Bug fixes', 'User testing'] },
              { title: 'Production Release', duration: 7, deliverables: ['Final testing', 'Deployment'] }
            ]
          }),
          userId,
          true
        ]
      );

      console.log(`✅ Created sample milestone template`);
    }

    // Create sample time tracking settings
    await query(
      `INSERT INTO time_tracking_settings (user_id, default_hourly_rate, auto_stop_timer, require_description, default_billable, timezone, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, 75.00, true, true, true, 'UTC']
    );

    // Create sample team member profile
    if (workspaceId) {
      await query(
        `INSERT INTO team_members (user_id, workspace_id, role, skills, capacity, hourly_rate, availability, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          userId,
          workspaceId,
          'Full Stack Developer',
          ['JavaScript', 'Node.js', 'React', 'PostgreSQL'],
          40,
          75.00,
          JSON.stringify({
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' }
          }),
          true
        ]
      );

      console.log(`✅ Created sample team member profile`);
    }

    // Create sample milestone if project exists
    if (projectId) {
      await query(
        `INSERT INTO milestones (project_id, title, description, due_date, status, priority, progress, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [
          projectId,
          'Project Launch',
          'Complete project development and launch to production',
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          'in_progress',
          'high',
          25,
          userId
        ]
      );

      console.log(`✅ Created sample milestone`);
    }

    console.log('🎉 Sample Phase 3 data created successfully!');

  } catch (error) {
    console.error('❌ Sample data creation failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPhase3Migration()
    .then(() => {
      console.log('🎊 Phase 3 migration completed!');
      return createSampleData();
    })
    .then(() => {
      console.log('✨ All done! Your WorkSync backend is now Phase 3 ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { runPhase3Migration, createSampleData };
