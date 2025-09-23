# WorkSync Backend Requirements

## 📋 Overview
This document outlines the comprehensive backend requirements for the WorkSync project management platform, including all Phase 3 advanced features: Kanban boards, project templates, time tracking, milestone management, and resource allocation.

## 🏗️ System Architecture

### Core Technology Stack
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js or Fastify
- **Database**: PostgreSQL 14+ (primary) + Redis (caching/sessions)
- **Real-time**: Socket.IO for live collaboration
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 or compatible object storage
- **Search**: Elasticsearch (optional for advanced search)

### API Architecture
- **Pattern**: RESTful API with GraphQL endpoints (optional)
- **Documentation**: OpenAPI/Swagger
- **Versioning**: URL versioning (/api/v1/)
- **Rate Limiting**: Redis-based rate limiting
- **CORS**: Configurable CORS policies

## 🗄️ Database Schema

### Core Entities

#### 1. Users & Authentication
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions for JWT refresh tokens
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Workspaces & Projects
```sql
-- Workspaces
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Workspace members
CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role workspace_role DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status project_status DEFAULT 'planning',
    priority project_priority DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    owner_id UUID REFERENCES users(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project members
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);
```

#### 3. Kanban Board System
```sql
-- Kanban boards
CREATE TABLE kanban_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Kanban columns
CREATE TABLE kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,
    color VARCHAR(7), -- hex color
    wip_limit INTEGER,
    is_done_column BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Kanban cards
CREATE TABLE kanban_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    column_id UUID REFERENCES kanban_columns(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    priority card_priority DEFAULT 'medium',
    due_date TIMESTAMP,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    assignee_id UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    labels JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Card comments
CREATE TABLE card_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES kanban_cards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Card activities (for audit trail)
CREATE TABLE card_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES kanban_cards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'created', 'moved', 'assigned', etc.
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. Project Templates
```sql
-- Project templates
CREATE TABLE project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    tags TEXT[],
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    usage_count INTEGER DEFAULT 0,
    template_data JSONB NOT NULL, -- phases, tasks, milestones
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Template phases
CREATE TABLE template_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    estimated_duration INTEGER, -- days
    created_at TIMESTAMP DEFAULT NOW()
);

-- Template tasks
CREATE TABLE template_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID REFERENCES template_phases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_hours DECIMAL(5,2),
    dependencies JSONB DEFAULT '[]',
    required_skills TEXT[],
    position INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Template usage analytics
CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    used_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. Time Tracking
```sql
-- Time entries
CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES kanban_cards(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER, -- seconds, calculated field
    is_running BOOLEAN DEFAULT false,
    is_billable BOOLEAN DEFAULT true,
    hourly_rate DECIMAL(8,2),
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Time tracking settings per user
CREATE TABLE time_tracking_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    default_hourly_rate DECIMAL(8,2),
    auto_stop_timer BOOLEAN DEFAULT true,
    auto_stop_duration INTEGER DEFAULT 3600, -- seconds
    require_description BOOLEAN DEFAULT true,
    default_billable BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Time tracking timers (for active timers)
CREATE TABLE active_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    last_ping TIMESTAMP DEFAULT NOW()
);
```

#### 6. Milestone Management
```sql
-- Milestones
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status milestone_status DEFAULT 'pending',
    priority milestone_priority DEFAULT 'medium',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    dependencies JSONB DEFAULT '[]', -- array of milestone IDs
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Milestone assignees
CREATE TABLE milestone_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(milestone_id, user_id)
);

-- Deliverables
CREATE TABLE deliverables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type deliverable_type DEFAULT 'document',
    status deliverable_status DEFAULT 'pending',
    due_date DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Deliverable files
CREATE TABLE deliverable_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Milestone templates
CREATE TABLE milestone_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    milestones_data JSONB NOT NULL,
    deliverables_data JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id),
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. Resource Allocation
```sql
-- Team members (extended user info for resource management)
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    role VARCHAR(100),
    skills TEXT[],
    capacity INTEGER DEFAULT 40, -- hours per week
    hourly_rate DECIMAL(8,2),
    availability JSONB DEFAULT '{}', -- availability schedule
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, workspace_id)
);

-- Resource allocations
CREATE TABLE resource_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    role VARCHAR(100),
    hours_per_week DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Resource conflicts
CREATE TABLE resource_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    conflicting_allocations JSONB NOT NULL, -- array of allocation IDs
    overallocation_percentage DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status conflict_status DEFAULT 'active',
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_details JSONB,
    detected_at TIMESTAMP DEFAULT NOW()
);

-- Utilization metrics (computed/cached data)
CREATE TABLE utilization_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_capacity DECIMAL(8,2) NOT NULL,
    allocated_hours DECIMAL(8,2) NOT NULL,
    actual_hours DECIMAL(8,2) DEFAULT 0,
    utilization_percentage DECIMAL(5,2) NOT NULL,
    efficiency_score DECIMAL(5,2),
    computed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, workspace_id, period_start, period_end)
);
```

#### 8. Tasks & Comments
```sql
-- Tasks (linked to projects and milestones)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status DEFAULT 'todo',
    priority task_priority DEFAULT 'medium',
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2) DEFAULT 0,
    assignee_id UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    tags TEXT[],
    dependencies JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comments (unified commenting system)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commentable_type VARCHAR(50) NOT NULL, -- 'task', 'project', 'milestone', etc.
    commentable_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comment reactions
CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(20) NOT NULL, -- 'like', 'love', 'laugh', etc.
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(comment_id, user_id, reaction)
);
```

#### 9. Files & Attachments
```sql
-- File uploads
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum VARCHAR(64), -- SHA-256 hash
    uploaded_by UUID REFERENCES users(id),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Attachments (polymorphic relationship)
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    attachable_type VARCHAR(50) NOT NULL, -- 'task', 'comment', 'project', etc.
    attachable_id UUID NOT NULL,
    attached_by UUID REFERENCES users(id),
    attached_at TIMESTAMP DEFAULT NOW()
);
```

#### 10. Notifications & Activities
```sql
-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Activity feed
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    object_type VARCHAR(50) NOT NULL,
    object_id UUID NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Custom Types (Enums)
```sql
-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'member');

-- Workspace roles
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');

-- Project status
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');

-- Project priority
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Card priority
CREATE TYPE card_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Milestone status
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Milestone priority
CREATE TYPE milestone_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Deliverable type
CREATE TYPE deliverable_type AS ENUM ('document', 'code', 'design', 'review', 'other');

-- Deliverable status
CREATE TYPE deliverable_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected');

-- Task status
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'cancelled');

-- Task priority
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Conflict status
CREATE TYPE conflict_status AS ENUM ('active', 'resolved', 'ignored');
```

### Indexes for Performance
```sql
-- Core indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_projects_workspace ON projects(workspace_id);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- Kanban indexes
CREATE INDEX idx_kanban_boards_project ON kanban_boards(project_id);
CREATE INDEX idx_kanban_columns_board ON kanban_columns(board_id);
CREATE INDEX idx_kanban_cards_column ON kanban_cards(column_id);
CREATE INDEX idx_kanban_cards_assignee ON kanban_cards(assignee_id);
CREATE INDEX idx_card_comments_card ON card_comments(card_id);
CREATE INDEX idx_card_activities_card ON card_activities(card_id);

-- Time tracking indexes
CREATE INDEX idx_time_entries_user ON time_entries(user_id);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX idx_active_timers_user ON active_timers(user_id);

-- Milestone indexes
CREATE INDEX idx_milestones_project ON milestones(project_id);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
CREATE INDEX idx_milestone_assignees_milestone ON milestone_assignees(milestone_id);
CREATE INDEX idx_deliverables_milestone ON deliverables(milestone_id);

-- Resource allocation indexes
CREATE INDEX idx_team_members_workspace ON team_members(workspace_id);
CREATE INDEX idx_resource_allocations_user ON resource_allocations(user_id);
CREATE INDEX idx_resource_allocations_project ON resource_allocations(project_id);
CREATE INDEX idx_resource_conflicts_user ON resource_conflicts(user_id);
CREATE INDEX idx_utilization_metrics_user_period ON utilization_metrics(user_id, period_start, period_end);

-- Task indexes
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_milestone ON tasks(milestone_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Comment indexes
CREATE INDEX idx_comments_commentable ON comments(commentable_type, commentable_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comment_reactions_comment ON comment_reactions(comment_id);

-- File indexes
CREATE INDEX idx_files_workspace ON files(workspace_id);
CREATE INDEX idx_attachments_attachable ON attachments(attachable_type, attachable_id);

-- Notification indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_activities_workspace ON activities(workspace_id);
```

## 🔌 API Endpoints

### Authentication & Users
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
PUT    /api/v1/auth/me
PUT    /api/v1/auth/password

GET    /api/v1/users
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id
```

### Workspaces
```
GET    /api/v1/workspaces
POST   /api/v1/workspaces
GET    /api/v1/workspaces/:id
PUT    /api/v1/workspaces/:id
DELETE /api/v1/workspaces/:id

GET    /api/v1/workspaces/:id/members
POST   /api/v1/workspaces/:id/members
PUT    /api/v1/workspaces/:id/members/:userId
DELETE /api/v1/workspaces/:id/members/:userId

GET    /api/v1/workspaces/:id/invite/:token
POST   /api/v1/workspaces/:id/invite
```

### Projects
```
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PUT    /api/v1/projects/:id
DELETE /api/v1/projects/:id

GET    /api/v1/projects/:id/members
POST   /api/v1/projects/:id/members
DELETE /api/v1/projects/:id/members/:userId

GET    /api/v1/projects/:id/analytics
GET    /api/v1/projects/:id/activity
```

### Kanban Boards
```
GET    /api/v1/projects/:projectId/boards
POST   /api/v1/projects/:projectId/boards
GET    /api/v1/boards/:id
PUT    /api/v1/boards/:id
DELETE /api/v1/boards/:id

GET    /api/v1/boards/:boardId/columns
POST   /api/v1/boards/:boardId/columns
PUT    /api/v1/columns/:id
DELETE /api/v1/columns/:id
PUT    /api/v1/columns/:id/position

GET    /api/v1/columns/:columnId/cards
POST   /api/v1/columns/:columnId/cards
GET    /api/v1/cards/:id
PUT    /api/v1/cards/:id
DELETE /api/v1/cards/:id
PUT    /api/v1/cards/:id/move

GET    /api/v1/cards/:cardId/comments
POST   /api/v1/cards/:cardId/comments
PUT    /api/v1/comments/:id
DELETE /api/v1/comments/:id

GET    /api/v1/cards/:cardId/activities
```

### Project Templates
```
GET    /api/v1/templates
POST   /api/v1/templates
GET    /api/v1/templates/:id
PUT    /api/v1/templates/:id
DELETE /api/v1/templates/:id

POST   /api/v1/templates/:id/use
GET    /api/v1/templates/categories
GET    /api/v1/templates/search
GET    /api/v1/templates/:id/analytics
```

### Time Tracking
```
GET    /api/v1/time-entries
POST   /api/v1/time-entries
GET    /api/v1/time-entries/:id
PUT    /api/v1/time-entries/:id
DELETE /api/v1/time-entries/:id

POST   /api/v1/time-tracking/start
PUT    /api/v1/time-tracking/stop
PUT    /api/v1/time-tracking/pause
PUT    /api/v1/time-tracking/resume

GET    /api/v1/time-tracking/active
GET    /api/v1/time-tracking/today
GET    /api/v1/time-tracking/week
GET    /api/v1/time-tracking/report

GET    /api/v1/time-tracking/settings
PUT    /api/v1/time-tracking/settings
```

### Milestones
```
GET    /api/v1/projects/:projectId/milestones
POST   /api/v1/projects/:projectId/milestones
GET    /api/v1/milestones/:id
PUT    /api/v1/milestones/:id
DELETE /api/v1/milestones/:id

GET    /api/v1/milestones/:id/deliverables
POST   /api/v1/milestones/:id/deliverables
PUT    /api/v1/deliverables/:id
DELETE /api/v1/deliverables/:id

GET    /api/v1/projects/:projectId/critical-path
GET    /api/v1/projects/:projectId/milestone-report
POST   /api/v1/milestones/from-template
```

### Resource Allocation
```
GET    /api/v1/workspaces/:workspaceId/allocations
POST   /api/v1/workspaces/:workspaceId/allocations
GET    /api/v1/allocations/:id
PUT    /api/v1/allocations/:id
DELETE /api/v1/allocations/:id

GET    /api/v1/workspaces/:workspaceId/team-members
POST   /api/v1/workspaces/:workspaceId/team-members
PUT    /api/v1/team-members/:id

GET    /api/v1/workspaces/:workspaceId/conflicts
PUT    /api/v1/conflicts/:id/resolve

GET    /api/v1/workspaces/:workspaceId/utilization
GET    /api/v1/workspaces/:workspaceId/capacity-forecast
POST   /api/v1/workspaces/:workspaceId/optimize-allocations

PUT    /api/v1/allocations/bulk-update
```

### Tasks
```
GET    /api/v1/projects/:projectId/tasks
POST   /api/v1/projects/:projectId/tasks
GET    /api/v1/tasks/:id
PUT    /api/v1/tasks/:id
DELETE /api/v1/tasks/:id

GET    /api/v1/tasks/:taskId/comments
POST   /api/v1/tasks/:taskId/comments
```

### Files & Attachments
```
POST   /api/v1/files/upload
GET    /api/v1/files/:id
DELETE /api/v1/files/:id

POST   /api/v1/attachments
DELETE /api/v1/attachments/:id
```

### Notifications
```
GET    /api/v1/notifications
PUT    /api/v1/notifications/:id/read
PUT    /api/v1/notifications/mark-all-read
DELETE /api/v1/notifications/:id
```

### Analytics & Reports
```
GET    /api/v1/analytics/dashboard
GET    /api/v1/analytics/projects/:projectId
GET    /api/v1/analytics/time-tracking
GET    /api/v1/analytics/resource-utilization
GET    /api/v1/analytics/milestones
```

## 🔄 Real-time Events (Socket.IO)

### Connection Management
```javascript
// Client connects to workspace
socket.join(`workspace:${workspaceId}`)
socket.join(`user:${userId}`)
```

### Kanban Board Events
```javascript
// Board updates
'kanban:board:updated'
'kanban:column:created'
'kanban:column:updated'
'kanban:column:deleted'

// Card events
'kanban:card:created'
'kanban:card:updated'
'kanban:card:moved'
'kanban:card:deleted'
'kanban:card:assigned'

// Comments
'kanban:comment:created'
'kanban:comment:updated'
'kanban:comment:deleted'
```

### Time Tracking Events
```javascript
'time:timer:started'
'time:timer:stopped'
'time:timer:paused'
'time:timer:resumed'
'time:entry:created'
'time:entry:updated'
```

### Project Events
```javascript
'project:created'
'project:updated'
'project:member:added'
'project:member:removed'
'project:status:changed'
```

### Milestone Events
```javascript
'milestone:created'
'milestone:updated'
'milestone:completed'
'milestone:deliverable:added'
'milestone:progress:updated'
```

### Resource Allocation Events
```javascript
'resource:allocation:created'
'resource:allocation:updated'
'resource:conflict:detected'
'resource:conflict:resolved'
'resource:utilization:updated'
```

### Notification Events
```javascript
'notification:created'
'notification:read'
'notification:batch'
```

## 🔐 Security Requirements

### Authentication & Authorization
- **JWT Implementation**: Access tokens (15min) + Refresh tokens (30 days)
- **Password Security**: bcrypt with salt rounds 12+
- **Rate Limiting**: 100 requests/minute per IP, 1000/hour per user
- **CORS**: Configurable origins, secure defaults
- **CSRF Protection**: SameSite cookies, CSRF tokens for state-changing operations

### Input Validation
- **Request Validation**: Joi or Zod schemas for all endpoints
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Prevention**: Content sanitization, CSP headers
- **File Upload Security**: Type validation, size limits, virus scanning

### Data Protection
- **Encryption at Rest**: Database encryption for sensitive fields
- **Encryption in Transit**: TLS 1.3, HSTS headers
- **Personal Data**: GDPR compliance, data anonymization options
- **Audit Logging**: Security events, data access logs

## 📊 Performance Requirements

### Database Optimization
- **Connection Pooling**: pgbouncer or built-in pooling
- **Query Optimization**: Proper indexing, query analysis
- **Caching Strategy**: Redis for sessions, frequently accessed data
- **Database Partitioning**: Time-based partitioning for large tables

### API Performance
- **Response Times**: <200ms for simple queries, <1s for complex operations
- **Pagination**: Cursor-based pagination for large datasets
- **Compression**: gzip/brotli compression
- **CDN**: Static asset delivery via CDN

### Scalability
- **Horizontal Scaling**: Stateless application design
- **Load Balancing**: Session affinity for Socket.IO
- **Database Scaling**: Read replicas, connection pooling
- **Monitoring**: APM tools, health checks, metrics collection

## 🧪 Testing Requirements

### Unit Testing
- **Coverage**: Minimum 80% code coverage
- **Framework**: Jest or Vitest
- **Mocking**: Database and external service mocks

### Integration Testing
- **Database**: Test database with seed data
- **API Testing**: Supertest for endpoint testing
- **Real-time**: Socket.IO testing with mock clients

### End-to-End Testing
- **Automation**: Playwright or Cypress
- **Critical Paths**: User registration, project creation, time tracking
- **Performance**: Load testing with artillery or k6

## 🚀 Deployment & DevOps

### Environment Configuration
```yaml
# Production environment variables
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Authentication
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# File Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...
S3_REGION=...

# Email
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...

# External Services
REDIS_URL=...
ELASTICSEARCH_URL=...

# Security
CORS_ORIGIN=https://yourapp.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=...
NEW_RELIC_LICENSE_KEY=...
```

### Docker Configuration
```dockerfile
# Multi-stage production Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### CI/CD Pipeline
- **Linting**: ESLint, Prettier
- **Testing**: Unit, integration, e2e tests
- **Security**: Dependency scanning, SAST tools
- **Deployment**: Blue-green or rolling deployments
- **Monitoring**: Health checks, error tracking

## 📈 Monitoring & Logging

### Application Monitoring
- **APM**: New Relic, Datadog, or Application Insights
- **Error Tracking**: Sentry for error monitoring
- **Metrics**: Prometheus + Grafana for custom metrics
- **Uptime**: Health check endpoints

### Logging Strategy
```javascript
// Structured logging with Winston
{
  level: 'info',
  timestamp: '2024-01-01T00:00:00.000Z',
  userId: 'uuid',
  workspaceId: 'uuid',
  action: 'kanban:card:moved',
  metadata: { cardId: 'uuid', fromColumn: 'uuid', toColumn: 'uuid' }
}
```

### Security Monitoring
- **Authentication Logs**: Failed login attempts, suspicious activity
- **Authorization Logs**: Permission denials, privilege escalations
- **Data Access**: Sensitive data access patterns
- **Rate Limiting**: Blocked requests, abuse patterns

## 🔧 Additional Requirements

### Email Service
- **Templates**: Welcome, password reset, notifications
- **Queuing**: Background job processing for emails
- **Deliverability**: SPF, DKIM, DMARC configuration

### Background Jobs
- **Queue System**: Bull/BullMQ with Redis
- **Job Types**: Email sending, report generation, data cleanup
- **Monitoring**: Job success/failure rates, queue health

### Data Backup & Recovery
- **Database Backups**: Daily automated backups with retention
- **File Backups**: S3 cross-region replication
- **Recovery Testing**: Regular restore testing
- **Point-in-time Recovery**: Transaction log backups

### Compliance & Data Governance
- **GDPR**: Data portability, right to deletion
- **Data Retention**: Configurable retention policies
- **Audit Trail**: Complete activity logging
- **Data Export**: User data export functionality

This comprehensive backend specification covers all aspects needed to implement the WorkSync project management platform with advanced features. The architecture is designed for scalability, security, and maintainability while supporting real-time collaboration and comprehensive project management capabilities.
