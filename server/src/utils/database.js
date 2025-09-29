const { logger } = require('../utils/logger');

// Database connection pool optimization
const optimizeConnectionPool = (knex) => {
  // Configure connection pool for better performance
  return knex.client.pool.on('createSuccess', (eventId, resource) => {
    logger.debug('Database connection created', { eventId });
  }).on('createFail', (eventId, error) => {
    logger.error('Database connection failed', { eventId, error: error.message });
  }).on('destroySuccess', (eventId, resource) => {
    logger.debug('Database connection destroyed', { eventId });
  }).on('poolDestroySuccess', () => {
    logger.info('Database pool destroyed successfully');
  });
};

// Query performance monitoring
const queryPerformanceMonitor = (knex) => {
  knex.on('query', (query) => {
    const startTime = Date.now();
    
    query.on('end', () => {
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) { // Queries taking more than 1 second
        logger.warn('Slow query detected', {
          sql: query.sql,
          bindings: query.bindings,
          duration: `${duration}ms`
        });
      } else if (duration > 100) {
        logger.debug('Query performance', {
          sql: query.sql.substring(0, 100) + '...',
          duration: `${duration}ms`
        });
      }
    });
    
    query.on('error', (error) => {
      logger.error('Query error', {
        sql: query.sql,
        bindings: query.bindings,
        error: error.message,
        stack: error.stack
      });
    });
  });
};

// Optimized queries for common operations
const optimizedQueries = {
  // Get user workspaces with member count
  getUserWorkspaces: (knex, userId) => {
    return knex('workspaces as w')
      .select([
        'w.id',
        'w.name',
        'w.description',
        'w.created_at',
        'w.owner_id',
        knex.raw('COUNT(DISTINCT wm.user_id) as member_count'),
        knex.raw('COUNT(DISTINCT t.id) as task_count'),
        knex.raw('COUNT(DISTINCT n.id) as note_count')
      ])
      .leftJoin('workspace_members as wm', 'w.id', 'wm.workspace_id')
      .leftJoin('tasks as t', function() {
        this.on('w.id', '=', 't.workspace_id')
            .andOn('t.status', '!=', knex.raw('?', ['completed']));
      })
      .leftJoin('notes as n', 'w.id', 'n.workspace_id')
      .where(function() {
        this.where('w.owner_id', userId)
            .orWhere('wm.user_id', userId);
      })
      .groupBy('w.id', 'w.name', 'w.description', 'w.created_at', 'w.owner_id')
      .orderBy('w.created_at', 'desc');
  },

  // Get workspace tasks with assignee information
  getWorkspaceTasks: (knex, workspaceId, filters = {}) => {
    const query = knex('tasks as t')
      .select([
        't.*',
        'assigned_user.name as assigned_to_name',
        'assigned_user.email as assigned_to_email',
        'creator.name as created_by_name'
      ])
      .leftJoin('users as assigned_user', 't.assigned_to', 'assigned_user.id')
      .leftJoin('users as creator', 't.created_by', 'creator.id')
      .where('t.workspace_id', workspaceId);

    // Apply filters
    if (filters.status) {
      query.where('t.status', filters.status);
    }
    if (filters.priority) {
      query.where('t.priority', filters.priority);
    }
    if (filters.assigned_to) {
      query.where('t.assigned_to', filters.assigned_to);
    }
    if (filters.due_date_from) {
      query.where('t.due_date', '>=', filters.due_date_from);
    }
    if (filters.due_date_to) {
      query.where('t.due_date', '<=', filters.due_date_to);
    }
    if (filters.search) {
      query.where(function() {
        this.where('t.title', 'like', `%${filters.search}%`)
            .orWhere('t.description', 'like', `%${filters.search}%`);
      });
    }

    return query.orderBy('t.created_at', 'desc');
  },

  // Get workspace notes with creator information
  getWorkspaceNotes: (knex, workspaceId, limit = 50, offset = 0) => {
    return knex('notes as n')
      .select([
        'n.*',
        'u.name as created_by_name',
        'u.email as created_by_email'
      ])
      .leftJoin('users as u', 'n.created_by', 'u.id')
      .where('n.workspace_id', workspaceId)
      .orderBy('n.updated_at', 'desc')
      .limit(limit)
      .offset(offset);
  },

  // Get user dashboard data in single query
  getDashboardData: (knex, userId) => {
    return Promise.all([
      // User workspaces
      optimizedQueries.getUserWorkspaces(knex, userId),
      
      // Recent tasks assigned to user
      knex('tasks as t')
        .select(['t.*', 'w.name as workspace_name'])
        .join('workspaces as w', 't.workspace_id', 'w.id')
        .join('workspace_members as wm', function() {
          this.on('w.id', '=', 'wm.workspace_id')
              .andOn('wm.user_id', '=', knex.raw('?', [userId]));
        })
        .where('t.assigned_to', userId)
        .whereNot('t.status', 'completed')
        .orderBy('t.due_date', 'asc')
        .limit(10),
      
      // Recent activity
      knex('activity_log as al')
        .select(['al.*', 'u.name as user_name', 'w.name as workspace_name'])
        .join('users as u', 'al.user_id', 'u.id')
        .join('workspaces as w', 'al.workspace_id', 'w.id')
        .join('workspace_members as wm', function() {
          this.on('w.id', '=', 'wm.workspace_id')
              .andOn('wm.user_id', '=', knex.raw('?', [userId]));
        })
        .orderBy('al.created_at', 'desc')
        .limit(20)
    ]);
  }
};

// Database indexing suggestions
const recommendedIndexes = [
  // Users table
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
  
  // Workspaces table
  'CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);',
  'CREATE INDEX IF NOT EXISTS idx_workspaces_created_at ON workspaces(created_at);',
  
  // Workspace members table
  'CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_workspace_members_composite ON workspace_members(workspace_id, user_id);',
  
  // Tasks table
  'CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);',
  'CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);',
  'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);',
  'CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);',
  'CREATE INDEX IF NOT EXISTS idx_tasks_composite ON tasks(workspace_id, status);',
  
  // Notes table
  'CREATE INDEX IF NOT EXISTS idx_notes_workspace ON notes(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);',
  'CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);',
  
  // Activity log table
  'CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON activity_log(workspace_id);',
  'CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);'
];

// Function to create recommended indexes
const createRecommendedIndexes = async (knex) => {
  try {
    logger.info('Creating recommended database indexes...');
    
    for (const indexSql of recommendedIndexes) {
      try {
        await knex.raw(indexSql);
        logger.debug('Index created/verified', { sql: indexSql });
      } catch (error) {
        logger.warn('Index creation failed (may already exist)', { 
          sql: indexSql, 
          error: error.message 
        });
      }
    }
    
    logger.info('Database indexing completed');
  } catch (error) {
    logger.error('Failed to create indexes', { error: error.message });
    throw error;
  }
};

// Query result caching
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedQuery = (cacheKey) => {
  const cached = queryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug('Query cache hit', { key: cacheKey });
    return cached.data;
  }
  return null;
};

const setCachedQuery = (cacheKey, data) => {
  queryCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries
  if (queryCache.size > 1000) {
    const oldestKey = queryCache.keys().next().value;
    queryCache.delete(oldestKey);
  }
};

// Database health check
const healthCheck = async (knex) => {
  try {
    const startTime = Date.now();
    await knex.raw('SELECT 1');
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      connections: {
        used: knex.client.pool.numUsed(),
        free: knex.client.pool.numFree(),
        pending: knex.client.pool.numPendingAcquires(),
        total: knex.client.pool.size
      }
    };
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

module.exports = {
  optimizeConnectionPool,
  queryPerformanceMonitor,
  optimizedQueries,
  createRecommendedIndexes,
  getCachedQuery,
  setCachedQuery,
  healthCheck
};
