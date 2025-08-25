import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import { testConnection } from './config/database.js';
import socketHandler from './socket/socketHandler.js';

import * as config from './config/config.js';
// Use a random port during tests to avoid EADDRINUSE
let PORT = config.PORT;
if (process.env.NODE_ENV === 'test') {
  PORT = 0; // 0 lets the OS assign an available port
}

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
  origin: config.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    socketHandler(io);
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Accessible at: http://localhost:${PORT}`);
    }).on('error', (err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
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