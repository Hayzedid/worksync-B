// src/utils/socketUtils.js - Socket.IO utility to avoid circular imports
let ioInstance = null;

// Storage for online users and collaborative sessions (moved from socketHandler)
const onlineUsers = new Map(); // userId -> { socketId, userInfo, workspaceId, currentPage }
const collaborativeSessions = new Map(); // roomId -> Set<userId>

export function setSocketIOInstance(io) {
  ioInstance = io;
}

export function getSocketIOInstance() {
  return ioInstance;
}

export function emitToUser(userId, event, data) {
  if (ioInstance) {
    ioInstance.to(userId.toString()).emit(event, data);
  }
}

export function emitToRoom(room, event, data) {
  if (ioInstance) {
    ioInstance.to(room).emit(event, data);
  }
}

export function broadcast(event, data) {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
}

// Presence utilities (moved from socketHandler to avoid circular imports)
export function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

export function getWorkspacePresence(workspaceId) {
  const users = [];
  onlineUsers.forEach((userInfo, userId) => {
    if (userInfo.workspaceId === workspaceId) {
      users.push({
        userId,
        currentPage: userInfo.currentPage,
        lastActivity: userInfo.lastActivity
      });
    }
  });
  return users;
}

// Helper functions for socketHandler to manage state
export function getOnlineUsersMap() {
  return onlineUsers;
}

export function getCollaborativeSessionsMap() {
  return collaborativeSessions;
}