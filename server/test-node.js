console.log('Node.js is working!');
console.log('Current directory:', process.cwd());
console.log('Environment variables:', {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  NODE_OPTIONS: process.env.NODE_OPTIONS
});
