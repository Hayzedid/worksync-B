// Minimal app.js to isolate the problematic route
import express, { json, urlencoded } from 'express';
import cors from 'cors';

const app = express();

// Basic middleware
app.use(cors({
  origin: 'https://worksync-app.vercel.app',
  credentials: true
}));
app.use(json());
app.use(urlencoded({ extended: true }));

// Test routes one by one
import healthRoutes from './routes/health.js';
app.use('/api/health', healthRoutes);
console.log('✅ Health routes loaded');

import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes loaded');

import projectRoutes from './routes/projects.js';
app.use('/api/projects', projectRoutes);
console.log('✅ Project routes loaded');

import taskRoutes from './routes/tasks.js';
app.use('/api/tasks', taskRoutes);
console.log('✅ Task routes loaded');

import userRoutes from './routes/users.js';
app.use('/api/users', userRoutes);
console.log('✅ User routes loaded');

import workspaceRoutes from './routes/workspace.js';
app.use('/api/workspaces', workspaceRoutes);
console.log('✅ Workspace routes loaded');

import eventRoutes from './routes/events.js';
app.use('/api/events', eventRoutes);
console.log('✅ Event routes loaded');

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

export default app;