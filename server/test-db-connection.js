// Test database connection directly
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Testing database connection...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '[PRESENT]' : '[MISSING]');

async function testDatabaseConnection() {
  try {
    console.log('\n📡 Attempting to connect to database...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectTimeout: 10000,
      acquireTimeout: 10000,
      charset: 'utf8mb4'
    });

    console.log('✅ Database connection successful!');
    
    // Test a simple query
    console.log('\n🧪 Testing simple query...');
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('Query result:', rows);
    
    // Check if tables exist
    console.log('\n📋 Checking for key tables...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('Available tables:', tables.map(t => Object.values(t)[0]));
    
    await connection.end();
    console.log('\n🎉 All database tests passed!');
    
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('SQL State:', error.sqlState);
    console.error('SQL Message:', error.sqlMessage);
    console.error('Full Error:', error);
    
    // Common error diagnostics
    if (error.code === 'ENOTFOUND') {
      console.error('\n💡 DNS Resolution failed - check DB_HOST');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused - check DB_PORT and firewall');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied - check DB_USER and DB_PASSWORD');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Database does not exist - check DB_NAME');
    }
    
    process.exit(1);
  }
}

testDatabaseConnection();
