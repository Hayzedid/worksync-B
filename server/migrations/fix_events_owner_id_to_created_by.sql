-- Fix events table schema to use created_by instead of owner_id
-- This aligns production with local database schema

-- Add created_by column
ALTER TABLE events 
ADD COLUMN created_by INT NOT NULL AFTER category;

-- Copy data from owner_id to created_by
UPDATE events SET created_by = owner_id WHERE created_by IS NULL;

-- Add foreign key constraint
ALTER TABLE events 
ADD CONSTRAINT fk_events_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- Drop the old owner_id column
ALTER TABLE events DROP FOREIGN KEY events_ibfk_3;
ALTER TABLE events DROP INDEX idx_events_owner;
ALTER TABLE events DROP COLUMN owner_id;

-- Add new index for created_by
ALTER TABLE events ADD INDEX idx_events_created_by (created_by);