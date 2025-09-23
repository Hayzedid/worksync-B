-- Update task status ENUM to include 'review' and 'cancelled' statuses
USE worksync;

-- Add new status values to the ENUM
ALTER TABLE tasks 
MODIFY COLUMN status ENUM('todo', 'in_progress', 'done', 'review', 'cancelled', 'archived') DEFAULT 'todo';

-- Verify the change
DESCRIBE tasks;
