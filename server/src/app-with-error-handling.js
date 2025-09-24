// Enhanced app.js with route error handling
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

// Config and utils
import { NODE_ENV } from './config/config.js';
import logger from './utils/logger.js';
import { detailedLogger as requestLogger } from './middleware/logger.js';

// Security middleware
import { 
  rateLimiters, 
  securityHeaders, 
  securityLogger, 
  trackSuspiciousActivity,
  corsOptions 
} from './middleware/security.js';

// Auth middleware
import authenticateToken from './middleware/auth.js';

// Error handling
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Production security headers (must be first)
app.use(securityHeaders);

// Request logging for monitoring
app.use(requestLogger);

// Suspicious activity tracking
app.use(trackSuspiciousActivity);

// Load routes with error handling
const loadRoute = async (routePath, mountPath, routeName) => {
  try {
    console.log(`Loading ${routeName} routes...`);
    const { default: routes } = await import(routePath);
    app.use(mountPath, routes);
    console.log(`✅ ${routeName} routes loaded successfully`);
  } catch (error) {
    console.error(`❌ Error loading ${routeName} routes:`, error.message);
    console.error(`Route path: ${routePath}, Mount path: ${mountPath}`);
    throw error; // Re-throw to stop server startup
  }
};

// Register routes with error handling
try {
  // Health check first (no auth required)
  await loadRoute('./routes/health.js', '/api/health', 'Health');

  // Enforce HTTPS in production
  if (NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
      }
      next();
    });
  }

  // Security middleware
  app.use(helmet());
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Production rate limiting
  app.use(rateLimiters.general);

  // Load authenticated routes
  const minimalRoutes = process.env.MINIMAL_ROUTES === '1';

  if (minimalRoutes) {
    // Only auth routes for isolation
    if (NODE_ENV !== 'test') {
      await loadRoute('./routes/auth.js', '/api/auth', 'Auth');
      app.use('/api/auth', rateLimiters.auth);
    } else {
      await loadRoute('./routes/auth.js', '/api/auth', 'Auth');
    }
  } else {
    // Load all routes
    if (NODE_ENV !== 'test') {
      await loadRoute('./routes/auth.js', '/api/auth', 'Auth');
      app.use('/api/auth', rateLimiters.auth);
    } else {
      await loadRoute('./routes/auth.js', '/api/auth', 'Auth');
    }

    // Load other routes with authentication
    await loadRoute('./routes/projects.js', '/api/projects', 'Projects');
    app.use('/api/projects', authenticateToken);

    await loadRoute('./routes/tasks.js', '/api/tasks', 'Tasks');
    app.use('/api/tasks', authenticateToken);

    await loadRoute('./routes/notes.js', '/api/notes', 'Notes');
    app.use('/api/notes', authenticateToken);

    await loadRoute('./routes/users.js', '/api/users', 'Users');
    app.use('/api/users', authenticateToken);

    await loadRoute('./routes/events.js', '/api/events', 'Events');
    app.use('/api/events', authenticateToken);

    await loadRoute('./routes/workspace.js', '/api/workspaces', 'Workspaces');
    app.use('/api/workspaces', authenticateToken);

    await loadRoute('./routes/comments.js', '/api/comments', 'Comments');
    app.use('/api/comments', authenticateToken);

    await loadRoute('./routes/tags.js', '/api/tags', 'Tags');
    app.use('/api/tags', authenticateToken);

    await loadRoute('./routes/subtasks.js', '/api/subtasks', 'Subtasks');
    app.use('/api/subtasks', authenticateToken);

    await loadRoute('./routes/notifications.js', '/api/notifications', 'Notifications');
    app.use('/api/notifications', authenticateToken);

    await loadRoute('./routes/activity.js', '/api/activity', 'Activity');
    app.use('/api/activity', authenticateToken);

    await loadRoute('./routes/calendar.js', '/api/calendar', 'Calendar');
    app.use('/api/calendar', authenticateToken);

    await loadRoute('./routes/attachments.js', '/api/attachments', 'Attachments');
    app.use('/api/attachments', authenticateToken, rateLimiters.fileUpload);

    // Phase 2 Collaboration Routes
    await loadRoute('./routes/presence.js', '/api/presence', 'Presence');
    app.use('/api/presence', authenticateToken, rateLimiters.realtime);

    await loadRoute('./routes/collaboration.js', '/api/collaboration', 'Collaboration');
    app.use('/api/collaboration', authenticateToken, rateLimiters.realtime);
  }

  console.log('🎉 All routes loaded successfully!');

} catch (error) {
  console.error('💥 Failed to load routes:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}

// Error handler should be the last middleware
app.use(errorHandler);

export default app;