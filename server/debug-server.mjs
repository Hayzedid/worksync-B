import { createServer } from 'http';
import { writeFileSync } from 'fs';

const PORT = 4200;
const LOG_FILE = 'server-debug.log';

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  process.stdout.write(logMessage);
  writeFileSync(LOG_FILE, logMessage, { flag: 'a' });
}

log('Starting debug server...');

try {
  log('Creating HTTP server...');
  const server = createServer((req, res) => {
    log(`Received request: ${req.method} ${req.url}`);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Debug server is running!');
  });

  server.on('error', (err) => {
    log(`Server error: ${err.message}`);
    log(`Error stack: ${err.stack}`);
    process.exit(1);
  });

  server.on('listening', () => {
    const addr = server.address();
    log(`Server listening on ${JSON.stringify(addr)}`);
  });

  log(`Attempting to listen on port ${PORT}...`);
  server.listen(PORT, '0.0.0.0');
  
  // Keep the process alive
  process.stdin.resume();
  
} catch (error) {
  log(`Unhandled error: ${error.message}`);
  log(`Error stack: ${error.stack}`);
  process.exit(1);
}
