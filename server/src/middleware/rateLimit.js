// src/middleware/rateLimit.js
// Simple in-memory rate limiter (sufficient for single-instance dev/test)
// Usage: rateLimit({ windowMs: 15*60*1000, max: 5 })

const buckets = new Map(); // key -> { count, resetAt }

export default function rateLimit({ windowMs = 15 * 60 * 1000, max = 5, keyGenerator } = {}) {
  return function (req, res, next) {
    try {
      const now = Date.now();
      const key = (keyGenerator ? keyGenerator(req) : req.ip) || req.ip || 'global';
      let entry = buckets.get(key);

      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        buckets.set(key, entry);
      }

      entry.count += 1;
      const remaining = Math.max(0, max - entry.count);
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.floor(entry.resetAt / 1000)));

      if (entry.count > max) {
        return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
      }

      return next();
    } catch (e) {
      // Fail-open on limiter errors
      return next();
    }
  };
}
