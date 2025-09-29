-- Migration: Add email_reminders column to tasks table
-- Date: 2025-09-29
-- Description: Adds email reminder functionality to tasks

-- Add email_reminders column to tasks table if it doesn't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS email_reminders BOOLEAN DEFAULT FALSE;

-- Update existing tasks to have email reminders disabled by default
UPDATE tasks SET email_reminders = FALSE WHERE email_reminders IS NULL;