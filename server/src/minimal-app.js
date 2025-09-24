// Minimal app.js to test for route parameter issues
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

// Config and utils
import { NODE_ENV } from './config/config.js';

// Security middleware
import { corsOptions } from './middleware/security.js';

// Error handling
import errorHandler from './middleware/errorHandler.js';

// Routes - Add one by one to identify the problematic one
import healthRoutes from './routes/health.js';
// import authRoutes from './routes/auth.js';
// import projectRoutes from './routes/projects.js';
// import taskRoutes from './routes/tasks.js';
// import noteRoutes from './routes/notes.js';
// import userRoutes from './routes/users.js';
// import eventRoutes from './routes/events.js';
// import commentRoutes from './routes/comments.js';
// import tagRoutes from './routes/tags.js';
// import subtaskRoutes from './routes/subtasks.js';
// import notificationRoutes from './routes/notifications.js';
// import activityRoutes from './routes/activity.js';
// import workspaceRoutes from './routes/workspace.js';
// import calendarRoutes from './routes/calendar.js';
// import attachmentRoutes from './routes/attachments.js';
// import presenceRoutes from './routes/presence.js';
// import collaborationRoutes from './routes/collaboration.js';

const app = express();

// Basic CORS configuration
app.use(cors(corsOptions));

app.use(json({ limit: '10mb' }));
app.use(urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Register health check route
app.use('/api/health', healthRoutes);

// Error handler should be the last middleware
app.use(errorHandler);

export default app;