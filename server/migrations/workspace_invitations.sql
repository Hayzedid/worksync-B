-- Create workspace invitations table
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workspace_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  invite_token VARCHAR(255) UNIQUE NOT NULL,
  invited_by INT NOT NULL,
  status ENUM('pending', 'accepted', 'expired') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP NULL,
  INDEX idx_workspace_invitations_token (invite_token),
  INDEX idx_workspace_invitations_email (email),
  INDEX idx_workspace_invitations_workspace (workspace_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);
