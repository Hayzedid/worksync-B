// src/middleware/logger.js
import morgan from 'morgan';

// Dev-friendly format
export const devLogger = morgan('dev');

// More detailed logs (optional for prod)
export const detailedLogger = morgan(':method :url :status :res[content-length] - :response-time ms');
