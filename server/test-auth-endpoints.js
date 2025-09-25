// Test authentication endpoints to diagnose 500 errors
import fetch from 'node-fetch';

const BASE_URL = 'https://worksync-b.onrender.com';

console.log('🔍 Testing authentication endpoints...');

async function testEndpoint(path, description) {
  try {
    console.log(`\n📡 Testing ${description}: ${path}`);
    
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Origin': 'https://worksync-app.vercel.app'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }
    
    if (response.status === 401) {
      console.log('✅ Expected 401 - Authentication required');
      console.log('Response:', responseData);
    } else if (response.status === 500) {
      console.log('❌ Unexpected 500 error');
      console.log('Response:', responseData);
    } else if (response.status === 200) {
      console.log('✅ Success');
      console.log('Response preview:', JSON.stringify(responseData).substring(0, 200) + '...');
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
      console.log('Response:', responseData);
    }
    
    return { status: response.status, data: responseData };
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
    return { error: error.message };
  }
}

async function runTests() {
  // Test public endpoints first
  await testEndpoint('/api/health', 'Health check (should work)');
  
  // Test protected endpoints (should return 401, not 500)
  await testEndpoint('/api/projects', 'Projects endpoint (protected)');
  await testEndpoint('/api/tasks', 'Tasks endpoint (protected)');
  await testEndpoint('/api/activity', 'Activity endpoint (protected)');
  await testEndpoint('/api/events', 'Events endpoint (protected)');
  
  console.log('\n🎯 Analysis:');
  console.log('- If protected endpoints return 401: Authentication is working correctly');
  console.log('- If protected endpoints return 500: There\'s a server-side error in auth middleware');
}

runTests();
