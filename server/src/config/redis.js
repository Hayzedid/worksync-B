import Redis from 'redis';
import { config } from 'dotenv';

config();

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

// Create Redis client
const redis = Redis.createClient({
  url: process.env.REDIS_URL || `redis://${redisConfig.host}:${redisConfig.port}`,
  password: redisConfig.password,
  database: redisConfig.db
});

// Handle Redis events
redis.on('connect', () => {
  console.log('🔴 Connected to Redis server');
});

redis.on('error', (err) => {
  console.error('🚨 Redis Client Error:', err);
});

redis.on('ready', () => {
  console.log('✅ Redis client ready');
});

// Initialize Redis connection
await redis.connect();

// Cache helper functions
export const cache = {
  // Set cache with TTL
  set: async (key, value, ttl = process.env.CACHE_TTL || 3600) => {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error('❌ Cache set error:', error);
      return false;
    }
  },

  // Get cache
  get: async (key) => {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Cache get error:', error);
      return null;
    }
  },

  // Delete cache
  del: async (key) => {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('❌ Cache delete error:', error);
      return false;
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('❌ Cache exists error:', error);
      return false;
    }
  },

  // Set hash field
  hset: async (key, field, value) => {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.hSet(key, field, serializedValue);
      return true;
    } catch (error) {
      console.error('❌ Cache hset error:', error);
      return false;
    }
  },

  // Get hash field
  hget: async (key, field) => {
    try {
      const value = await redis.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Cache hget error:', error);
      return null;
    }
  },

  // Get all hash fields
  hgetall: async (key) => {
    try {
      const values = await redis.hGetAll(key);
      const parsed = {};
      for (const [field, value] of Object.entries(values)) {
        parsed[field] = JSON.parse(value);
      }
      return parsed;
    } catch (error) {
      console.error('❌ Cache hgetall error:', error);
      return {};
    }
  },

  // Increment counter
  incr: async (key) => {
    try {
      return await redis.incr(key);
    } catch (error) {
      console.error('❌ Cache incr error:', error);
      return 0;
    }
  },

  // Set with expiration
  expire: async (key, seconds) => {
    try {
      await redis.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('❌ Cache expire error:', error);
      return false;
    }
  },

  // Get keys by pattern
  keys: async (pattern) => {
    try {
      return await redis.keys(pattern);
    } catch (error) {
      console.error('❌ Cache keys error:', error);
      return [];
    }
  },

  // Flush all keys
  flushall: async () => {
    try {
      await redis.flushAll();
      return true;
    } catch (error) {
      console.error('❌ Cache flushall error:', error);
      return false;
    }
  }
};

// Session store for user sessions
export const sessionStore = {
  // Store user session
  setSession: async (sessionId, userId, data, ttl = 86400) => {
    const sessionKey = `session:${sessionId}`;
    const userKey = `user:${userId}:sessions`;
    
    try {
      // Store session data
      await cache.set(sessionKey, { userId, ...data }, ttl);
      
      // Add session to user's active sessions
      await redis.sAdd(userKey, sessionId);
      await redis.expire(userKey, ttl);
      
      return true;
    } catch (error) {
      console.error('❌ Session store error:', error);
      return false;
    }
  },

  // Get user session
  getSession: async (sessionId) => {
    const sessionKey = `session:${sessionId}`;
    return await cache.get(sessionKey);
  },

  // Delete user session
  deleteSession: async (sessionId) => {
    const sessionKey = `session:${sessionId}`;
    const session = await cache.get(sessionKey);
    
    if (session) {
      const userKey = `user:${session.userId}:sessions`;
      await redis.sRem(userKey, sessionId);
    }
    
    return await cache.del(sessionKey);
  },

  // Get all user sessions
  getUserSessions: async (userId) => {
    const userKey = `user:${userId}:sessions`;
    try {
      const sessionIds = await redis.sMembers(userKey);
      const sessions = [];
      
      for (const sessionId of sessionIds) {
        const session = await cache.get(`session:${sessionId}`);
        if (session) {
          sessions.push({ sessionId, ...session });
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('❌ Get user sessions error:', error);
      return [];
    }
  }
};

// Rate limiting store
export const rateLimitStore = {
  // Check and increment rate limit
  checkLimit: async (key, limit, windowMs) => {
    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }
      
      return {
        count: current,
        remaining: Math.max(0, limit - current),
        isBlocked: current > limit
      };
    } catch (error) {
      console.error('❌ Rate limit check error:', error);
      return { count: 0, remaining: limit, isBlocked: false };
    }
  }
};

// Real-time presence store
export const presenceStore = {
  // Set user presence
  setPresence: async (userId, workspaceId, data) => {
    const presenceKey = `presence:${workspaceId}:${userId}`;
    const workspaceKey = `workspace:${workspaceId}:online`;
    
    try {
      await cache.set(presenceKey, data, 300); // 5 minutes TTL
      await redis.sAdd(workspaceKey, userId);
      await redis.expire(workspaceKey, 300);
      return true;
    } catch (error) {
      console.error('❌ Set presence error:', error);
      return false;
    }
  },

  // Get user presence
  getPresence: async (userId, workspaceId) => {
    const presenceKey = `presence:${workspaceId}:${userId}`;
    return await cache.get(presenceKey);
  },

  // Get workspace online users
  getWorkspaceOnlineUsers: async (workspaceId) => {
    const workspaceKey = `workspace:${workspaceId}:online`;
    try {
      return await redis.sMembers(workspaceKey);
    } catch (error) {
      console.error('❌ Get workspace users error:', error);
      return [];
    }
  },

  // Remove user presence
  removePresence: async (userId, workspaceId) => {
    const presenceKey = `presence:${workspaceId}:${userId}`;
    const workspaceKey = `workspace:${workspaceId}:online`;
    
    try {
      await cache.del(presenceKey);
      await redis.sRem(workspaceKey, userId);
      return true;
    } catch (error) {
      console.error('❌ Remove presence error:', error);
      return false;
    }
  }
};

// Redis health check
export const redisHealthCheck = async () => {
  try {
    await redis.ping();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      memory: await redis.info('memory'),
      clients: await redis.info('clients')
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

// Close Redis connection
export const closeRedis = async () => {
  try {
    await redis.quit();
    console.log('🔌 Redis connection closed');
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error);
  }
};

export { redis };
export default redis;
