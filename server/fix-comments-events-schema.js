import mysql from 'mysql2/promise';

async function fixCommentsSchema() {
  console.log('🚀 Connecting to Railway MySQL database...');
  
  const connection = await mysql.createConnection({
    host: 'gondola.proxy.rlwy.net',
    port: 26492,
    user: 'root',
    password: 'BRkglzFMXljFoHcBRtrLqxYpVXzjVsFD',
    database: 'railway',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('✅ Connected to Railway database!');
    
    // Check if comments table exists and what structure it has
    console.log('🔍 Checking comments table structure...');
    try {
      const [columns] = await connection.execute("SHOW COLUMNS FROM comments");
      console.log('📋 Current comments table structure:', columns.map(col => col.Field));
      
      // Check if we have the wrong field names
      const hasEntityType = columns.some(col => col.Field === 'entity_type');
      const hasCommentableType = columns.some(col => col.Field === 'commentable_type');
      
      if (hasEntityType && !hasCommentableType) {
        console.log('🔧 Need to update comments table to use commentable_type instead of entity_type...');
        
        // Rename columns to match controller expectations
        await connection.execute('ALTER TABLE comments CHANGE entity_type commentable_type VARCHAR(50) NOT NULL');
        await connection.execute('ALTER TABLE comments CHANGE entity_id commentable_id INT NOT NULL');
        await connection.execute('ALTER TABLE comments CHANGE user_id created_by INT NOT NULL');
        
        console.log('✅ Updated comments table column names!');
      } else if (hasCommentableType) {
        console.log('ℹ️ Comments table already has correct column names');
      } else {
        console.log('❌ Comments table has unexpected structure');
      }
      
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('📝 Comments table does not exist, creating it...');
        
        // Create comments table with correct structure
        await connection.execute(`
          CREATE TABLE comments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            content TEXT NOT NULL,
            commentable_type VARCHAR(50) NOT NULL,
            commentable_id INT NOT NULL,
            created_by INT NOT NULL,
            parent_id INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
            INDEX idx_comments_commentable (commentable_type, commentable_id),
            INDEX idx_comments_user (created_by),
            INDEX idx_comments_created (created_at)
          )
        `);
        console.log('✅ Created comments table with correct structure!');
      } else {
        throw error;
      }
    }
    
    // Check if comment_reactions table exists
    console.log('🔍 Checking comment_reactions table...');
    try {
      const [reactionCols] = await connection.execute("SHOW COLUMNS FROM comment_reactions");
      console.log('ℹ️ comment_reactions table exists');
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('📝 Creating comment_reactions table...');
        await connection.execute(`
          CREATE TABLE comment_reactions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            comment_id INT NOT NULL,
            user_id INT NOT NULL,
            emoji VARCHAR(10) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_user_emoji_comment (user_id, comment_id, emoji),
            INDEX idx_reactions_comment (comment_id)
          )
        `);
        console.log('✅ Created comment_reactions table!');
      } else {
        throw error;
      }
    }
    
    // Check if events table exists
    console.log('🔍 Checking events table...');
    try {
      const [eventCols] = await connection.execute("SHOW COLUMNS FROM events");
      console.log('ℹ️ events table exists with columns:', eventCols.map(col => col.Field));
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('📝 Creating events table...');
        await connection.execute(`
          CREATE TABLE events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            start_date DATETIME NOT NULL,
            end_date DATETIME NOT NULL,
            start DATETIME NOT NULL,
            end DATETIME NOT NULL,
            owner_id INT NOT NULL,
            all_day BOOLEAN DEFAULT FALSE,
            location VARCHAR(255) DEFAULT NULL,
            description TEXT DEFAULT NULL,
            workspace_id INT DEFAULT NULL,
            project_id INT DEFAULT NULL,
            category VARCHAR(50) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
            INDEX idx_events_owner (owner_id),
            INDEX idx_events_workspace (workspace_id),
            INDEX idx_events_dates (start_date, end_date)
          )
        `);
        console.log('✅ Created events table!');
      } else {
        throw error;
      }
    }
    
    console.log('🎉 Comments and events schema fixes completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('🔒 Database connection closed');
  }
}

// Run the schema fix
fixCommentsSchema()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Schema fix failed:', error);
    process.exit(1);
  });