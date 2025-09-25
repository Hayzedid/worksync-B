// Test CORS fix for Socket.IO connections
// This is a minimal reproduction case to verify the fix

import { io } from 'socket.io-client';

const BACKEND_URL = 'https://worksync-b.onrender.com';
const FRONTEND_ORIGIN = 'https://worksync-app.vercel.app';

console.log('🧪 Testing Socket.IO CORS fix...');
console.log(`Backend: ${BACKEND_URL}`);
console.log(`Frontend Origin: ${FRONTEND_ORIGIN}`);

// Test Socket.IO connection with proper origin
const socket = io(BACKEND_URL, {
  withCredentials: true,
  transports: ['polling', 'websocket'],
  extraHeaders: {
    'Origin': FRONTEND_ORIGIN
  }
});

socket.on('connect', () => {
  console.log('✅ Socket.IO connection successful!');
  console.log('Socket ID:', socket.id);
  socket.disconnect();
});

socket.on('connect_error', (error) => {
  console.log('❌ Socket.IO connection failed:');
  console.log('Error:', error.message);
  console.log('Type:', error.type);
  console.log('Description:', error.description);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Socket.IO disconnected:', reason);
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - connection took too long');
  socket.disconnect();
  process.exit(1);
}, 10000);
