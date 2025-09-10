
import healthRoutes from './routes/health.js';
// Import production security middleware
import { 
  rateLimiters, 
  securityHeaders, 
  securityLogger, 
  trackSuspiciousActivity,
  corsOptions 
} from './middleware/security.js';
import cors from 'cors';
import { logger, requestLogger } from './utils/logger.js';

const app = express();

// Production security headers (must be first)
app.use(securityHeaders);

// Request logging for monitoring
app.use(requestLogger);

// Suspicious activity tracking
app.use(trackSuspiciousActivity);

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
// Phase 2 Collaboration Routes
import presenceRoutes from './routes/presence.js';
import collaborationRoutes from './routes/collaboration.js';
import cookieParser from 'cookie-parser';
import authenticateToken from './middleware/auth.js';
import helmet from 'helmet';
// import socketHandler from './socket/socketHandler.js';
// ...existing code...

// Security: Set secure HTTP headers with production CORS
app.use(helmet());

// Production CORS configuration
app.use(cors(corsOptions));

// Remove the old CORS middleware
// app.use(mycors); // Replaced with production CORS
// Preflight will be handled by the global CORS middleware above

app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Replace dev logger with production request logger
// app.use(devLogger); // Removed - using production logger
app.use(rateLimiters.general); // Production rate limiting

// Routes with enhanced security
const minimalRoutes = process.env.MINIMAL_ROUTES === '1';

if (minimalRoutes) {
  // Only auth routes for isolation
  if (process.env.NODE_ENV !== 'test') {
    app.use('/api/auth', rateLimiters.auth, authRoutes);
  } else {
    app.use('/api/auth', authRoutes);
  }
} else {
  if (process.env.NODE_ENV !== 'test') {
    app.use('/api/auth', rateLimiters.auth, authRoutes); // Enhanced auth rate limiting
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
  app.use('/api/attachments', authenticateToken, rateLimiters.fileUpload, attachmentRoutes);
  // Phase 2 Collaboration Routes
  app.use('/api/presence', authenticateToken, rateLimiters.realtime, presenceRoutes);
  app.use('/api/collaboration', authenticateToken, rateLimiters.realtime, collaborationRoutes);
}


// Error handler should be the last middleware
app.use(errorHandler);

export default app;