// socket/socketHandler.js
import { registerSocketEvents } from './socketEvents.js';

const onlineUsers = new Set();

export function getOnlineUsers() {
  return Array.from(onlineUsers);
}

export default function socketHandler(io) {
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      onlineUsers.add(userId);
      io.emit('userOnline', userId);
    }
    socket.on('disconnect', () => {
      if (userId) {
        onlineUsers.delete(userId);
        io.emit('userOffline', userId);
      }
    });
  });
}
