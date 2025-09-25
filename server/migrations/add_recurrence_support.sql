-- Add recurrence support to tasks and events tables
-- This migration adds the necessary columns for recurring tasks and events

-- Add recurrence columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS recurrence_pattern ENUM('none', 'daily', 'weekly', 'monthly', 'yearly') DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurrence_interval INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE NULL,
ADD COLUMN IF NOT EXISTS recurrence_days_of_week JSON NULL,
ADD COLUMN IF NOT EXISTS recurrence_day_of_month INT NULL,
ADD COLUMN IF NOT EXISTS last_recurrence_date DATE NULL,
ADD COLUMN IF NOT EXISTS parent_recurring_task_id INT NULL,
ADD COLUMN IF NOT EXISTS is_recurring_template BOOLEAN DEFAULT FALSE;

-- Add recurrence columns to events table  
ALTER TABLE events
ADD COLUMN IF NOT EXISTS recurrence_pattern ENUM('none', 'daily', 'weekly', 'monthly', 'yearly') DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurrence_interval INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE NULL,
ADD COLUMN IF NOT EXISTS recurrence_days_of_week JSON NULL,
ADD COLUMN IF NOT EXISTS recurrence_day_of_month INT NULL,
ADD COLUMN IF NOT EXISTS last_recurrence_date DATE NULL,
ADD COLUMN IF NOT EXISTS parent_recurring_event_id INT NULL,
ADD COLUMN IF NOT EXISTS is_recurring_template BOOLEAN DEFAULT FALSE;

-- Add foreign key constraints for parent recurring items
ALTER TABLE tasks 
ADD CONSTRAINT fk_tasks_parent_recurring 
FOREIGN KEY (parent_recurring_task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE events 
ADD CONSTRAINT fk_events_parent_recurring 
FOREIGN KEY (parent_recurring_event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence_pattern, is_recurring_template);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_recurring ON tasks(parent_recurring_task_id);
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON events(recurrence_pattern, is_recurring_template);
CREATE INDEX IF NOT EXISTS idx_events_parent_recurring ON events(parent_recurring_event_id);
