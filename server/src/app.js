
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
// Configure for Render's reverse proxy setup - be more specific to avoid rate limiter conflicts
if (process.env.NODE_ENV === 'production') {
  // In production (Render), trust the first proxy
  app.set('trust proxy', 1);
} else {
  // In development, trust local proxies
  app.set('trust proxy', ['127.0.0.1', 'loopback', 'linklocal', 'uniquelocal']);
}

// Production CORS configuration (must be very early)
app.use(cors(corsOptions));

// Production security headers
app.use(securityHeaders);

// Request logging for monitoring
app.use(requestLogger);

// Suspicious activity tracking
app.use(trackSuspiciousActivity);

// Enforce HTTPS in production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, 'https://' + req.headers.host + req.originalUrl);
    }
    next();
  });
}

// Security: Set secure HTTP headers
app.use(helmet());

// Register health check route after CORS is configured
app.use('/api/health', healthRoutes);

// Request logging for debugging (CORS headers are handled by security.js middleware)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log all requests for debugging
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} from origin: ${origin}`);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query params:', req.query);
  
  // Safe body preview - handle undefined req.body
  let bodyPreview = 'N/A';
  if (req.method === 'POST' && req.body !== undefined) {
    try {
      const bodyStr = JSON.stringify(req.body);
      // Fix: Check if bodyStr is defined before calling substring
      if (bodyStr && typeof bodyStr === 'string') {
        bodyPreview = bodyStr.length > 200 ? bodyStr.substring(0, 200) + '...' : bodyStr;
      } else {
        bodyPreview = '[Empty or invalid body]';
      }
    } catch (e) {
      bodyPreview = '[Body parsing error]';
    }
  }
  console.log('Body preview:', bodyPreview);
  
  next();
});

app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Production rate limiting
app.use(rateLimiters.general);

// Routes with enhanced security
const minimalRoutes = process.env.MINIMAL_ROUTES === '1';

// Apply rate limiting to auth routes in production
if (process.env.NODE_ENV !== 'test') {
  app.use('/api/auth', rateLimiters.auth);
  app.use('/auth', rateLimiters.auth); // Apply to legacy routes too
}

// Mount auth routes (both API and legacy)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // Legacy endpoint support

if (!minimalRoutes) {
  // Mount protected routes with authentication (API prefix)
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
  
  // Legacy routes without /api prefix for backward compatibility
  app.use('/projects', authenticateToken, projectRoutes);
  app.use('/tasks', authenticateToken, taskRoutes);
  app.use('/notes', authenticateToken, noteRoutes);
  app.use('/users', authenticateToken, userRoutes);
  app.use('/events', authenticateToken, eventRoutes);
  app.use('/workspaces', authenticateToken, workspaceRoutes);
  app.use('/comments', authenticateToken, commentRoutes);
  app.use('/tags', authenticateToken, tagRoutes);
  app.use('/subtasks', authenticateToken, subtaskRoutes);
  app.use('/notifications', authenticateToken, notificationRoutes);
  app.use('/activity', authenticateToken, activityRoutes);
  app.use('/calendar', authenticateToken, calendarRoutes);
  
  // Routes with additional rate limiting
  app.use('/api/attachments', authenticateToken, rateLimiters.fileUpload, attachmentRoutes);
  app.use('/api/presence', authenticateToken, rateLimiters.realtime, presenceRoutes);
  app.use('/api/collaboration', authenticateToken, rateLimiters.realtime, collaborationRoutes);
  
  // Legacy routes with rate limiting
  app.use('/attachments', authenticateToken, rateLimiters.fileUpload, attachmentRoutes);
  app.use('/presence', authenticateToken, rateLimiters.realtime, presenceRoutes);
  app.use('/collaboration', authenticateToken, rateLimiters.realtime, collaborationRoutes);
}

// 404 handler will be handled by Express default

// Error handler should be the last middleware
app.use(errorHandler);

export default app;