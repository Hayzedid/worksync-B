import { pool } from './src/config/database.js';

async function checkWorkspaceInvitationTable() {
  try {
    console.log('🔍 Checking for workspace_invitations table...');
    
    // Check if table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'workspace_invitations'");
    
    if (tables.length === 0) {
      console.log('❌ workspace_invitations table does not exist');
      console.log('📝 Creating workspace_invitations table...');
      
      await pool.execute(`
        CREATE TABLE workspace_invitations (
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
        )
      `);
      
      console.log('✅ workspace_invitations table created successfully');
    } else {
      console.log('✅ workspace_invitations table exists');
    }
    
    // Show table structure
    const [structure] = await pool.execute('DESCRIBE workspace_invitations');
    console.log('\n📋 Table structure:');
    structure.forEach(field => {
      console.log(`  - ${field.Field}: ${field.Type} ${field.Null === 'YES' ? '(nullable)' : '(not null)'} ${field.Key ? `[${field.Key}]` : ''}`);
    });

    // Check if workspaces table exists too
    console.log('\n🔍 Checking for workspaces table...');
    const [workspaceTables] = await pool.execute("SHOW TABLES LIKE 'workspaces'");
    
    if (workspaceTables.length === 0) {
      console.log('❌ workspaces table does not exist - creating it...');
      await pool.execute(`
        CREATE TABLE workspaces (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ workspaces table created successfully');
    } else {
      console.log('✅ workspaces table exists');
    }

    // Check if workspace_members table exists
    console.log('\n🔍 Checking for workspace_members table...');
    const [memberTables] = await pool.execute("SHOW TABLES LIKE 'workspace_members'");
    
    if (memberTables.length === 0) {
      console.log('❌ workspace_members table does not exist - creating it...');
      await pool.execute(`
        CREATE TABLE workspace_members (
          id INT AUTO_INCREMENT PRIMARY KEY,
          workspace_id INT NOT NULL,
          user_id INT NOT NULL,
          role ENUM('member', 'admin', 'owner') DEFAULT 'member',
          FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_workspace_user (workspace_id, user_id)
        )
      `);
      console.log('✅ workspace_members table created successfully');
    } else {
      console.log('✅ workspace_members table exists');
    }
    
  } catch (error) {
    console.error('❌ Error checking workspace invitation tables:', error);
  } finally {
    process.exit(0);
  }
}

checkWorkspaceInvitationTable();