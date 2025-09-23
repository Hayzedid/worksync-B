// src/middleware/test-logger.js - CommonJS version for testing
const morgan = require('morgan');

// Dev-friendly format
const devLogger = morgan('dev');

// More detailed logs (optional for prod)
const detailedLogger = morgan(':method :url :status :res[content-length] - :response-time ms');

module.exports = { devLogger, detailedLogger };