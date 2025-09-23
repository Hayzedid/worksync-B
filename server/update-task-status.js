// Script to update task status ENUM to include 'review' and 'cancelled'
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function updateTaskStatusEnum() {
  let connection;
  
  try {
    // Database connection
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Oluwasegun&1',
      database: 'worksync'
    });

    console.log('📊 Connected to database');

    // Execute the ALTER statement directly
    const alterStatement = `ALTER TABLE tasks 
      MODIFY COLUMN status ENUM('todo', 'in_progress', 'done', 'review', 'cancelled', 'archived') DEFAULT 'todo'`;
    
    console.log('🔄 Executing ALTER statement to update status ENUM...');
    const [result] = await connection.execute(alterStatement);
    console.log('✅ ALTER statement executed successfully');
    
    // Verify the change by describing the table
    console.log('� Verifying table structure...');
    const [rows] = await connection.execute('DESCRIBE tasks');
    const statusColumn = rows.find(row => row.Field === 'status');
    console.log('📋 Status column definition:', statusColumn);

    console.log('🎉 Task status ENUM updated successfully!');
    console.log('📋 New status values: todo, in_progress, done, review, cancelled, archived');

  } catch (error) {
    console.error('❌ Error updating task status ENUM:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔒 Database connection closed');
    }
  }
}

// Run the update
updateTaskStatusEnum();
