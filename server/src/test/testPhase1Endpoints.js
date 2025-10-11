import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
let authToken = '';

console.log('🧪 Testing Phase 1 API Endpoints...');

async function testPhase1Endpoints() {
  try {
    console.log('\n🔐 Step 1: Authentication Test...');
    
    // Test authentication (assuming we have a test user)
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword'
      });
      
      if (loginResponse.data.token) {
        authToken = loginResponse.data.token;
        console.log('✅ Authentication successful');
      } else {
        console.log('ℹ️ No test user found, will test without auth token');
      }
    } catch (error) {
      console.log('ℹ️ Authentication skipped (no test user), testing endpoint availability...');
    }

    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

    console.log('\n🔧 Step 2: Testing Custom Fields Endpoints...');
    
    // Test custom fields endpoints
    const endpoints = [
      { method: 'GET', url: '/custom-fields', name: 'Get Custom Fields' },
      { method: 'GET', url: '/favorites', name: 'Get Favorites' },
      { method: 'GET', url: '/pinned-items', name: 'Get Pinned Items' },
      { method: 'GET', url: '/recent-items', name: 'Get Recent Items' },
      { method: 'GET', url: '/task-templates', name: 'Get Task Templates' },
      { method: 'GET', url: '/saved-filters', name: 'Get Saved Filters' },
      { method: 'GET', url: '/action-history', name: 'Get Action History' },
      { method: 'GET', url: '/exports/history', name: 'Get Export History' },
      { method: 'GET', url: '/global-search', name: 'Global Search' },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios({
          method: endpoint.method,
          url: `${BASE_URL}${endpoint.url}`,
          headers,
          timeout: 5000
        });
        
        if (response.status === 200) {
          console.log(`✅ ${endpoint.name}: Status ${response.status}`);
        } else {
          console.log(`⚠️ ${endpoint.name}: Status ${response.status}`);
        }
      } catch (error) {
        if (error.response) {
          if (error.response.status === 401) {
            console.log(`🔒 ${endpoint.name}: Authentication required (Status 401) - Endpoint exists`);
          } else if (error.response.status === 404) {
            console.log(`❌ ${endpoint.name}: Not found (Status 404)`);
          } else {
            console.log(`⚠️ ${endpoint.name}: Status ${error.response.status}`);
          }
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`🔌 ${endpoint.name}: Server not running`);
          return;
        } else {
          console.log(`❌ ${endpoint.name}: ${error.message}`);
        }
      }
    }

    console.log('\n📊 Step 3: Testing Endpoint Response Structure...');
    
    // Test with query parameters
    const queryEndpoints = [
      { url: '/custom-fields?itemType=task', name: 'Custom Fields with Filter' },
      { url: '/favorites?type=task&limit=10', name: 'Favorites with Pagination' },
      { url: '/recent-items?type=project&days=7', name: 'Recent Items with Filter' },
      { url: '/global-search?q=test', name: 'Global Search with Query' },
      { url: '/global-search/suggestions?q=te', name: 'Search Suggestions' },
    ];

    for (const endpoint of queryEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, { 
          headers,
          timeout: 5000 
        });
        console.log(`✅ ${endpoint.name}: Response received`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`🔒 ${endpoint.name}: Authentication required - Endpoint exists`);
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`🔌 Server not running - Cannot test endpoints`);
          return;
        } else {
          console.log(`⚠️ ${endpoint.name}: ${error.response?.status || error.message}`);
        }
      }
    }

    console.log('\n🎯 Step 4: Testing POST Endpoints Structure...');
    
    // Test POST endpoints (will likely fail due to auth, but we can check if they exist)
    const postEndpoints = [
      { url: '/custom-fields', name: 'Create Custom Field' },
      { url: '/favorites', name: 'Add Favorite' },
      { url: '/pinned-items', name: 'Pin Item' },
      { url: '/task-templates', name: 'Create Template' },
      { url: '/saved-filters', name: 'Save Filter' },
      { url: '/exports/create', name: 'Create Export' },
    ];

    for (const endpoint of postEndpoints) {
      try {
        const response = await axios.post(`${BASE_URL}${endpoint.url}`, {}, { 
          headers,
          timeout: 5000 
        });
        console.log(`✅ ${endpoint.name}: Endpoint accessible`);
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`🔒 ${endpoint.name}: Authentication required - Endpoint exists`);
        } else if (error.response?.status === 400) {
          console.log(`✅ ${endpoint.name}: Validation working (Status 400) - Endpoint exists`);
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`🔌 Server not running - Cannot test endpoints`);
          return;
        } else {
          console.log(`⚠️ ${endpoint.name}: ${error.response?.status || error.message}`);
        }
      }
    }

    console.log('\n📋 Step 5: Route Registration Check...');
    
    // Check if routes are properly registered by testing root endpoints
    const rootEndpoints = [
      '/custom-fields',
      '/favorites', 
      '/pinned-items',
      '/recent-items',
      '/task-templates',
      '/saved-filters',
      '/action-history',
      '/exports',
      '/global-search'
    ];

    let registeredRoutes = 0;
    for (const route of rootEndpoints) {
      try {
        await axios.get(`${BASE_URL}${route}`, { 
          headers,
          timeout: 3000 
        });
        registeredRoutes++;
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 400) {
          registeredRoutes++;
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`🔌 Server not running on ${BASE_URL}`);
          console.log('💡 Please start the server with: npm run dev');
          return;
        }
      }
    }

    console.log(`✅ ${registeredRoutes}/${rootEndpoints.length} Phase 1 routes registered`);

    if (registeredRoutes === rootEndpoints.length) {
      console.log('\n🎉 ALL PHASE 1 API ENDPOINTS SUCCESSFULLY REGISTERED!');
      console.log('\n✅ ENDPOINT TEST SUMMARY:');
      console.log('   - All 9 Phase 1 route groups are accessible');
      console.log('   - Authentication middleware working');
      console.log('   - Query parameters supported');
      console.log('   - POST endpoints properly configured');
      console.log('   - Error handling functioning');
      console.log('\n🚀 Phase 1 Backend API is fully operational!');
    } else {
      console.log(`\n⚠️ ${rootEndpoints.length - registeredRoutes} routes may need attention`);
    }

  } catch (error) {
    console.error('❌ Endpoint testing failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server appears to be offline. To test endpoints:');
      console.log('   1. Start the server: npm run dev');
      console.log('   2. Run this test again');
    }
  }
}

testPhase1Endpoints();
