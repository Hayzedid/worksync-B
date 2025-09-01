import { verifyToken } from '../config/jwt.js';
import { pool } from '../config/database.js';

async function authenticateToken(req, res, next) {
  // Debug: Log cookies and headers for troubleshooting
  console.log('Auth middleware: cookies:', req.cookies);
  console.log('Auth middleware: headers:', req.headers);
  try {
    let token;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header or token cookie missing or malformed'
      });
    }
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
    const { NODE_ENV } = await import('../config/config.js');
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      ...(NODE_ENV !== 'production' && { error: error.message })
    });
  }
}

export default authenticateToken;
