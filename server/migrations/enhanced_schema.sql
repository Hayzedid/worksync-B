-- Enhanced WorkSync Database Schema with Email Reminders
-- Compatible with both local development and Railway production

-- Ensure tasks table has all required columns for the enhanced functionality
-- This can be run safely on both new and existing databases

-- For Railway/Production: Add email_reminders column if missing
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'tasks' 
    AND COLUMN_NAME = 'email_reminders'
);

SET @sql = IF(@column_exists = 0, 
  'ALTER TABLE tasks ADD COLUMN email_reminders BOOLEAN DEFAULT FALSE;', 
  'SELECT "email_reminders column already exists" as status;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure all existing tasks have email_reminders set to FALSE by default
UPDATE tasks SET email_reminders = FALSE WHERE email_reminders IS NULL;

-- Create reminders table for tracking sent reminders (prevents duplicates)
CREATE TABLE IF NOT EXISTS reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  event_id INT NULL,
  reminder_type ENUM('24h', '1h') NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  recipient_email VARCHAR(255) NOT NULL,
  status ENUM('sent', 'failed', 'pending') DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE KEY unique_task_reminder (task_id, reminder_type),
  INDEX idx_reminder_lookup (task_id, reminder_type, sent_at)
);

-- Create newsletter_subscriptions table if not exists (for email service)
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);