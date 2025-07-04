import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

export const generateToken = (user) => {
    const payload = {
        id: user.id,
        email: user.email
    };
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};


 export function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid token');
    }
}

export default {
    generateToken,
    verifyToken
};
