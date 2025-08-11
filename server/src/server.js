import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import { testConnection } from './config/database.js';
import socketHandler from './socket/socketHandler.js';

const PORT = process.env.PORT || 5000;

export let io; // Export io for use in controllers/services

async function startServer() {
  try {
    console.log('Attempting to connect to database...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('Failed to connect to database. Please ensure:');
      console.error('1. MySQL server is running');
      console.error('2. Database credentials in .env are correct');
      console.error('3. Database exists (run npm run init-db to create tables)');
      process.exit(1);
    }
    
    const server = http.createServer(app);
    io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    socketHandler(io);
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
    
    console.log(`📊 Database connected and ready`);
    console.log(`🔐 Authentication endpoints available at /api/auth`);
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
      });
    });
    
    // Start recurring job logic
    import('./services/recurringJob.js');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();