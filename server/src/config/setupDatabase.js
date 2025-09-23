import mysql from 'mysql2/promise';
import * as config from './config.js';

async function setupDatabase() {
  // Create a connection to the MySQL server without specifying a database
  const connection = await mysql.createConnection({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD
  });

  try {
    // Create the database if it doesn't exist
  await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.DB_NAME}`);
  console.log(`Database '${config.DB_NAME}' created or already exists`);
    
    // Close the connection
    await connection.end();
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    await connection.end();
  }
}

setupDatabase();
