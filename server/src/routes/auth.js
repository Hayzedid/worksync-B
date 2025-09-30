import express from 'express';
import authenticateToken from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../utils/validator.js';
import { validateRequest } from '../middleware/validation.js';
import { registerUser, loginUser, logoutUser, forgotPassword, resetPassword, validateResetToken } from '../controllers/authController.js';
import rateLimit from '../middleware/rateLimit.js';

const router = express.Router();

// Flexible rate limiting for login/register (handles Render cold starts)
const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased for development/testing
  message: { success: false, message: 'Too many authentication attempts, please try again later' },
  skip: (req) => {
    // Skip rate limiting during potential cold starts or development
    const userAgent = req.get('User-Agent') || '';
    return userAgent.includes('curl') || userAgent.includes('PostmanRuntime') || process.env.NODE_ENV === 'development';
  }
});

router.post('/register', authLimiter, validateRegister, validateRequest, registerUser);
router.post('/login', authLimiter, validateLogin, validateRequest, loginUser);
router.post('/logout', logoutUser); // No rate limiting on logout
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ success: true, user: req.user });
});
// Rate limiting with skip for slow responses (Render sleep recovery)
const forgotLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 10,
  skip: (req, res) => {
    // Skip rate limiting if previous requests were very slow (indicates cold start)
    return res.getHeaders()['x-response-time'] > 10000; // 10+ seconds = cold start
  }
});
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/reset-token/:token', validateResetToken);
// router.post('/forgot-password', forgotPassword); // Function not yet implemented

export default router;
