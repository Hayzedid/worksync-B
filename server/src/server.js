import app from './app.js';
import http from 'http';
import { Server } from 'socket.io';
import { testConnection } from './config/database.js';
import socketHandler from './socket/socketHandler.js';

const PORT = process.env.PORT || 5000;

export let io; // Export io for use in controllers/services

async function startServer() {
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Server not started.');
    process.exit(1);
  }
  const server = http.createServer(app);
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  socketHandler(io);
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
  console.log(`📊 Database connected and ready`);
  console.log(`🔐 Authentication endpoints available at /api/auth`);
  // Start recurring job logic
  import('./services/recurringJob.js');
}

startServer(); 