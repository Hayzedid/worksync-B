// Test server to isolate the exact problematic route
import express from 'express';

const app = express();
app.use(express.json());

console.log('Starting route testing...');

const routeTests = [
  async () => {
    console.log('Testing health routes...');
    const { default: healthRoutes } = await import('./routes/health.js');
    app.use('/api/health', healthRoutes);
    console.log('✅ Health routes OK');
  },
  async () => {
    console.log('Testing auth routes...');
    const { default: authRoutes } = await import('./routes/auth.js');
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes OK');
  },
  async () => {
    console.log('Testing project routes...');
    const { default: projectRoutes } = await import('./routes/projects.js');
    app.use('/api/projects', projectRoutes);
    console.log('✅ Project routes OK');
  },
  async () => {
    console.log('Testing task routes...');
    const { default: taskRoutes } = await import('./routes/tasks.js');
    app.use('/api/tasks', taskRoutes);
    console.log('✅ Task routes OK');
  },
  async () => {
    console.log('Testing user routes...');
    const { default: userRoutes } = await import('./routes/users.js');
    app.use('/api/users', userRoutes);
    console.log('✅ User routes OK');
  },
  async () => {
    console.log('Testing workspace routes...');
    const { default: workspaceRoutes } = await import('./routes/workspace.js');
    app.use('/api/workspaces', workspaceRoutes);
    console.log('✅ Workspace routes OK');
  },
  async () => {
    console.log('Testing event routes...');
    const { default: eventRoutes } = await import('./routes/events.js');
    app.use('/api/events', eventRoutes);
    console.log('✅ Event routes OK');
  },
  async () => {
    console.log('Testing comment routes...');
    const { default: commentRoutes } = await import('./routes/comments.js');
    app.use('/api/comments', commentRoutes);
    console.log('✅ Comment routes OK');
  },
  async () => {
    console.log('Testing tag routes...');
    const { default: tagRoutes } = await import('./routes/tags.js');
    app.use('/api/tags', tagRoutes);
    console.log('✅ Tag routes OK');
  },
  async () => {
    console.log('Testing subtask routes...');
    const { default: subtaskRoutes } = await import('./routes/subtasks.js');
    app.use('/api/subtasks', subtaskRoutes);
    console.log('✅ Subtask routes OK');
  },
  async () => {
    console.log('Testing notification routes...');
    const { default: notificationRoutes } = await import('./routes/notifications.js');
    app.use('/api/notifications', notificationRoutes);
    console.log('✅ Notification routes OK');
  },
  async () => {
    console.log('Testing activity routes...');
    const { default: activityRoutes } = await import('./routes/activity.js');
    app.use('/api/activity', activityRoutes);
    console.log('✅ Activity routes OK');
  },
  async () => {
    console.log('Testing calendar routes...');
    const { default: calendarRoutes } = await import('./routes/calendar.js');
    app.use('/api/calendar', calendarRoutes);
    console.log('✅ Calendar routes OK');
  },
  async () => {
    console.log('Testing attachment routes...');
    const { default: attachmentRoutes } = await import('./routes/attachments.js');
    app.use('/api/attachments', attachmentRoutes);
    console.log('✅ Attachment routes OK');
  },
  async () => {
    console.log('Testing presence routes...');
    const { default: presenceRoutes } = await import('./routes/presence.js');
    app.use('/api/presence', presenceRoutes);
    console.log('✅ Presence routes OK');
  },
  async () => {
    console.log('Testing collaboration routes...');
    const { default: collaborationRoutes } = await import('./routes/collaboration.js');
    app.use('/api/collaboration', collaborationRoutes);
    console.log('✅ Collaboration routes OK');
  }
];

// Test each route individually
for (let i = 0; i < routeTests.length; i++) {
  try {
    await routeTests[i]();
  } catch (error) {
    console.error(`❌ ERROR at route test ${i + 1}:`, error.message);
    console.error('This route is causing the path-to-regexp error');
    process.exit(1);
  }
}

console.log('🎉 All routes loaded successfully!');

export default app;