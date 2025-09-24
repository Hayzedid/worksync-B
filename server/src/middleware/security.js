import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// General rate limiter for all API requests
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limit: 100 requests per 15 minutes
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100,
    'Too many requests from this IP, please try again later'
  ),

  // Auth endpoints: 5 attempts per 15 minutes
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5,
    'Too many authentication attempts, please try again later'
  ),

  // Password reset: 3 attempts per hour
  passwordReset: createRateLimit(
    60 * 60 * 1000, // 1 hour
    3,
    'Too many password reset attempts, please try again later'
  ),

  // File upload: 10 uploads per hour
  fileUpload: createRateLimit(
    60 * 60 * 1000, // 1 hour
    10,
    'Too many file uploads, please try again later'
  ),

  // Real-time endpoints: 1000 requests per 15 minutes
  realtime: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    1000,
    'Too many real-time requests, please slow down'
  )
};

// Speed limiter for heavy operations
const speedLimiters = {
  // Slow down requests after 10 requests per 15 minutes
  heavy: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 10, // allow 10 requests per window without delay
    delayMs: () => 500, // add 500ms delay per request after delayAfter (v2 format)
    maxDelayMs: 20000, // maximum delay of 20 seconds
  })
};

// IP-based tracking for suspicious activity
const suspiciousActivity = new Map();

const trackSuspiciousActivity = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!suspiciousActivity.has(ip)) {
    suspiciousActivity.set(ip, { count: 0, firstSeen: now });
  }
  
  const activity = suspiciousActivity.get(ip);
  
  // Reset counter every hour
  if (now - activity.firstSeen > 60 * 60 * 1000) {
    activity.count = 0;
    activity.firstSeen = now;
  }
  
  // Check for suspicious patterns
  const isAuthRequest = req.path.includes('/auth/');
  const isFailedRequest = res.statusCode >= 400;
  
  if (isAuthRequest && isFailedRequest) {
    activity.count += 1;
    
    // Block IP after too many failed attempts
    if (activity.count > 20) {
      return res.status(429).json({
        success: false,
        error: 'IP temporarily blocked due to suspicious activity'
      });
    }
  }
  
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' ws: wss:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '));
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Hide server information
  res.removeHeader('X-Powered-By');
  
  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

// Request logging for security monitoring
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // Log suspicious requests
  const isSuspicious = 
    req.path.includes('..') || 
    req.path.includes('admin') ||
    req.path.includes('config') ||
    userAgent.includes('bot') ||
    userAgent.includes('scanner');
  
  if (isSuspicious) {
    console.log(`SECURITY: Suspicious request from ${ip}: ${req.method} ${req.path}`);
  }
  
  // Log all auth requests
  if (req.path.includes('/auth/')) {
    console.log(`AUTH: ${req.method} ${req.path} from ${ip}`);
  }
  
  // Response time logging
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Log slow requests
      console.log(`SLOW: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment variables or use defaults
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : [
          'http://localhost:3100', 
          'http://localhost:3000', 
          'https://worksync-app.vercel.app',
          'https://worksync-c.vercel.app',
          'https://worksync-b.onrender.com',
          frontendUrl
        ];
    
    // Remove duplicates and filter out empty strings
    const uniqueOrigins = [...new Set(allowedOrigins.filter(url => url && url.trim()))];
    
    console.log(`CORS: Checking origin ${origin} against allowed origins:`, uniqueOrigins);
    
    if (uniqueOrigins.indexOf(origin) !== -1) {
      console.log(`CORS: Allowing origin ${origin}`);
      callback(null, true);
    } else {
      console.log(`CORS: Blocked origin ${origin}. Allowed origins:`, uniqueOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'X-Workspace-Id',
    'Cache-Control'
  ],
  exposedHeaders: ['X-Total-Count'],
  optionsSuccessStatus: 200, // For legacy browser support
  preflightContinue: false
};

export {
  rateLimiters,
  speedLimiters,
  trackSuspiciousActivity,
  securityHeaders,
  securityLogger,
  corsOptions
};
