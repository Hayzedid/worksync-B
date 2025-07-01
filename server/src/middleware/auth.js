import { verifyToken } from '../utils/helpers'
import { pool } from '../config/database'


async function authenticateToken(res, req, next) {
    try{
        const authHeader = req.headers['authorization']
        const  token = authHeader && authHeader.split(' ')[1]

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Access Token required'
            })
            
        }


        const decoded = verifyToken(token)
        const [users] = await pool.execute(
               'SELECT id, email, first_name, last_name, is_active FROM users WHERE id = ?',
            [decoded.userId]
            
        )

         if (users.length === 0 || !users[0].is_active) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        
        // Add user info to request object for use in route handlers
        req.user = users[0];
        next();

        
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            error: error.message
        });
    }

    
}