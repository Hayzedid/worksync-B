// src/config/config.js
import dotenv from 'dotenv';
dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = process.env.PORT || 5000;
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
export const DB_HOST = process.env.DB_HOST || 'localhost';
export const DB_PORT = process.env.DB_PORT || 3306;
export const DB_USER = process.env.DB_USER || 'root';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_NAME = process.env.DB_NAME || 'worksync';
export const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_fallback';
