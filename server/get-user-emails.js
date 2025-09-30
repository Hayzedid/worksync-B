import { pool } from './src/config/database.js';
import { getUserById } from './src/models/User.js';

async function getCurrentUserEmailDetails() {
  try {
    console.log('📧 Getting current user email details...');
    
    // Get all users to see what's available (for demo purposes)
    console.log('\n📋 All users in database:');
    const [users] = await pool.execute('SELECT id, email, first_name, last_name, username, created_at FROM users ORDER BY id');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Username: ${user.username || 'Not set'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('   ---');
    });

    // If you want to check a specific user by ID, uncomment and modify:
    // const userId = 1; // Replace with your user ID
    // const specificUser = await getUserById(userId);
    // console.log('Specific user details:', specificUser);
    
  } catch (error) {
    console.error('❌ Error getting user email details:', error);
  } finally {
    process.exit(0);
  }
}

getCurrentUserEmailDetails();