import mysql from 'mysql2/promise';

async function checkDatabaseTables() {
  console.log('🚀 Connecting to Railway MySQL database to check table structures...');
  
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
    
    // Check events table structure
    console.log('\n📋 Events table structure:');
    try {
      const [eventCols] = await connection.execute("DESCRIBE events");
      console.table(eventCols);
      
      // Test a simple query
      const [eventCount] = await connection.execute("SELECT COUNT(*) as count FROM events");
      console.log(`📊 Events table has ${eventCount[0].count} records`);
      
    } catch (error) {
      console.log('❌ Events table issue:', error.message);
    }
    
    // Check comments table structure
    console.log('\n📋 Comments table structure:');
    try {
      const [commentCols] = await connection.execute("DESCRIBE comments");
      console.table(commentCols);
      
      // Test a simple query
      const [commentCount] = await connection.execute("SELECT COUNT(*) as count FROM comments");
      console.log(`📊 Comments table has ${commentCount[0].count} records`);
      
    } catch (error) {
      console.log('❌ Comments table issue:', error.message);
    }
    
    // Check if comment_reactions table exists
    console.log('\n📋 Comment reactions table:');
    try {
      const [reactionCols] = await connection.execute("DESCRIBE comment_reactions");
      console.table(reactionCols);
      
      const [reactionCount] = await connection.execute("SELECT COUNT(*) as count FROM comment_reactions");
      console.log(`📊 Comment reactions table has ${reactionCount[0].count} records`);
      
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('ℹ️ comment_reactions table does not exist - this is needed for comment reactions');
        
        // Create comment_reactions table
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
            UNIQUE KEY unique_user_emoji_comment (user_id, comment_id, emoji)
          )
        `);
        console.log('✅ Created comment_reactions table!');
      } else {
        console.log('❌ Comment reactions table issue:', error.message);
      }
    }
    
    // Show all tables
    console.log('\n📋 All tables in database:');
    const [tables] = await connection.execute("SHOW TABLES");
    console.log(tables.map(t => Object.values(t)[0]).join(', '));
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the check
checkDatabaseTables()
  .then(() => {
    console.log('✨ Database check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database check failed:', error);
    process.exit(1);
  });