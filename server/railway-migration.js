import mysql from 'mysql2/promise';

async function runRailwayMigration() {
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
    
    // Check if email_reminders column already exists
    console.log('🔍 Checking if email_reminders column exists...');
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM tasks LIKE 'email_reminders'"
    );
    
    if (columns.length > 0) {
      console.log('ℹ️  email_reminders column already exists in Railway database');
      return;
    }
    
    // Add the email_reminders column
    console.log('📝 Adding email_reminders column to tasks table...');
    await connection.execute(
      'ALTER TABLE tasks ADD COLUMN email_reminders BOOLEAN DEFAULT FALSE'
    );
    console.log('✅ Successfully added email_reminders column!');
    
    // Create reminders table if it doesn't exist
    console.log('📝 Creating reminders table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        reminder_type ENUM('24h', '1h') NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        UNIQUE KEY unique_reminder (task_id, reminder_type)
      )
    `);
    console.log('✅ Successfully created reminders table!');
    
    // Create newsletter_subscriptions table if it doesn't exist
    console.log('📝 Creating newsletter_subscriptions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unsubscribed_at TIMESTAMP NULL
      )
    `);
    console.log('✅ Successfully created newsletter_subscriptions table!');
    
    console.log('🎉 Railway database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('🔒 Database connection closed');
  }
}

// Run the migration
runRailwayMigration()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });