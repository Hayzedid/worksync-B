   import mysql from 'mysql2/promise';
   import dotenv from 'dotenv';
   dotenv.config();


const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    database: 'worksync',
    password: 'Oluwasegun&1',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
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


// export default { pool }
export { pool, testConnection };