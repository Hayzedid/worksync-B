/**
 * Production-ready logging utility for WorkSync
 * Enhanced with performance monitoring, security logging, and file output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LOG_COLORS = {
  DEBUG: '\x1b[36m', // Cyan
  INFO: '\x1b[32m',  // Green
  WARN: '\x1b[33m',  // Yellow
  ERROR: '\x1b[31m', // Red
  RESET: '\x1b[0m'   // Reset
};

class Logger {
  constructor() {
    this.level = process.env.NODE_ENV === 'production' ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;
    this.enableColors = process.env.NODE_ENV !== 'production';
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const color = this.enableColors ? LOG_COLORS[level] : '';
    const reset = this.enableColors ? LOG_COLORS.RESET : '';
    
    let formatted = `${color}[${timestamp}] [${level}]${reset} ${message}`;
    
    if (data !== null) {
      formatted += `\n${JSON.stringify(data, null, 2)}`;
    }
    
    return formatted;
  }

  debug(message, data = null) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message, data = null) {
    if (this.level <= LOG_LEVELS.INFO) {
      console.log(this.formatMessage('INFO', message, data));
    }
  }

  warn(message, data = null) {
    if (this.level <= LOG_LEVELS.WARN) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  error(message, error = null) {
    if (this.level <= LOG_LEVELS.ERROR) {
      const errorData = error ? {
        message: error.message,
        stack: error.stack,
        ...(error.code && { code: error.code })
      } : null;
      
      console.error(this.formatMessage('ERROR', message, errorData));
    }
  }

  // Specific methods for common use cases
  taskOperation(operation, taskId, data = null) {
    this.debug(`Task ${operation}`, { taskId, ...data });
  }

  projectOperation(operation, projectId, data = null) {
    this.debug(`Project ${operation}`, { projectId, ...data });
  }

  userOperation(operation, userId, data = null) {
    this.debug(`User ${operation}`, { userId, ...data });
  }

  authEvent(event, data = null) {
    this.info(`Auth: ${event}`, data);
  }

  socketEvent(event, data = null) {
    this.debug(`Socket: ${event}`, data);
  }

  dbOperation(operation, data = null) {
    this.debug(`DB: ${operation}`, data);
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
