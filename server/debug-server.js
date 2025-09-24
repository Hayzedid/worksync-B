// Debug server to isolate route parameter issues
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({
  origin: 'https://worksync-app.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(express.json());

// Add routes one by one to isolate the issue
try {
  // Health check
  const healthRoutes = await import('./routes/health.js');
  app.use('/api/health', healthRoutes.default);
  console.log('✅ Health routes loaded');
} catch (error) {
  console.error('❌ Error loading health routes:', error.message);
}

try {
  // Auth routes
  const authRoutes = await import('./routes/auth.js');
  app.use('/api/auth', authRoutes.default);
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Error loading auth routes:', error.message);
}

try {
  // Project routes
  const projectRoutes = await import('./routes/projects.js');
  app.use('/api/projects', projectRoutes.default);
  console.log('✅ Project routes loaded');
} catch (error) {
  console.error('❌ Error loading project routes:', error.message);
}

try {
  // Task routes
  const taskRoutes = await import('./routes/tasks.js');
  app.use('/api/tasks', taskRoutes.default);
  console.log('✅ Task routes loaded');
} catch (error) {
  console.error('❌ Error loading task routes:', error.message);
}

try {
  // User routes
  const userRoutes = await import('./routes/users.js');
  app.use('/api/users', userRoutes.default);
  console.log('✅ User routes loaded');
} catch (error) {
  console.error('❌ Error loading user routes:', error.message);
}

try {
  // Workspace routes
  const workspaceRoutes = await import('./routes/workspace.js');
  app.use('/api/workspaces', workspaceRoutes.default);
  console.log('✅ Workspace routes loaded');
} catch (error) {
  console.error('❌ Error loading workspace routes:', error.message);
}

// Add a catch-all for debugging
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Debug server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
});

export default app;