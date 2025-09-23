-- Railway-Compatible Phase 3 Migration for WorkSync
-- Fixed version without IF NOT EXISTS for ALTER TABLE

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
    INDEX idx_kanban_columns_position (board_id, position)
);

-- Kanban Cards (tasks in visual format)
CREATE TABLE IF NOT EXISTS kanban_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    board_id INT NOT NULL,
    column_id INT NOT NULL,
    task_id INT DEFAULT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    position INT NOT NULL DEFAULT 0,
    color VARCHAR(7) DEFAULT NULL,
    labels JSON DEFAULT NULL,
    due_date DATE DEFAULT NULL,
    estimated_hours DECIMAL(5,2) DEFAULT NULL,
    assigned_to INT DEFAULT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    checklist JSON DEFAULT NULL,
    attachments JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    
    FOREIGN KEY (board_id) REFERENCES kanban_boards(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES kanban_columns(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_kanban_cards_board (board_id),
    INDEX idx_kanban_cards_column (column_id),
    INDEX idx_kanban_cards_position (column_id, position),
    INDEX idx_kanban_cards_assigned (assigned_to)
);

-- =====================================================
-- 2. TIME TRACKING SYSTEM
-- =====================================================

-- Time Entries
CREATE TABLE IF NOT EXISTS time_entries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    task_id INT DEFAULT NULL,
    project_id INT DEFAULT NULL,
    workspace_id INT NOT NULL,
    description TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP DEFAULT NULL,
    duration INT DEFAULT 0,
    is_billable BOOLEAN DEFAULT TRUE,
    hourly_rate DECIMAL(10,2) DEFAULT NULL,
    tags JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_time_entries_user (user_id),
    INDEX idx_time_entries_project (project_id),
    INDEX idx_time_entries_workspace (workspace_id),
    INDEX idx_time_entries_date (start_time)
);

-- =====================================================
-- 3. COLLABORATION SYSTEM
-- =====================================================

-- Comments system
CREATE TABLE IF NOT EXISTS comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    entity_type ENUM('TASK', 'PROJECT', 'KANBAN_CARD') NOT NULL,
    entity_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    parent_id INT DEFAULT NULL,
    mentions JSON DEFAULT NULL,
    attachments JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_comments_entity (entity_type, entity_id),
    INDEX idx_comments_user (user_id),
    INDEX idx_comments_created (created_at)
);

-- Real-time presence tracking
CREATE TABLE IF NOT EXISTS user_presence (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    workspace_id INT NOT NULL,
    status ENUM('ONLINE', 'AWAY', 'BUSY', 'OFFLINE') DEFAULT 'OFFLINE',
    current_page VARCHAR(255) DEFAULT NULL,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    socket_id VARCHAR(255) DEFAULT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_workspace (user_id, workspace_id),
    INDEX idx_presence_workspace (workspace_id),
    INDEX idx_presence_status (status)
);

-- =====================================================
-- 4. NOTIFICATIONS SYSTEM
-- =====================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    workspace_id INT NOT NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    action_url VARCHAR(500) DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_unread (user_id, is_read),
    INDEX idx_notifications_created (created_at)
);

-- =====================================================
-- 5. ANALYTICS & REPORTING
-- =====================================================

-- Project Analytics
CREATE TABLE IF NOT EXISTS project_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    date DATE NOT NULL,
    total_tasks INT DEFAULT 0,
    completed_tasks INT DEFAULT 0,
    in_progress_tasks INT DEFAULT 0,
    overdue_tasks INT DEFAULT 0,
    total_time_logged INT DEFAULT 0,
    productivity_score DECIMAL(5,2) DEFAULT 0.00,
    velocity DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_date (project_id, date),
    INDEX idx_analytics_project (project_id),
    INDEX idx_analytics_date (date)
);

-- User Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    workspace_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) DEFAULT NULL,
    entity_id INT DEFAULT NULL,
    details JSON DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_workspace (workspace_id),
    INDEX idx_activity_created (created_at),
    INDEX idx_activity_action (action)
);