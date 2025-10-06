# Railway Database Update Guide

This guide will help you synchronize your local database structure with your Railway production database.

## 🚀 Quick Update (Recommended)

### Step 1: Set Up Environment Variables

Create/update your `.env` file with Railway database credentials:

```env
# Railway Database Connection
RAILWAY_DB_HOST=your-railway-mysql-host
RAILWAY_DB_PORT=3306
RAILWAY_DB_USER=your-railway-db-user
RAILWAY_DB_PASSWORD=your-railway-db-password
RAILWAY_DB_NAME=railway

# Alternative: Use standard DB_ variables
DB_HOST=your-railway-mysql-host
DB_PORT=3306
DB_USER=your-railway-db-user
DB_PASSWORD=your-railway-db-password
DB_NAME=railway
```

### Step 2: Run the Update Script

```bash
cd worksync/server
node update-railway-db.js
```

This script will:
- ✅ Apply Phase 3 schema (Kanban, Analytics, Time Tracking)
- ✅ Set up newsletter system
- ✅ Update task status options
- ✅ Configure email reminders
- ✅ Verify all critical tables

## 🔧 Manual Update (Alternative)

If the automated script fails, you can update manually:

### Step 1: Connect to Railway Database

Use Railway CLI or a MySQL client:

```bash
# Using Railway CLI
railway connect mysql

# Or use MySQL Workbench/phpMyAdmin with your Railway credentials
```

### Step 2: Run Individual Migrations

#### A. Phase 3 Complete Schema
```sql
-- Run the entire PHASE3_MYSQL_COMPLETE.sql file
-- This adds Kanban boards, analytics, time tracking, and more
```

#### B. Newsletter System
```sql
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  status ENUM('active', 'unsubscribed', 'bounced') DEFAULT 'active',
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('draft', 'sent') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  template_type ENUM('welcome', 'newsletter') DEFAULT 'newsletter',
  subject VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### C. Update Task Status
```sql
ALTER TABLE tasks MODIFY COLUMN status 
ENUM('todo', 'in_progress', 'done', 'review', 'cancelled', 'on_hold') 
DEFAULT 'todo';
```

#### D. Email Reminders Table
```sql
CREATE TABLE IF NOT EXISTS reminders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NULL,
  event_id INT NULL,
  reminder_type VARCHAR(10) NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_task_reminder (task_id, reminder_type),
  UNIQUE KEY unique_event_reminder (event_id, reminder_type)
);
```

## 📋 What Gets Updated

### Core Tables (Enhanced)
- `users` - User accounts with enhanced profiles
- `workspaces` - Team workspaces  
- `workspace_members` - Member relationships
- `projects` - Project management
- `tasks` - Enhanced task system with new statuses
- `events` - Calendar events
- `comments` - Commenting system
- `notifications` - Real-time notifications

### New Phase 3 Features
- `kanban_boards` - Project Kanban boards
- `kanban_columns` - Board columns/swim lanes
- `time_tracking_entries` - Time tracking
- `project_analytics` - Analytics data
- `team_members` - Enhanced team profiles
- `milestone_tasks` - Milestone tracking
- `project_templates` - Reusable templates

### Email System
- `newsletter_subscribers` - Email subscribers
- `newsletter_campaigns` - Email campaigns
- `newsletter_templates` - Email templates
- `reminders` - Automated email reminders

### Collaboration Features
- `reactions` - Emoji reactions
- `mentions` - User mentions
- `file_attachments` - File uploads
- `project_invitations` - Project invites

## 🔍 Verification

After running the update, verify your database:

```sql
-- Check table count
SELECT COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema = DATABASE();

-- List all tables
SHOW TABLES;

-- Check specific critical tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name IN ('users', 'tasks', 'projects', 'kanban_boards', 'reminders');
```

## 🚨 Troubleshooting

### Connection Issues
```bash
# Test Railway connection
railway status
railway shell

# Check environment variables
echo $RAILWAY_DB_HOST
```

### Permission Issues
- Ensure your Railway database user has `CREATE`, `ALTER`, `INSERT` permissions
- Contact Railway support if needed

### Migration Errors
```sql
-- Check existing structure
DESCRIBE tasks;
DESCRIBE projects;

-- Drop and recreate if needed (⚠️ DANGER: Will lose data)
-- Only use in development
DROP TABLE IF EXISTS problematic_table;
```

## 🎯 Next Steps

After database update:

1. **Deploy Backend**: `railway up` in `worksync/server`
2. **Update Frontend**: Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
3. **Test Features**: Verify all functionality works with production database
4. **Monitor**: Check Railway logs for any issues

## 📞 Support

If you encounter issues:
1. Check Railway dashboard for database status
2. Review Railway logs
3. Verify all environment variables
4. Test connection with a MySQL client
5. Check this guide's troubleshooting section

---

**⚠️ Important**: Always backup your production database before running major updates!