// create-test-user.js - Create a test user for login testing
import { pool } from './config/database.js';
import { hashPassword } from './utils/helpers.js';

async function createTestUser() {
  try {
    console.log('🧪 Creating test user...');
    
    const testUser = {
      email: 'test@worksync.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      userName: 'testuser'
    };
    
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT * FROM users WHERE email = ?', 
      [testUser.email.toLowerCase()]
    );
    
    if (existingUsers.length > 0) {
      console.log('✅ Test user already exists!');
      console.log('📧 Email:', testUser.email);
      console.log('🔑 Password:', testUser.password);
      return;
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(testUser.password);
    
    // Insert the user
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, username, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [
        testUser.email.toLowerCase(),
        hashedPassword,
        testUser.firstName,
        testUser.lastName,
        testUser.userName,
        1 // is_active = true
      ]
    );
    
    console.log('✅ Test user created successfully!');
    console.log('📧 Email:', testUser.email);
    console.log('🔑 Password:', testUser.password);
    console.log('🆔 User ID:', result.insertId);
    console.log('\n🎯 You can now login with these credentials!');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    process.exit(0);
  }
}

createTestUser();

