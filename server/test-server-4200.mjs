import { createServer } from 'http';

const PORT = 4200;

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is running on port 4200 with ES modules!');  
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
}).on('error', (err) => {
  console.error('Failed to start test server:', err);
  process.exit(1);
});
