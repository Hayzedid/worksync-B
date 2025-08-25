const http = require('http');

const PORT = 5001;

console.log('Starting simple test server on port', PORT);

const server = http.createServer((req, res) => {
  console.log('Received request:', req.method, req.url);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Simple test server is running!');
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Keep process alive
process.stdin.resume();
