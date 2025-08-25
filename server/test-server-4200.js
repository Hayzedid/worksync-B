const http = require('http');
const PORT = 4200;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is running on port 4200!');  
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  console.error('Failed to start test server:', err);
});
