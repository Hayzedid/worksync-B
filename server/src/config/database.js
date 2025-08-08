   import mysql from 'mysql2/promise';
   import dotenv from 'dotenv';
   dotenv.config();
   console.log('Connecting to DB at:', process.env.DB_HOST);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'root',
    database: 'worksync',
    password: process.env.DB_PASSWORD, // Set DB_PASSWORD in your environment variables
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4' // Use utf8mb4 to support emojis and special characters
});


async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Database connection successful');
        connection.release();
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}


export { pool, testConnection };