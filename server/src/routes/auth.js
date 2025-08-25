import express from 'express';
import authenticateToken from '../middleware/auth.js';
import { validateRegister, validateLogin } from '../utils/validator.js';
import { validateRequest } from '../middleware/validation.js';
import { registerUser, loginUser, logoutUser, forgotPassword, resetPassword, validateResetToken } from '../controllers/authController.js';
import rateLimit from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/register', validateRegister, validateRequest, registerUser);
router.post('/login', validateLogin, validateRequest, loginUser);
router.post('/logout', logoutUser);
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ success: true, user: req.user });
});
// Apply simple rate-limiting to prevent abuse (5 requests / 15 min per IP)
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
router.post('/forgot-password', forgotLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/reset-token/:token', validateResetToken);
// router.post('/forgot-password', forgotPassword); // Function not yet implemented

export default router;
