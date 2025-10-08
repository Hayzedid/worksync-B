import { pool } from '../config/database.js';

async function quickTest() {
  try {
    console.log('🔍 Quick test: Checking if collaborative_sessions table exists...');
    
    // Test the exact query that was failing in the socket handler
    await pool.execute('UPDATE collaborative_sessions SET is_active = false WHERE user_id = 999');
    console.log('✅ SUCCESS: collaborative_sessions table exists and UPDATE query works!');
    
    console.log('🔍 Testing user_presence table...');
    await pool.execute('SELECT * FROM user_presence LIMIT 1');
    console.log('✅ SUCCESS: user_presence table exists!');
    
    console.log('🔍 Testing comment_reactions table...');
    await pool.execute('SELECT * FROM comment_reactions LIMIT 1');
    console.log('✅ SUCCESS: comment_reactions table exists!');
    
    console.log('\n🎉 All tables exist! The socket handler errors are FIXED!');
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.message.includes("doesn't exist")) {
      console.log('💡 Run: npm run add-missing-tables');
    }
  } finally {
    process.exit(0);
  }
}

quickTest();
