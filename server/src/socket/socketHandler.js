    // Custom real-time automations (trigger and broadcast results)
    // { roomId, automation, result }
    socket.on('automationTriggered', ({ roomId, automation, result }) => {
      io.to(roomId).emit('automationResult', { automation, result });
    });
    // Real-time board/calendar updates
    // { boardId, update }
    socket.on('boardUpdate', ({ boardId, update }) => {
      io.to(boardId).emit('boardUpdate', { update });
    });

    // { calendarId, update }
    socket.on('calendarUpdate', ({ calendarId, update }) => {
      io.to(calendarId).emit('calendarUpdate', { update });
    });
    // Real-time file attachment notifications
    // { roomId, file, action: 'added' | 'removed' }
    socket.on('fileAttachment', ({ roomId, file, action }) => {
      io.to(roomId).emit('fileAttachment', { file, action });
    });
    // Collaborative task assignment updates
    // { roomId, assignees }
    socket.on('updateAssignees', ({ roomId, assignees }) => {
      io.to(roomId).emit('updateAssignees', { assignees });
    });
    // Live notifications (popups for mentions, assignments, status changes, reminders)
    // { targetUserId, notification }
    socket.on('liveNotification', ({ targetUserId, notification }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('liveNotification', { notification });
      }
    });

    // Notification read/unread status sync
    // { notificationId, read }
    socket.on('notificationRead', ({ notificationId, read }) => {
      // Broadcast to all devices of the user (if multi-device)
      io.emit('notificationRead', { userId, notificationId, read });
    });
    // Undo/Redo actions in real time
    // { roomId, action: 'undo' | 'redo', state }
    socket.on('undoRedo', ({ roomId, action, state }) => {
      io.to(roomId).emit('undoRedo', { userId, action, state });
    });

    // Version history updates
    // { roomId, version }
    socket.on('versionUpdate', ({ roomId, version }) => {
      io.to(roomId).emit('versionUpdate', { version });
    });
    // Optimistic UI: acknowledge edit immediately
    // { roomId, changes, editId }
    socket.on('editResource', ({ roomId, changes, editId }) => {
      // Acknowledge to sender for optimistic UI
      socket.emit('editAck', { editId, status: 'received' });
      // Broadcast to others in the room
      socket.to(roomId).emit('resourceUpdated', {
        userId,
        changes,
        editId
      });
    });

    // Conflict resolution: notify of conflicts
    // { roomId, conflict: { editId, serverState, clientState } }
    socket.on('editConflict', ({ roomId, conflict }) => {
      io.to(roomId).emit('editConflict', { conflict });
    });
    // Real-time comments and chat in a room
    // { roomId, comment: { id, text, author, timestamp } }
    socket.on('newComment', ({ roomId, comment }) => {
      io.to(roomId).emit('newComment', { comment });
    });

    // Real-time chat message in a room
    // { roomId, message: { id, text, author, timestamp } }
    socket.on('chatMessage', ({ roomId, message }) => {
      io.to(roomId).emit('chatMessage', { message });
    });

import jwt from 'jsonwebtoken';
const onlineUsers = new Map(); // userId -> socket.id

export function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

export default function socketHandler(io) {
  // Authenticate socket connections using JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    try {
      const user = jwt.verify(token, process.env.JWT || 'your_jwt_secret');
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user?.id;
    if (userId) {
      onlineUsers.set(userId, socket.id);
      io.emit('userOnline', userId);
    }


    // Join a room for a specific resource (task, note, event)
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      io.to(roomId).emit('userJoinedRoom', { userId, roomId });
    });

    // Broadcast changes to others in the room (live editing)
    socket.on('editResource', ({ roomId, changes }) => {
      socket.to(roomId).emit('resourceUpdated', {
        userId,
        changes,
      });
    });

    // Live cursor and selection sharing
    // { roomId, cursor: { position: {line, ch}, selection: {start, end} }, userInfo: { id, name, avatar } }
    socket.on('cursorUpdate', ({ roomId, cursor, selection, userInfo }) => {
      socket.to(roomId).emit('cursorUpdate', {
        userId,
        cursor,
        selection,
        userInfo
      });
    });

    // Send notification to a user
    socket.on('notifyUser', ({ targetUserId, notification }) => {
      const targetSocketId = onlineUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('notification', { notification });
      }
    });


    // Typing indicator (start/stop typing)
    socket.on('typing', ({ roomId, isTyping }) => {
      socket.to(roomId).emit('userTyping', { userId, isTyping });
    });

    // Presence: broadcast when a user is viewing or editing a resource
    socket.on('activity', ({ roomId, activity }) => {
      // activity: 'viewing' | 'editing' | 'idle' | ...
      socket.to(roomId).emit('userActivity', { userId, activity });
    });

    // On joinRoom, broadcast presence
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      io.to(roomId).emit('userJoinedRoom', { userId, roomId });
      // Notify others of presence
      socket.to(roomId).emit('userActivity', { userId, activity: 'viewing' });
    });

    // Presence: handle disconnect
    socket.on('disconnect', () => {
      if (userId) {
        onlineUsers.delete(userId);
        io.emit('userOffline', userId);
      }
    });
  });
}
