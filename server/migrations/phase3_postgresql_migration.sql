-- Phase 3: PostgreSQL Migration with Full Feature Set
-- This script migrates from MySQL to PostgreSQL and implements all Phase 3 features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types (enums)
CREATE TYPE user_role AS ENUM ('admin', 'member');
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE card_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE milestone_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE deliverable_type AS ENUM ('document', 'code', 'design', 'review', 'other');
CREATE TYPE deliverable_status AS ENUM ('pending', 'in_progress', 'completed', 'rejected');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE conflict_status AS ENUM ('active', 'resolved', 'ignored');

-- 1. Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_seen TIMESTAMP DEFAULT NOW(),
    current_page VARCHAR(255),
    is_online BOOLEAN DEFAULT false,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Workspaces & Projects
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

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role workspace_role DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

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
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 3. Kanban Board System
CREATE TABLE kanban_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE card_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES kanban_cards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE card_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES kanban_cards(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'created', 'moved', 'assigned', etc.
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Project Templates
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

CREATE TABLE template_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    estimated_duration INTEGER, -- days
    created_at TIMESTAMP DEFAULT NOW()
);

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

CREATE TABLE template_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES project_templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    used_at TIMESTAMP DEFAULT NOW()
);

-- 5. Time Tracking
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

CREATE TABLE active_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    last_ping TIMESTAMP DEFAULT NOW()
);

-- 6. Milestone Management
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

CREATE TABLE milestone_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id UUID REFERENCES milestones(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(milestone_id, user_id)
);

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

-- 7. Resource Allocation
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

-- 8. Tasks (Enhanced)
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
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. Unified Comments System
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commentable_type VARCHAR(50) NOT NULL, -- 'task', 'project', 'milestone', 'card', etc.
    commentable_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(20) NOT NULL, -- 'like', 'love', 'laugh', etc.
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(comment_id, user_id, reaction)
);

-- 10. Files & Attachments
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

CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    attachable_type VARCHAR(50) NOT NULL, -- 'task', 'comment', 'project', etc.
    attachable_id UUID NOT NULL,
    attached_by UUID REFERENCES users(id),
    attached_at TIMESTAMP DEFAULT NOW()
);

-- 11. Notifications & Activities
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

-- 12. Real-time Collaboration (Phase 2 Enhanced)
CREATE TABLE user_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    current_page VARCHAR(255),
    last_activity TIMESTAMP DEFAULT NOW(),
    is_online BOOLEAN DEFAULT true,
    session_data JSONB
);

CREATE TABLE collaborative_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type VARCHAR(50) NOT NULL,
    item_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_data JSONB,
    cursor_position JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE yjs_documents (
    doc_name VARCHAR(255) PRIMARY KEY,
    document_data BYTEA,
    item_type VARCHAR(50) NOT NULL,
    item_id UUID NOT NULL,
    version_vector BYTEA,
    last_modified TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 13. Legacy support tables (for backward compatibility)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE task_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(task_id, tag_id)
);

CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    description TEXT,
    location VARCHAR(255),
    all_day BOOLEAN DEFAULT false,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Performance Indexes
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

-- Presence and collaboration indexes
CREATE INDEX idx_user_presence_workspace ON user_presence(workspace_id);
CREATE INDEX idx_collaborative_sessions_item ON collaborative_sessions(item_type, item_id);
CREATE INDEX idx_yjs_documents_item ON yjs_documents(item_type, item_id);
