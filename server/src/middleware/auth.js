import { verifyToken } from '../config/jwt.js';
import { pool } from '../config/database.js';

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header missing or malformed'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded?.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
    }

    const [users] = await pool.execute(
      'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      ...(process.env.NODE_ENV !== 'production' && { error: error.message })
    });
  }
}

export default authenticateToken;
