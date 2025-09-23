import { testConnection } from './database.js';

async function runTest() {
  console.log('Testing database connection...');
  const connected = await testConnection();
  if (connected) {
    console.log('✅ Database connection test passed');
  } else {
    console.log('❌ Database connection test failed');
  }
  process.exit(connected ? 0 : 1);
}

runTest();
