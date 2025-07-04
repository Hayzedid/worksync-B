// server.js
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import { testConnection } from './config/database.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Start server only after database connection is confirmed
async function startServer() {
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
        console.error('Failed to connect to database. Server not started.');
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 Database connected and ready`);
        console.log(`🔐 Authentication endpoints available at /api/auth`);
    });
}

startServer();