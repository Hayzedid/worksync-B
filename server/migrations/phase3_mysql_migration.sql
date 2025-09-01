-- =====================================================
-- WorkSync Phase 3 MySQL Migration Schema
-- Transforms WorkSync to enterprise-grade platform
-- Compatible with existing MySQL infrastructure
-- =====================================================

-- Enable strict mode and set character set
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- 1. KANBAN BOARDS SYSTEM
-- =====================================================

-- Kanban Boards (project-level boards)
CREATE TABLE IF NOT EXISTS kanban_boards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    position INT NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_kanban_boards_project (project_id),
    INDEX idx_kanban_boards_position (project_id, position)
);

-- Kanban Columns (swim lanes)
CREATE TABLE IF NOT EXISTS kanban_columns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    board_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    position INT NOT NULL DEFAULT 0,
    wip_limit INT DEFAULT NULL,
    is_done_column BOOLEAN DEFAULT FALSE,
    settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    INDEX idx_kanban_columns_board (board_id),
    INDEX idx_kanban_columns_position (board_id, position),
    UNIQUE KEY unique_column_position (board_id, position)
);

-- Kanban Cards (enhanced tasks for boards)
CREATE TABLE IF NOT EXISTS kanban_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    board_id INT NOT NULL,
    column_id INT NOT NULL,
    task_id INT DEFAULT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assignee_id INT DEFAULT NULL,
    reporter_id INT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    status ENUM('ACTIVE', 'ARCHIVED', 'DELETED') DEFAULT 'ACTIVE',
    story_points INT DEFAULT NULL,
    estimated_hours DECIMAL(8,2) DEFAULT NULL,
    actual_hours DECIMAL(8,2) DEFAULT 0.00,
    due_date DATE DEFAULT NULL,
    position INT NOT NULL DEFAULT 0,
    labels JSON,
    custom_fields JSON,
    blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_kanban_cards_board (board_id),
    INDEX idx_kanban_cards_column (column_id),
    INDEX idx_kanban_cards_position (column_id, position),
    INDEX idx_kanban_cards_assignee (assignee_id),
    INDEX idx_kanban_cards_status (status, board_id),
    INDEX idx_kanban_cards_due_date (due_date),
    UNIQUE KEY unique_card_position (column_id, position)
);

-- Card Comments
CREATE TABLE IF NOT EXISTS kanban_card_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    card_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (card_id) REFERENCES kanban_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_card_comments_card (card_id),
    INDEX idx_card_comments_user (user_id)
);

-- Card Attachments
CREATE TABLE IF NOT EXISTS kanban_card_attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    card_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (card_id) REFERENCES kanban_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_card_attachments_card (card_id)
);

-- Card Activity Log
CREATE TABLE IF NOT EXISTS kanban_card_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    card_id INT NOT NULL,
    user_id INT NOT NULL,
    action ENUM(
        'CREATED', 'UPDATED', 'MOVED', 'ASSIGNED', 'UNASSIGNED',
        'COMMENTED', 'ATTACHMENT_ADDED', 'ATTACHMENT_REMOVED',
        'BLOCKED', 'UNBLOCKED', 'ARCHIVED', 'RESTORED'
    ) NOT NULL,
    details JSON,
    old_values JSON,
    new_values JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (card_id) REFERENCES kanban_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_card_activities_card (card_id),
    INDEX idx_card_activities_user (user_id),
    INDEX idx_card_activities_created (created_at)
);

-- =====================================================
-- 2. TIME TRACKING SYSTEM
-- =====================================================

-- Time Tracking Settings (user preferences)
CREATE TABLE IF NOT EXISTS time_tracking_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    default_hourly_rate DECIMAL(10,2) DEFAULT NULL,
    track_idle_time BOOLEAN DEFAULT TRUE,
    idle_timeout_minutes INT DEFAULT 15,
    auto_stop_timer BOOLEAN DEFAULT FALSE,
    daily_goal_hours DECIMAL(4,2) DEFAULT 8.00,
    weekly_goal_hours DECIMAL(5,2) DEFAULT 40.00,
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(20) DEFAULT 'HH:mm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Active Timers (only one active timer per user)
CREATE TABLE IF NOT EXISTS time_tracking_active_timers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    project_id INT DEFAULT NULL,
    task_id INT DEFAULT NULL,
    card_id INT DEFAULT NULL,
    description TEXT,
    started_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_paused BOOLEAN DEFAULT FALSE,
    paused_duration INT DEFAULT 0, -- seconds
    tags JSON,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES kanban_cards(id) ON DELETE CASCADE,
    INDEX idx_active_timers_project (project_id),
    INDEX idx_active_timers_task (task_id),
    INDEX idx_active_timers_card (card_id)
);

-- Time Entries (completed work sessions)
CREATE TABLE IF NOT EXISTS time_tracking_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    project_id INT DEFAULT NULL,
    task_id INT DEFAULT NULL,
    card_id INT DEFAULT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_seconds INT NOT NULL,
    is_billable BOOLEAN DEFAULT FALSE,
    hourly_rate DECIMAL(10,2) DEFAULT NULL,
    tags JSON,
    entry_type ENUM('TIMER', 'MANUAL') DEFAULT 'TIMER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES kanban_cards(id) ON DELETE CASCADE,
    INDEX idx_time_entries_user (user_id),
    INDEX idx_time_entries_project (project_id),
    INDEX idx_time_entries_date (start_time),
    INDEX idx_time_entries_billable (is_billable, user_id)
);

-- =====================================================
-- 3. MILESTONES & DELIVERABLES
-- =====================================================

-- Project Milestones
CREATE TABLE IF NOT EXISTS milestones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status ENUM('PLANNING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED') DEFAULT 'PLANNING',
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    owner_id INT DEFAULT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_milestones_project (project_id),
    INDEX idx_milestones_due_date (due_date),
    INDEX idx_milestones_status (status, project_id)
);

-- Milestone Deliverables
CREATE TABLE IF NOT EXISTS milestone_deliverables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    milestone_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED') DEFAULT 'NOT_STARTED',
    assignee_id INT DEFAULT NULL,
    due_date DATE DEFAULT NULL,
    completion_criteria TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    
    FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_deliverables_milestone (milestone_id),
    INDEX idx_deliverables_assignee (assignee_id)
);

-- =====================================================
-- 4. RESOURCE ALLOCATION
-- =====================================================

-- Team Member Capacity
CREATE TABLE IF NOT EXISTS resource_capacity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    workspace_id INT NOT NULL,
    weekly_hours DECIMAL(4,2) DEFAULT 40.00,
    start_date DATE NOT NULL,
    end_date DATE DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_capacity_user (user_id),
    INDEX idx_capacity_workspace (workspace_id),
    INDEX idx_capacity_date_range (start_date, end_date)
);

-- Resource Allocations
CREATE TABLE IF NOT EXISTS resource_allocations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    project_id INT NOT NULL,
    allocated_hours DECIMAL(6,2) NOT NULL,
    allocation_percentage DECIMAL(5,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('PROPOSED', 'CONFIRMED', 'ACTIVE', 'COMPLETED') DEFAULT 'PROPOSED',
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_allocations_user (user_id),
    INDEX idx_allocations_project (project_id),
    INDEX idx_allocations_date_range (start_date, end_date),
    INDEX idx_allocations_status (status)
);

-- =====================================================
-- 5. PROJECT TEMPLATES
-- =====================================================

-- Project Templates
CREATE TABLE IF NOT EXISTS project_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category ENUM('SOFTWARE', 'MARKETING', 'DESIGN', 'RESEARCH', 'GENERAL') DEFAULT 'GENERAL',
    template_data JSON NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_by INT NOT NULL,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_templates_category (category),
    INDEX idx_templates_public (is_public),
    INDEX idx_templates_creator (created_by)
);

-- Template Usage Analytics
CREATE TABLE IF NOT EXISTS template_usage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id INT NOT NULL,
    user_id INT NOT NULL,
    project_id INT DEFAULT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_template_usage_template (template_id),
    INDEX idx_template_usage_user (user_id),
    INDEX idx_template_usage_date (used_at)
);

-- =====================================================
-- 6. ENHANCED WORKSPACE FEATURES
-- =====================================================

-- Workspace Settings (enhanced)
CREATE TABLE IF NOT EXISTS workspace_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workspace_id INT NOT NULL UNIQUE,
    time_tracking_enabled BOOLEAN DEFAULT TRUE,
    kanban_enabled BOOLEAN DEFAULT TRUE,
    milestones_enabled BOOLEAN DEFAULT TRUE,
    resource_planning_enabled BOOLEAN DEFAULT TRUE,
    default_project_template_id INT DEFAULT NULL,
    work_hours_start TIME DEFAULT '09:00:00',
    work_hours_end TIME DEFAULT '17:00:00',
    default_hourly_rate DECIMAL(10,2) DEFAULT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(20) DEFAULT 'HH:mm',
    week_start_day ENUM('SUNDAY', 'MONDAY') DEFAULT 'MONDAY',
    custom_fields JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (default_project_template_id) REFERENCES project_templates(id) ON DELETE SET NULL
);

-- User Presence (for real-time collaboration)
CREATE TABLE IF NOT EXISTS user_presence (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    status ENUM('ONLINE', 'AWAY', 'BUSY', 'OFFLINE') DEFAULT 'OFFLINE',
    current_page VARCHAR(255) DEFAULT NULL,
    current_project_id INT DEFAULT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    socket_id VARCHAR(255) DEFAULT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (current_project_id) REFERENCES projects(id) ON DELETE SET NULL,
    INDEX idx_presence_status (status),
    INDEX idx_presence_project (current_project_id),
    INDEX idx_presence_activity (last_activity_at)
);

-- =====================================================
-- 7. ENHANCED EXISTING TABLES
-- =====================================================

-- Add Phase 3 columns to existing projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_type ENUM('KANBAN', 'TRADITIONAL', 'HYBRID') DEFAULT 'TRADITIONAL' AFTER description,
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(8,2) DEFAULT NULL AFTER project_type,
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(8,2) DEFAULT 0.00 AFTER estimated_hours,
ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2) DEFAULT NULL AFTER actual_hours,
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT NULL AFTER budget,
ADD COLUMN IF NOT EXISTS template_id INT DEFAULT NULL AFTER hourly_rate,
ADD COLUMN IF NOT EXISTS settings JSON AFTER template_id;

-- Add foreign key for template
ALTER TABLE projects 
ADD CONSTRAINT fk_projects_template 
FOREIGN KEY (template_id) REFERENCES project_templates(id) ON DELETE SET NULL;

-- Add Phase 3 columns to existing tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS story_points INT DEFAULT NULL AFTER priority,
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(6,2) DEFAULT NULL AFTER story_points,
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(6,2) DEFAULT 0.00 AFTER estimated_hours,
ADD COLUMN IF NOT EXISTS labels JSON AFTER actual_hours,
ADD COLUMN IF NOT EXISTS custom_fields JSON AFTER labels;

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_template ON projects(template_id);
CREATE INDEX IF NOT EXISTS idx_tasks_story_points ON tasks(story_points);
CREATE INDEX IF NOT EXISTS idx_tasks_estimated_hours ON tasks(estimated_hours);

-- =====================================================
-- 9. INSERT DEFAULT DATA
-- =====================================================

-- Default Kanban board columns
INSERT IGNORE INTO project_templates (name, description, category, template_data, is_public, created_by)
VALUES 
(
    'Basic Kanban Project',
    'Simple Kanban board with basic columns',
    'GENERAL',
    '{
        "columns": [
            {"name": "Backlog", "color": "#6B7280", "position": 0},
            {"name": "To Do", "color": "#3B82F6", "position": 1}, 
            {"name": "In Progress", "color": "#F59E0B", "position": 2},
            {"name": "Review", "color": "#8B5CF6", "position": 3},
            {"name": "Done", "color": "#10B981", "position": 4, "is_done_column": true}
        ],
        "settings": {
            "time_tracking_enabled": true,
            "story_points_enabled": true
        }
    }',
    TRUE,
    1
);

-- =====================================================
-- 10. VIEWS FOR REPORTING
-- =====================================================

-- Time tracking summary view
CREATE OR REPLACE VIEW time_tracking_summary AS
SELECT 
    u.id as user_id,
    u.username,
    p.id as project_id,
    p.name as project_name,
    COUNT(te.id) as total_entries,
    SUM(te.duration_seconds) as total_seconds,
    SUM(te.duration_seconds) / 3600 as total_hours,
    AVG(te.duration_seconds) as avg_session_seconds,
    SUM(CASE WHEN te.is_billable = 1 THEN te.duration_seconds ELSE 0 END) / 3600 as billable_hours,
    SUM(CASE WHEN te.is_billable = 1 AND te.hourly_rate IS NOT NULL 
        THEN (te.duration_seconds / 3600) * te.hourly_rate 
        ELSE 0 END) as total_earnings
FROM users u
LEFT JOIN time_tracking_entries te ON u.id = te.user_id
LEFT JOIN projects p ON te.project_id = p.id
WHERE te.start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id, p.id;

-- Project progress view
CREATE OR REPLACE VIEW project_progress AS
SELECT 
    p.id as project_id,
    p.name as project_name,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT kc.id) as total_cards,
    COUNT(DISTINCT CASE WHEN kcol.is_done_column = 1 THEN kc.id END) as completed_cards,
    COUNT(DISTINCT m.id) as total_milestones,
    COUNT(DISTINCT CASE WHEN m.status = 'COMPLETED' THEN m.id END) as completed_milestones,
    CASE 
        WHEN COUNT(DISTINCT t.id) > 0 
        THEN (COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END) * 100.0 / COUNT(DISTINCT t.id))
        ELSE 0 
    END as task_completion_percentage,
    CASE 
        WHEN COUNT(DISTINCT kc.id) > 0 
        THEN (COUNT(DISTINCT CASE WHEN kcol.is_done_column = 1 THEN kc.id END) * 100.0 / COUNT(DISTINCT kc.id))
        ELSE 0 
    END as card_completion_percentage
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id AND t.status != 'DELETED'
LEFT JOIN kanban_boards kb ON p.id = kb.project_id
LEFT JOIN kanban_cards kc ON kb.id = kc.board_id AND kc.status = 'ACTIVE'
LEFT JOIN kanban_columns kcol ON kc.column_id = kcol.id
LEFT JOIN milestones m ON p.id = m.project_id
GROUP BY p.id;

-- =====================================================
-- 11. TRIGGERS FOR AUTOMATION
-- =====================================================

-- Update project actual hours when time entries change
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS update_project_hours_on_time_entry
AFTER INSERT ON time_tracking_entries
FOR EACH ROW
BEGIN
    IF NEW.project_id IS NOT NULL THEN
        UPDATE projects 
        SET actual_hours = (
            SELECT COALESCE(SUM(duration_seconds) / 3600, 0)
            FROM time_tracking_entries 
            WHERE project_id = NEW.project_id
        )
        WHERE id = NEW.project_id;
    END IF;
END$$

-- Update card actual hours when time entries change
CREATE TRIGGER IF NOT EXISTS update_card_hours_on_time_entry
AFTER INSERT ON time_tracking_entries
FOR EACH ROW
BEGIN
    IF NEW.card_id IS NOT NULL THEN
        UPDATE kanban_cards 
        SET actual_hours = (
            SELECT COALESCE(SUM(duration_seconds) / 3600, 0)
            FROM time_tracking_entries 
            WHERE card_id = NEW.card_id
        )
        WHERE id = NEW.card_id;
    END IF;
END$$

-- Auto-complete milestone when all deliverables are done
CREATE TRIGGER IF NOT EXISTS check_milestone_completion
AFTER UPDATE ON milestone_deliverables
FOR EACH ROW
BEGIN
    DECLARE incomplete_count INT DEFAULT 0;
    
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        SELECT COUNT(*) INTO incomplete_count
        FROM milestone_deliverables
        WHERE milestone_id = NEW.milestone_id
        AND status != 'COMPLETED';
        
        IF incomplete_count = 0 THEN
            UPDATE milestones 
            SET status = 'COMPLETED', 
                progress_percentage = 100.00,
                completed_at = NOW()
            WHERE id = NEW.milestone_id
            AND status != 'COMPLETED';
        END IF;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- 12. FINAL SETUP
-- =====================================================

-- Create default workspace settings for existing workspaces
INSERT IGNORE INTO workspace_settings (workspace_id)
SELECT id FROM workspaces;

-- Create default time tracking settings for existing users
INSERT IGNORE INTO time_tracking_settings (user_id)
SELECT id FROM users;

-- Success message
SELECT 'Phase 3 MySQL migration completed successfully!' as message;
