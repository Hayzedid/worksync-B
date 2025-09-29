import mysql from 'mysql2/promise';

async function setupLocalTables() {
  console.log('🚀 Setting up local database tables...');
  
  // Use local database connection
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Update with your local MySQL password
    database: 'worksync_db'
  });

  try {
    console.log('✅ Connected to local database!');
    
    // Create events table
    console.log('📝 Creating events table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS events (
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
        INDEX idx_events_owner (owner_id),
        INDEX idx_events_dates (start_date, end_date)
      )
    `);
    console.log('✅ Events table created!');
    
    // Create comment_reactions table
    console.log('📝 Creating comment_reactions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS comment_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        comment_id INT NOT NULL,
        user_id INT NOT NULL,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_emoji_comment (user_id, comment_id, emoji)
      )
    `);
    console.log('✅ Comment reactions table created!');
    
    // Check existing tables
    const [tables] = await connection.execute("SHOW TABLES");
    console.log('📋 Available tables:', tables.map(t => Object.values(t)[0]));
    
    console.log('🎉 Local database setup completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('🔒 Database connection closed');
  }
}

// Run the setup
setupLocalTables()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });