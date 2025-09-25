// Check what tables actually exist in the database
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function checkActualTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4'
    });

    console.log('📋 All tables in database:');
    const [tables] = await connection.execute('SHOW TABLES');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });
    
    console.log('\n🔍 Checking specific table structures:');
    
    // Check workspaces table structure
    try {
      const [workspacesCols] = await connection.execute('DESCRIBE workspaces');
      console.log('\n📋 WORKSPACES table columns:');
      workspacesCols.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } catch (e) {
      console.log('\n❌ Workspaces table error:', e.message);
    }
    
    // Check tasks table structure
    try {
      const [tasksCols] = await connection.execute('DESCRIBE tasks');
      console.log('\n📋 TASKS table columns:');
      tasksCols.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    } catch (e) {
      console.log('\n❌ Tasks table error:', e.message);
    }

    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkActualTables();
