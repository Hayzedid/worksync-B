-- SQL to create missing tables for comments and events functionality
-- Run these commands in Railway's database interface or via Railway CLI

-- Create events table if it doesn't exist
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    start DATETIME NOT NULL,
    end DATETIME NOT NULL,
    owner_id INT NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    location VARCHAR(255) DEFAULT NULL,
    description TEXT DEFAULT NULL,
    workspace_id INT DEFAULT NULL,
    project_id INT DEFAULT NULL,
    category VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    INDEX idx_events_owner (owner_id),
    INDEX idx_events_workspace (workspace_id),
    INDEX idx_events_dates (start_date, end_date)
);

-- Create comment_reactions table if it doesn't exist (for comment reactions)
CREATE TABLE IF NOT EXISTS comment_reactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comment_id INT NOT NULL,
    user_id INT NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_emoji_comment (user_id, comment_id, emoji),
    INDEX idx_reactions_comment (comment_id)
);

-- Verify tables exist
SHOW TABLES LIKE 'events';
SHOW TABLES LIKE 'comment_reactions';
SHOW TABLES LIKE 'comments';

-- Show structure of comments table to verify field names
DESCRIBE comments;