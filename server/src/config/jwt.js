
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

export const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
     next(err);
    throw new Error('Invalid token');
  }
};
