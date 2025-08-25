// src/controllers/authController.js
import { pool } from '../config/database.js';
import { generateToken } from '../config/jwt.js';
import { hashPassword, verifyPassword } from '../utils/helpers.js';
import crypto from 'crypto';
import { createPasswordReset, findValidResetByHash, markResetUsed, invalidateAllForUser } from '../models/PasswordReset.js';
import { getUserByEmail, updateUserPassword } from '../models/User.js';
import { sendEmail } from '../services/emailServices.js';

export const registerUser = async (req, res, next) => {
  const { email, password, firstName, lastName, userName } = req.body;

  try {
    if (!email || !password || !firstName || !lastName || !userName) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const [existingUsers] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Email is already in use' });
    }

    const hashedPassword = await hashPassword(password);

    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, first_name, last_name, username) VALUES (?, ?, ?, ?, ?)',
      [email.toLowerCase(), hashedPassword, firstName, lastName, userName]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: result.insertId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        userName
      }
    });
  } catch (err) {
    console.error('Error registering user:', err); // Debug log
    next(err); // Pass the error to the error handling middleware
  }
};

// GET /auth/reset-token/:token (optional pre-validation)
export const validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.params || {};
    if (!token) return res.status(400).json({ valid: false, message: 'Token required' });
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await findValidResetByHash(token_hash);
    if (!record) return res.status(400).json({ valid: false, message: 'Invalid or expired token' });
    return res.status(200).json({ valid: true });
  } catch (err) {
    next(err);
  }
};

// POST /auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body || {};
  try {
    // Always respond 200 to prevent user enumeration
    const generic = { message: 'If an account exists, a reset link was sent.' };
    if (!email || typeof email !== 'string') {
      return res.status(200).json(generic);
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(200).json(generic);
    }

    // Generate token and hash
    const tokenBytes = crypto.randomBytes(32);
    const token = tokenBytes.toString('hex');
    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes

    // Invalidate previous tokens and create a new one
    await invalidateAllForUser(user.id);
    await createPasswordReset({ user_id: user.id, token_hash, expires_at });

  const { FRONTEND_URL } = await import('../config/config.js');
  const resetLink = `${FRONTEND_URL}/reset-password/${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your WorkSync password',
      text: `You requested a password reset. Click the link to reset your password:\n${resetLink}\nThis link expires in 60 minutes.`
    });

    return res.status(200).json(generic);
  } catch (err) {
    next(err);
  }
};

// POST /auth/reset-password
export const resetPassword = async (req, res, next) => {
  const { token, password } = req.body || {};
  try {
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }

    const token_hash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await findValidResetByHash(token_hash);
    if (!record) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    const password_hash = await hashPassword(password);
    await updateUserPassword(record.user_id, password_hash);
    await markResetUsed(record.id);
    // Optionally revoke sessions/refresh tokens here

    return res.status(200).json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};

export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  // Debug: Log incoming request
  console.log('--- LOGIN REQUEST ---');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  try {
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    console.log('User lookup result:', users);
    if (users.length === 0) {
      console.log('No user found for email:', email);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    console.log('Password valid:', isPasswordValid);
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      console.log('User is not active:', email);
      return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact support.' });
    }

    const token = generateToken(user);
    console.log('Generated token:', token);
    // Set cookie for frontend authentication
    const { NODE_ENV } = await import('../config/config.js');
    res.cookie('token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    console.log('Set cookie for token');
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: user.email_verified || false
      }
    });
  } catch (err) {
    console.error('Error logging in:', err); // Debug log
    next(err); // Pass the error to the error handling middleware
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    // Clear the token cookie
    const { NODE_ENV } = await import('../config/config.js');
    res.clearCookie('token', {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'none'
    });
    
    res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (err) {
    console.error('Error logging out:', err);
    next(err);
  }
};
