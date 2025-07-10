// server.js
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import noteRoutes from './routes/notes.js';
import userRoutes from './routes/users.js';
import eventRoutes from './routes/events.js';
import { devLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter, authLimiter } from './middleware/rateLimiter.js';
import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(devLogger); 
app.use(generalLimiter); // Apply globally

// Routes
app.use('/api/auth', authLimiter, authRoutes); // Stricter limit for login/signup
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Start server only after database connection is confirmed
async function startServer() {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.error('Failed to connect to database. Server not started.');
         if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
         }
    }
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Database connected and ready`);
        console.log(`🔐 Authentication endpoints available at /api/auth`);
    });
}

startServer();


app.use(errorHandler);