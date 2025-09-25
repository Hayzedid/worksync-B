import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import { testConnection } from './config/database.js';
import socketHandler from './socket/socketHandler.js';
import YjsWebSocketServer from './socket/yjsServer.js';
import { setSocketIOInstance } from './utils/socketUtils.js';

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
        origin: function (origin, callback) {
          // Allow requests with no origin (mobile apps, etc.)
          if (!origin) return callback(null, true);
          
          // Get allowed origins and normalize them (remove trailing slashes)
          const frontendUrl = config.FRONTEND_URL?.replace(/\/$/, '') || 'https://worksync-app.vercel.app';
          const allowedOrigins = [
            'http://localhost:3100', 
            'http://localhost:3000', 
            'https://worksync-app.vercel.app',
            'https://worksync-c.vercel.app',
            frontendUrl
          ].map(url => url.replace(/\/$/, '')); // Remove trailing slashes
          
          // Normalize the incoming origin (remove trailing slash)
          const normalizedOrigin = origin.replace(/\/$/, '');
          
          console.log(`Socket.IO CORS: Checking origin "${normalizedOrigin}" against allowed origins:`, allowedOrigins);
          
          if (allowedOrigins.includes(normalizedOrigin)) {
            console.log(`Socket.IO CORS: ✅ Allowing origin "${origin}"`);
            callback(null, true);
          } else {
            console.log(`Socket.IO CORS: ❌ Blocked origin "${origin}". Allowed origins:`, allowedOrigins);
            callback(new Error(`Not allowed by CORS. Origin: ${origin}`));
          }
        },
        methods: ['GET', 'POST'],
        credentials: true,
        allowEIO3: true // Enable Engine.IO v3 compatibility if needed
      }
    });
    
    // Set the Socket.IO instance for use in other modules
    setSocketIOInstance(io);
    
    socketHandler(io);
    
    // Start Y.js WebSocket server for collaborative editing (disabled in test mode)
    if (process.env.NODE_ENV !== 'test') {
      const yjsPort = process.env.YJS_WEBSOCKET_PORT || 1234;
      const yjsServer = new YjsWebSocketServer(yjsPort);
      yjsServer.start();
      yjsServer.startCleanupJob();
    }
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌐 Accessible at: http://localhost:${PORT}`);
      if (process.env.NODE_ENV !== 'test') {
        const yjsPort = process.env.YJS_WEBSOCKET_PORT || 1234;
        console.log(`🔗 Y.js WebSocket server running on ws://localhost:${yjsPort}`);
      }
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
    
    // Start recurring job logic (temporarily disabled for debugging)
    // import('./services/recurringJob.js');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();