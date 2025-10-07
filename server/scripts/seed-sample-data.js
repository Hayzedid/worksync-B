// Sample data seeder for testing dashboard functionality
import { pool } from '../src/config/database.js';

async function seedSampleData() {
  try {
    console.log('🌱 Starting to seed sample data...');

    // First, let's check if we have any users to work with
    const [users] = await pool.execute('SELECT id, first_name FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user account first.');
      return;
    }
    
    const userId = users[0].id;
    const userName = users[0].first_name;
    console.log(`📝 Using user: ${userName} (ID: ${userId})`);

    // Check for existing workspace or create one
    const [workspaces] = await pool.execute('SELECT id, name FROM workspaces WHERE created_by = ? LIMIT 1', [userId]);
    let workspaceId;
    
    if (workspaces.length === 0) {
      console.log('🏢 Creating sample workspace...');
      const [result] = await pool.execute(
        'INSERT INTO workspaces (name, description, created_by) VALUES (?, ?, ?)',
        ['Sample Workspace', 'Demo workspace for testing dashboard', userId]
      );
      workspaceId = result.insertId;
    } else {
      workspaceId = workspaces[0].id;
      console.log(`🏢 Using existing workspace: ${workspaces[0].name} (ID: ${workspaceId})`);
    }

    // Create sample projects
    console.log('📋 Creating sample projects...');
    const projects = [
      { name: 'Website Redesign', description: 'Redesign company website with modern UI' },
      { name: 'Mobile App Development', description: 'Develop iOS and Android mobile application' },
      { name: 'Marketing Campaign', description: 'Q4 marketing campaign planning' }
    ];

    const projectIds = [];
    for (const project of projects) {
      const [result] = await pool.execute(
        'INSERT INTO projects (name, description, workspace_id, created_by) VALUES (?, ?, ?, ?)',
        [project.name, project.description, workspaceId, userId]
      );
      projectIds.push(result.insertId);
    }

    // Create sample tasks with upcoming deadlines
    console.log('✅ Creating sample tasks with deadlines...');
    const tasks = [
      { 
        title: 'Design homepage mockup', 
        description: 'Create wireframes and mockups for new homepage',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        priority: 'high',
        status: 'todo',
        project_id: projectIds[0]
      },
      { 
        title: 'Set up development environment', 
        description: 'Configure development tools and frameworks',
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        priority: 'medium',
        status: 'in_progress',
        project_id: projectIds[1]
      },
      { 
        title: 'Review marketing materials', 
        description: 'Final review of campaign materials',
        due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        priority: 'high',
        status: 'todo',
        project_id: projectIds[2]
      },
      { 
        title: 'User testing sessions', 
        description: 'Conduct user testing for new features',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        priority: 'low',
        status: 'todo',
        project_id: projectIds[0]
      }
    ];

    for (const task of tasks) {
      await pool.execute(
        'INSERT INTO tasks (title, description, due_date, priority, status, project_id, workspace_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [task.title, task.description, task.due_date, task.priority, task.status, task.project_id, workspaceId, userId]
      );
    }

    // Create sample events
    console.log('📅 Creating sample events...');
    const events = [
      {
        title: 'Team Standup Meeting',
        start_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000), // Tomorrow 9 AM
        end_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000), // Tomorrow 10 AM
        description: 'Daily team standup and project updates',
        location: 'Conference Room A',
        all_day: false
      },
      {
        title: 'Client Presentation',
        start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // 3 days from now 2 PM
        end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000), // 3 days from now 4 PM
        description: 'Present project progress to client',
        location: 'Client Office',
        all_day: false
      },
      {
        title: 'Company All-Hands',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Same day
        description: 'Monthly company-wide meeting',
        all_day: true
      }
    ];

    for (const event of events) {
      await pool.execute(
        'INSERT INTO events (title, start_date, end_date, description, location, all_day, workspace_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [event.title, event.start_date, event.end_date, event.description, event.location || null, event.all_day, workspaceId, userId]
      );
    }

    // Create sample notifications
    console.log('🔔 Creating sample notifications...');
    const notifications = [
      {
        title: 'Task Assigned',
        message: 'You have been assigned a new task: Design homepage mockup',
        type: 'task_assigned',
        is_read: false
      },
      {
        title: 'Project Update',
        message: 'Website Redesign project status changed to active',
        type: 'project_update',
        is_read: false
      },
      {
        title: 'Deadline Reminder',
        message: 'Task "Review marketing materials" is due tomorrow',
        type: 'deadline_reminder',
        is_read: true
      }
    ];

    for (const notification of notifications) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, is_read, workspace_id) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, notification.title, notification.message, notification.type, notification.is_read, workspaceId]
      );
    }

    // Create sample activity entries
    console.log('📈 Creating sample activity entries...');
    const activities = [
      {
        content: `${userName} created project "Website Redesign"`,
        entity_type: 'PROJECT',
        entity_id: projectIds[0]
      },
      {
        content: `${userName} added task "Design homepage mockup"`,
        entity_type: 'TASK',
        entity_id: 1 // Assuming first task gets ID 1
      },
      {
        content: `${userName} updated project status to "Active"`,
        entity_type: 'PROJECT',
        entity_id: projectIds[0]
      }
    ];

    for (const activity of activities) {
      await pool.execute(
        'INSERT INTO comments (content, entity_type, entity_id, user_id) VALUES (?, ?, ?, ?)',
        [activity.content, activity.entity_type, activity.entity_id, userId]
      );
    }

    console.log('✅ Sample data seeded successfully!');
    console.log('📊 Dashboard should now display:');
    console.log('   • 3 projects (1 active, 1 planning, 1 completed)');
    console.log('   • 4 tasks with upcoming deadlines');
    console.log('   • 3 upcoming events');
    console.log('   • 3 notifications (2 unread)');
    console.log('   • Recent activity entries');
    console.log('');
    console.log('🔄 Refresh your dashboard to see the real-time data!');

  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
  } finally {
    await pool.end();
  }
}

// Run the seeder
seedSampleData();