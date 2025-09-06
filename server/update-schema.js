import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'worksync',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function updateSchema() {
  try {
    console.log('Updating projects table schema...');
    
    // Change workspace_id to allow NULL
    await pool.execute('ALTER TABLE projects MODIFY COLUMN workspace_id INT NULL');
    console.log('✅ Modified workspace_id to allow NULL');
    
    // Add owner_id if it doesn't exist (use created_by for now)
    try {
      await pool.execute('ALTER TABLE projects ADD COLUMN owner_id INT NULL');
      console.log('✅ Added owner_id column');
      // Copy created_by to owner_id
      await pool.execute('UPDATE projects SET owner_id = created_by WHERE owner_id IS NULL');
      console.log('✅ Populated owner_id with created_by values');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('owner_id column already exists');
        // Ensure owner_id is populated
        await pool.execute('UPDATE projects SET owner_id = created_by WHERE owner_id IS NULL');
        console.log('✅ Ensured owner_id is populated');
      } else {
        throw e;
      }
    }
    
    // Add status if it doesn't exist
    try {
      await pool.execute('ALTER TABLE projects ADD COLUMN status VARCHAR(50) DEFAULT \'active\'');
      console.log('✅ Added status column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('status column already exists');
      } else {
        throw e;
      }
    }
    
    console.log('🎉 Database schema updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating schema:', error.message);
    process.exit(1);
  }
}

updateSchema();
