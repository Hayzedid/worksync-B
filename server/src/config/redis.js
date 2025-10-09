// Redis disabled for production deployment
import { config } from 'dotenv';

config();

console.log('⚠️ Redis disabled for production deployment - using mock implementations');

// Mock Redis client (no actual connection)
const redis = null;

// Mock cache helper functions (no Redis)
export const cache = {
  set: async (key, value, ttl = 3600) => true,
  get: async (key) => null,
  del: async (key) => true,
  exists: async (key) => false,
  hset: async (key, field, value) => true,
  hget: async (key, field) => null,
  hgetall: async (key) => ({}),
  incr: async (key) => 1,
  expire: async (key, seconds) => true,
  keys: async (pattern) => [],
  flushall: async () => true
};

// Mock session store
export const sessionStore = {
  setSession: async (sessionId, userId, data, ttl = 86400) => true,
  getSession: async (sessionId) => null,
  deleteSession: async (sessionId) => true,
  getUserSessions: async (userId) => []
};

// Mock rate limiting store
export const rateLimitStore = {
  checkLimit: async (key, limit, windowMs) => ({
    count: 0,
    remaining: limit,
    isBlocked: false
  })
};

// Mock presence store
export const presenceStore = {
  setPresence: async (userId, workspaceId, data) => true,
  getPresence: async (userId, workspaceId) => null,
  getWorkspaceOnlineUsers: async (workspaceId) => [],
  removePresence: async (userId, workspaceId) => true
};

// Mock Redis health check
export const redisHealthCheck = async () => ({
  status: 'disabled',
  timestamp: new Date().toISOString(),
  message: 'Redis disabled for production'
});

// Mock close Redis connection
export const closeRedis = async () => {
  console.log('🔌 Redis connection mock - no action needed');
};

export { redis };
export default redis;
