const http = require('http');
const PORT = 4100;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is running!');  
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('Failed to start test server:', err);
});
