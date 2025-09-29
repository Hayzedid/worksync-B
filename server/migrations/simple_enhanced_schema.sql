-- Simplified Enhanced WorkSync Database Schema with Email Reminders
-- This migration adds email reminder functionality to the existing database

-- Add email_reminders column to tasks table (ignore error if column already exists)
ALTER TABLE tasks ADD COLUMN email_reminders BOOLEAN DEFAULT FALSE;

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