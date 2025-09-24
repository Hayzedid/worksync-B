// Temporary server.js to test route loading incrementally
import routeTest from './route-test.js';

const PORT = process.env.PORT || 5000;

routeTest.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Route test server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});