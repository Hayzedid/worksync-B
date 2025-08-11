// src/controllers/authController.js
import { pool } from '../config/database.js';
import { generateToken } from '../config/jwt.js';
import { hashPassword, verifyPassword } from '../utils/helpers.js';

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
        lastName
      }
    });
  } catch (err) {
    console.error('Error registering user:', err); // Debug log
    next(err); // Pass the error to the error handling middleware
  }
};

export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = users[0];
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Please contact support.' });
    }

    const token = generateToken(user);
    
    // Set cookie for frontend authentication
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
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
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none'
    });
    
    res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (err) {
    console.error('Error logging out:', err);
    next(err);
  }
};
