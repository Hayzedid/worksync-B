// src/utils/helpers.js
import { genSalt, hash, compare } from 'bcrypt';
// import jwt from 'jsonwebtoken';
// import dotenv from 'dotenv';
// dotenv.config({ path: './src/.env' });

// export const generateToken = (user) => {
//   const payload = {
//     id: user.id,
//     email: user.email
//   };
//   return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
// };

// export const verifyToken = (token) => {
//   try {
//     return jwt.verify(token, process.env.JWT_SECRET);
//   } catch (error) {
//     throw new Error('Invalid token');
//   }
// };



const SALT_ROUNDS = 10;

export async function hashPassword(password) {
  try {
    const salt = await genSalt(SALT_ROUNDS);
    return await hash(password, salt);
  } catch (error) {
    throw new Error('Error hashing password');
  }
}

export async function verifyPassword(password, hashedPassword) {
  try {
    return await compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Error verifying password');
  }
}

