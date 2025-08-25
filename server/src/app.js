
import healthRoutes from './routes/health.js';
const app = express();
// Register health check route before any other middleware or route
app.use('/api/health', healthRoutes);

import { NODE_ENV } from './config/config.js';
// Enforce HTTPS in production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
    }
    next();
  });
}
// import xss from 'xss-clean';
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
import errorHandler from './middleware/errorHandler.js';
import { generalLimiter, authLimiter } from './middleware/rateLimiter.js';
import * as config from './config/config.js';
import mycors from './middleware/mycors.js';
import commentRoutes from './routes/comments.js';
import tagRoutes from './routes/tags.js';
import subtaskRoutes from './routes/subtasks.js';
import notificationRoutes from './routes/notifications.js';
import activityRoutes from './routes/activity.js';
import calendarRoutes from './routes/calendar.js';
import attachmentRoutes from './routes/attachments.js';
import cookieParser from 'cookie-parser';
import authenticateToken from './middleware/auth.js';
import helmet from 'helmet';
// import socketHandler from './socket/socketHandler.js';
// ...existing code...

// Security: Set secure HTTP headers
// 1. Helmet for HTTP headers
app.use(helmet());
// 2. CORS (must be first for preflight)
// 3. Rate limiting (generalLimiter is global, authLimiter is for /api/auth)
// 4. Input validation and sanitization is handled in controllers/routes
// 5. Cookie parser and dev logger
// 6. All sensitive routes require authentication and RBAC as needed
// app.use(xss()); // Disabled due to incompatibility with recent Express
// const PORT = process.env.PORT || 5000;

// import http from 'http';
// import { Server } from 'socket.io';

// Ensure CORS is the very first middleware
app.use(mycors); // CORS must be first
// Preflight will be handled by the global CORS middleware above

app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(devLogger); 
app.use(generalLimiter); // Apply globally

// Routes
const minimalRoutes = process.env.MINIMAL_ROUTES === '1';

if (minimalRoutes) {
  // Only auth routes for isolation
  if (process.env.NODE_ENV !== 'test') {
    app.use('/api/auth', authLimiter, authRoutes);
  } else {
    app.use('/api/auth', authRoutes);
  }
} else {
  if (process.env.NODE_ENV !== 'test') {
    app.use('/api/auth', authLimiter, authRoutes); // Stricter limit for login/signup
  } else {
    app.use('/api/auth', authRoutes);
  }
  app.use('/api/projects', authenticateToken, projectRoutes);
  app.use('/api/tasks', authenticateToken, taskRoutes);
  app.use('/api/notes', authenticateToken, noteRoutes);
  app.use('/api/users', authenticateToken, userRoutes);
  app.use('/api/events', authenticateToken, eventRoutes);
  app.use('/api/workspaces', authenticateToken, workspaceRoutes);
  app.use('/api/comments', authenticateToken, commentRoutes);
  app.use('/api/tags', authenticateToken, tagRoutes);
  app.use('/api/subtasks', authenticateToken, subtaskRoutes);
  app.use('/api/notifications', authenticateToken, notificationRoutes);
  app.use('/api/activity', authenticateToken, activityRoutes);
  app.use('/api/calendar', authenticateToken, calendarRoutes);
  app.use('/api/attachments', authenticateToken, attachmentRoutes);
}


// Error handler should be the last middleware
app.use(errorHandler);

export default app;