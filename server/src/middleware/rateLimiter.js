// src/middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for development
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

// For auth routes (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Increased for development
  message: {
    success: false,
    message: 'Too many login attempts. Please wait and try again.'
  }
});
