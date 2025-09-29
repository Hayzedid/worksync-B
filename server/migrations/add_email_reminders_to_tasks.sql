-- Add email_reminders column to tasks table for notification preferences
ALTER TABLE tasks ADD COLUMN email_reminders BOOLEAN DEFAULT FALSE;

-- Add indexes for better performance on reminder queries
CREATE INDEX idx_tasks_due_date_reminders ON tasks (due_date, email_reminders);
CREATE INDEX idx_tasks_created_by_reminders ON tasks (created_by, email_reminders);