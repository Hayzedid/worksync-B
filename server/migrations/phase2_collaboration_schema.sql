-- Phase 2 Collaboration Features Database Schema
-- Run this script to add new tables and columns for advanced collaboration

-- 1. Update users table for presence tracking
-- Note: MySQL doesn't support IF NOT EXISTS for ADD COLUMN, so we handle errors gracefully
ALTER TABLE users ADD COLUMN last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN current_page VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT false;

-- 2. Create comment_reactions table
CREATE TABLE IF NOT EXISTS comment_reactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comment_id INT NOT NULL,
  user_id INT NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_comment_emoji (comment_id, user_id, emoji)
);

-- 3. Create user_presence table for workspace presence tracking
CREATE TABLE IF NOT EXISTS user_presence (
  user_id INT PRIMARY KEY,
  workspace_id INT NOT NULL,
  current_page VARCHAR(255) DEFAULT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_online BOOLEAN DEFAULT true,
  session_data JSON DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- 4. Create collaborative_sessions table for real-time document editing
CREATE TABLE IF NOT EXISTS collaborative_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_type ENUM('task', 'note', 'project', 'workspace') NOT NULL,
  item_id INT NOT NULL,
  user_id INT NOT NULL,
  session_data JSON DEFAULT NULL,
  cursor_position JSON DEFAULT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_item_type_id (item_type, item_id),
  INDEX idx_user_active (user_id, is_active)
);

-- 5. Create yjs_documents table for Y.js document persistence
CREATE TABLE IF NOT EXISTS yjs_documents (
  doc_name VARCHAR(255) PRIMARY KEY,
  document_data LONGBLOB,
  item_type ENUM('task', 'note', 'project') NOT NULL,
  item_id INT NOT NULL,
  version_vector MEDIUMBLOB,
  last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_item_type_id (item_type, item_id)
);

-- 6. Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_comments_commentable ON comments(commentable_type, commentable_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_by ON comments(created_by);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_workspace ON user_presence(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_online ON user_presence(is_online);

-- Insert default workspace presence for existing users
INSERT IGNORE INTO user_presence (user_id, workspace_id, is_online)
SELECT u.id, 1, false FROM users u
WHERE NOT EXISTS (SELECT 1 FROM user_presence p WHERE p.user_id = u.id);
