import { pool } from '../config/database.js';

async function testDatabaseTables() {
  try {
    console.log('🧪 Testing database tables to prevent collaborative_sessions errors...\n');

    // Test 1: Check if collaborative_sessions table exists
    console.log('1️⃣ Testing collaborative_sessions table...');
    try {
      const [rows] = await pool.execute('DESCRIBE collaborative_sessions');
      console.log('✅ collaborative_sessions table exists with columns:');
      rows.forEach(row => console.log(`   - ${row.Field} (${row.Type})`));
    } catch (error) {
      console.error('❌ collaborative_sessions table missing:', error.message);
      return false;
    }

    // Test 2: Check if user_presence table exists
    console.log('\n2️⃣ Testing user_presence table...');
    try {
      const [rows] = await pool.execute('DESCRIBE user_presence');
      console.log('✅ user_presence table exists with columns:');
      rows.forEach(row => console.log(`   - ${row.Field} (${row.Type})`));
    } catch (error) {
      console.error('❌ user_presence table missing:', error.message);
      return false;
    }

    // Test 3: Check if comment_reactions table exists
    console.log('\n3️⃣ Testing comment_reactions table...');
    try {
      const [rows] = await pool.execute('DESCRIBE comment_reactions');
      console.log('✅ comment_reactions table exists with columns:');
      rows.forEach(row => console.log(`   - ${row.Field} (${row.Type})`));
    } catch (error) {
      console.error('❌ comment_reactions table missing:', error.message);
      return false;
    }

    // Test 4: Simulate the socket handler operations that were failing
    console.log('\n4️⃣ Testing socket handler database operations...');
    
    // Test collaborative_sessions INSERT operation
    try {
      await pool.execute(`
        INSERT INTO collaborative_sessions (item_type, item_id, user_id, is_active) 
        VALUES ('task', 999, 1, true) 
        ON DUPLICATE KEY UPDATE is_active = true, updated_at = NOW()
      `);
      console.log('✅ collaborative_sessions INSERT operation works');
    } catch (error) {
      console.error('❌ collaborative_sessions INSERT failed:', error.message);
      return false;
    }

    // Test collaborative_sessions UPDATE operation (the one that was failing)
    try {
      await pool.execute(`
        UPDATE collaborative_sessions 
        SET is_active = false 
        WHERE user_id = 1
      `);
      console.log('✅ collaborative_sessions UPDATE operation works');
    } catch (error) {
      console.error('❌ collaborative_sessions UPDATE failed:', error.message);
      return false;
    }

    // Test user_presence operations
    try {
      await pool.execute(`
        INSERT INTO user_presence (user_id, status, last_activity_at, socket_id) 
        VALUES (1, 'ONLINE', NOW(), 'test-socket-123') 
        ON DUPLICATE KEY UPDATE status = 'ONLINE', last_activity_at = NOW(), socket_id = 'test-socket-123'
      `);
      console.log('✅ user_presence INSERT/UPDATE operation works');
    } catch (error) {
      console.error('❌ user_presence operation failed:', error.message);
      return false;
    }

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await pool.execute('DELETE FROM collaborative_sessions WHERE item_id = 999');
    await pool.execute('DELETE FROM user_presence WHERE socket_id = "test-socket-123"');
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! The socket handler errors should be resolved.');
    console.log('✨ Your Render deployment should now work without collaborative_sessions errors.');
    
    return true;

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the tests
testDatabaseTables()
  .then((success) => {
    if (success) {
      console.log('\n🚀 Database is ready for deployment!');
      process.exit(0);
    } else {
      console.log('\n❌ Database issues detected. Please run the migration first.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
