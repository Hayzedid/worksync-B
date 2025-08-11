import express from 'express';
import { validateRegister, validateLogin } from '../utils/validator.js';
import { validateRequest } from '../middleware/validation.js';
import { registerUser, loginUser, logoutUser } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', validateRegister, validateRequest, registerUser);
router.post('/login', validateLogin, validateRequest, loginUser);
router.post('/logout', logoutUser);
// router.post('/forgot-password', forgotPassword); // Function not yet implemented

export default router;
