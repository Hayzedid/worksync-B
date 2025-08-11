// server.js
import express, { json, urlencoded } from 'express';
// import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import noteRoutes from './routes/notes.js';
import userRoutes from './routes/users.js';
import eventRoutes from './routes/events.js';
import { devLogger } from './middleware/logger.js';
import workspaceRoutes from './routes/workspace.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter, authLimiter } from './middleware/rateLimiter.js';
import dotenv from 'dotenv';
dotenv.config();
import mycors from './middleware/mycors.js';
import commentRoutes from './routes/comments.js';
import tagRoutes from './routes/tags.js';
import subtaskRoutes from './routes/subtasks.js';
import notificationRoutes from './routes/notifications.js';
import activityRoutes from './routes/activity.js';
import calendarRoutes from './routes/calendar.js';
import attachmentRoutes from './routes/attachments.js';
import cookieParser from 'cookie-parser';
// import socketHandler from './socket/socketHandler.js';
const app = express();
// const PORT = process.env.PORT || 5000;

// import http from 'http';
// import { Server } from 'socket.io';



// Ensure CORS is the very first middleware
app.use(mycors); // CORS must be first

app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(devLogger); 
app.use(generalLimiter); // Apply globally

// Routes
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth', authLimiter, authRoutes); // Stricter limit for login/signup
} else {
  app.use('/api/auth', authRoutes);
}
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api', commentRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api', subtaskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', activityRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api', attachmentRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handler should be the last middleware
app.use(errorHandler);

export default app;