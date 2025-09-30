-- Allow workspace_id to be NULL for personal projects created outside workspaces
ALTER TABLE projects MODIFY COLUMN workspace_id INT NULL;

-- Remove the foreign key constraint temporarily and recreate it to allow NULL values
ALTER TABLE projects DROP FOREIGN KEY projects_ibfk_1;
ALTER TABLE projects ADD CONSTRAINT projects_ibfk_1 
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

-- Update the created_by foreign key to use CASCADE for consistency
ALTER TABLE projects DROP FOREIGN KEY projects_ibfk_2;
ALTER TABLE projects ADD CONSTRAINT projects_ibfk_2 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;