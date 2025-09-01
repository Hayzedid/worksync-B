# Phase 3 Migration Guide

## 🎯 Overview

This guide will help you migrate your WorkSync backend from MySQL (Phase 1-2) to PostgreSQL with full Phase 3 features including Kanban boards, time tracking, milestones, and resource allocation.

## ⚡ Quick Start Migration

### 1. Prerequisites Check

Ensure you have:
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Redis 6+ installed and running  
- [ ] Current MySQL database accessible
- [ ] Backup of current data

### 2. Install Dependencies

Update your package.json to Phase 3 version:
```bash
cp package.phase3.json package.json
npm install
```

### 3. Environment Setup

Copy Phase 3 environment template:
```bash
cp .env.phase3.example .env
```

Configure your databases in `.env`:
```env
# Current MySQL (for migration source)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=worksync

# New PostgreSQL (migration target)
DATABASE_URL=postgresql://worksync_user:password@localhost:5432/worksync_v3
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=worksync_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DATABASE=worksync_v3

# Redis
REDIS_URL=redis://localhost:6379
```

### 4. Run Migration

Execute the automated migration:
```bash
npm run migrate:phase3
```

This will:
1. ✅ Create PostgreSQL schema with UUID primary keys
2. ✅ Migrate all existing data from MySQL to PostgreSQL
3. ✅ Create Kanban boards for existing projects
4. ✅ Set up user presence tracking
5. ✅ Generate sample Phase 3 data

### 5. Verify Migration

Check migration results:
```bash
# Test database connection
npm run test:db

# Run application tests
npm test

# Start development server
npm run dev
```

## 📋 Detailed Migration Steps

### Step 1: Database Setup

#### Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

#### Create Database and User
```bash
sudo -u postgres psql
```

```sql
CREATE USER worksync_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE worksync_v3 OWNER worksync_user;
GRANT ALL PRIVILEGES ON DATABASE worksync_v3 TO worksync_user;
\q
```

#### Install Redis
```bash
# Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
brew services start redis

# Windows
# Download from https://redis.io/download
```

### Step 2: Configuration Migration

#### Update Configuration Files

1. **Replace database config**:
```javascript
// OLD: src/config/database.js (MySQL)
import mysql from 'mysql2/promise';

// NEW: src/config/postgresql.js (PostgreSQL)
import { Pool } from 'pg';
```

2. **Add Redis config**:
```javascript
// NEW: src/config/redis.js
import Redis from 'redis';
```

3. **Update server.js**:
```javascript
// Replace MySQL imports with PostgreSQL
import { pool } from './config/postgresql.js';
import { redis } from './config/redis.js';
```

### Step 3: Code Updates

#### Update Imports

Replace MySQL references:
```javascript
// OLD
import { pool } from '../config/database.js';

// NEW  
import { query, transaction } from '../config/postgresql.js';
import { cache } from '../config/redis.js';
```

#### Update Database Queries

PostgreSQL uses different syntax:
```javascript
// OLD: MySQL
const [results] = await pool.execute(
  'SELECT * FROM users WHERE id = ?', 
  [userId]
);

// NEW: PostgreSQL
const results = await query(
  'SELECT * FROM users WHERE id = $1', 
  [userId]
);
```

#### Update Primary Keys

All IDs are now UUIDs:
```javascript
// OLD: Integer IDs
const userId = 123;

// NEW: UUID IDs  
const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
```

### Step 4: Feature Integration

#### Add New Controllers

Copy Phase 3 controllers:
```bash
cp src/controllers/kanbanController.js your_project/src/controllers/
cp src/controllers/kanbanCardsController.js your_project/src/controllers/
cp src/controllers/timeTrackingController.js your_project/src/controllers/
```

#### Add New Routes

Copy Phase 3 routes:
```bash
cp src/routes/kanban.js your_project/src/routes/
cp src/routes/timeTracking.js your_project/src/routes/
```

#### Update Main Router

Add new routes to your main router:
```javascript
// src/app.js or src/server.js
import kanbanRoutes from './routes/kanban.js';
import timeTrackingRoutes from './routes/timeTracking.js';

app.use('/api/v1/kanban', kanbanRoutes);
app.use('/api/v1/time-tracking', timeTrackingRoutes);
```

### Step 5: Socket.IO Enhancement

#### Update Socket Handler

Enhance your existing socket handler with Phase 3 events:
```javascript
// Add to your socketHandler.js
import { presenceStore } from '../config/redis.js';

// Kanban events
socket.on('kanban:card:move', async (data) => {
  // Handle card movement
  socket.to(`project:${data.projectId}`).emit('kanban:card:moved', data);
});

// Time tracking events  
socket.on('time:timer:start', async (data) => {
  // Handle timer start
  socket.to(`user:${socket.userId}`).emit('time:timer:started', data);
});
```

### Step 6: Testing Migration

#### Run Test Suite

```bash
# Run all tests
npm test

# Run specific feature tests
npm test -- --testPathPattern=kanban
npm test -- --testPathPattern=time-tracking
```

#### Manual Testing Checklist

- [ ] User authentication works
- [ ] Workspaces and projects load correctly
- [ ] Kanban boards are created for existing projects
- [ ] Time tracking functionality works
- [ ] Real-time events are working
- [ ] Data integrity is maintained

### Step 7: Performance Optimization

#### Enable Caching

Configure Redis caching:
```javascript
// Cache frequently accessed data
await cache.set(`project:${projectId}:boards`, boards, 300);
```

#### Optimize Queries

Use PostgreSQL-specific optimizations:
```sql
-- Create additional indexes for performance
CREATE INDEX CONCURRENTLY idx_kanban_cards_assignee_status 
ON kanban_cards(assignee_id, status) 
WHERE assignee_id IS NOT NULL;
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Errors

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U worksync_user -d worksync_v3
```

#### 2. Redis Connection Errors

```bash
# Check Redis is running
redis-cli ping

# Should respond with "PONG"
```

#### 3. Migration Fails

```bash
# Check logs
tail -f migration.log

# Restart with verbose logging
DEBUG=migration npm run migrate:phase3
```

#### 4. UUID Validation Errors

Ensure all ID fields are properly converted:
```javascript
// Validate UUIDs in requests
import { validateUUID } from '../utils/validation.js';

if (!validateUUID(userId)) {
  return res.status(400).json({ error: 'Invalid user ID format' });
}
```

### Data Integrity Checks

#### Verify Migration Results

```sql
-- Check user count
SELECT COUNT(*) FROM users;

-- Check project-workspace relationships
SELECT p.name, w.name 
FROM projects p 
JOIN workspaces w ON p.workspace_id = w.id;

-- Check Kanban boards were created
SELECT p.name as project, b.name as board 
FROM projects p 
JOIN kanban_boards b ON p.id = b.project_id;
```

#### Compare with Original Data

```bash
# Export MySQL data for comparison
mysqldump -u root -p worksync > mysql_backup.sql

# Count records in PostgreSQL
psql -U worksync_user -d worksync_v3 -c "
SELECT 
  'users' as table, COUNT(*) as count FROM users
UNION ALL
SELECT 
  'projects' as table, COUNT(*) as count FROM projects  
UNION ALL
SELECT 
  'tasks' as table, COUNT(*) as count FROM tasks;
"
```

## 🚀 Post-Migration Steps

### 1. Update Frontend

Update your frontend to use new API endpoints:
```javascript
// NEW Kanban API calls
const boards = await api.get(`/kanban/projects/${projectId}/boards`);
const timeEntries = await api.get('/time-tracking/entries');
```

### 2. Monitor Performance

Set up monitoring for the new stack:
```javascript
// Add health checks
app.get('/health', async (req, res) => {
  const dbHealth = await healthCheck();
  const redisHealth = await redisHealthCheck();
  
  res.json({
    status: 'healthy',
    services: { database: dbHealth, redis: redisHealth }
  });
});
```

### 3. Backup Strategy

Configure automated backups:
```bash
# PostgreSQL backup
pg_dump -U worksync_user worksync_v3 > backup_$(date +%Y%m%d).sql

# Redis backup  
redis-cli BGSAVE
```

### 4. Deploy to Production

1. **Test in staging environment first**
2. **Run migration during maintenance window**
3. **Monitor error logs closely**
4. **Have rollback plan ready**

## 📞 Support

If you encounter issues during migration:

1. **Check the troubleshooting section above**
2. **Review the migration logs**
3. **Test individual components**
4. **Reach out for support if needed**

### Migration Support Checklist

Before reaching out:
- [ ] PostgreSQL and Redis are properly installed
- [ ] Environment variables are correctly configured  
- [ ] Migration script completed without errors
- [ ] Test suite passes
- [ ] Sample data was created successfully

## 🎉 Success!

Once migration is complete, you'll have:

✅ **Modern PostgreSQL database** with UUID primary keys  
✅ **High-performance Redis caching** for better scalability  
✅ **Complete Kanban board system** with drag-and-drop  
✅ **Professional time tracking** with timers and reporting  
✅ **Enhanced real-time collaboration** features  
✅ **Scalable architecture** ready for production

Your WorkSync backend is now Phase 3 ready! 🚀
