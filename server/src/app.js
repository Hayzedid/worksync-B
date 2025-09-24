
// server.js
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

// Routes
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import noteRoutes from './routes/notes.js';
import userRoutes from './routes/users.js';
import eventRoutes from './routes/events.js';
import commentRoutes from './routes/comments.js';
import tagRoutes from './routes/tags.js';
import subtaskRoutes from './routes/subtasks.js';
import notificationRoutes from './routes/notifications.js';
import activityRoutes from './routes/activity.js';
import workspaceRoutes from './routes/workspace.js';
import calendarRoutes from './routes/calendar.js';
import attachmentRoutes from './routes/attachments.js';
import presenceRoutes from './routes/presence.js';
import collaborationRoutes from './routes/collaboration.js';

const app = express();

// Trust proxy for Render deployment (required for rate limiting and real IP detection)
app.set('trust proxy', true);

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

export default app;