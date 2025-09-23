// test-app.js - CommonJS version for testing
const express = require('express');
const { json, urlencoded } = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

// Config and utils
const { NODE_ENV } = require('./config/config.js');
const logger = require('./utils/test-logger.js');
const { detailedLogger: requestLogger } = require('./middleware/test-logger.js');

// Security middleware
const {
  rateLimiters,
  securityHeaders,
  securityLogger,
  trackSuspiciousActivity,
  corsOptions
} = require('./middleware/security.js');

// Auth middleware
const authenticateToken = require('./middleware/auth.js');

// Error handling
const errorHandler = require('./middleware/errorHandler.js');

// Routes
const healthRoutes = require('./routes/health.js');
const authRoutes = require('./routes/auth.js');
const projectRoutes = require('./routes/projects.js');
const taskRoutes = require('./routes/tasks.js');
const noteRoutes = require('./routes/notes.js');
const userRoutes = require('./routes/users.js');
const eventRoutes = require('./routes/events.js');
const commentRoutes = require('./routes/comments.js');
const tagRoutes = require('./routes/tags.js');
const subtaskRoutes = require('./routes/subtasks.js');
const notificationRoutes = require('./routes/notifications.js');
const activityRoutes = require('./routes/activity.js');
const workspaceRoutes = require('./routes/workspace.js');
const calendarRoutes = require('./routes/calendar.js');
const attachmentRoutes = require('./routes/attachments.js');
const presenceRoutes = require('./routes/presence.js');
const collaborationRoutes = require('./routes/collaboration.js');

const app = express();

// Production security headers (must be first)
app.use(securityHeaders);

// Request logging for monitoring
app.use(requestLogger);

// Suspicious activity tracking
app.use(trackSuspiciousActivity);

// Register health check route before any other middleware or route
app.use('/api/health', healthRoutes);

// Enforce HTTPS in production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
    }
    next();
  });
}

// Security: Set secure HTTP headers with production CORS
app.use(helmet());

// Production CORS configuration
app.use(cors(corsOptions));

app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Production rate limiting
app.use(rateLimiters.general);

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

module.exports = app;