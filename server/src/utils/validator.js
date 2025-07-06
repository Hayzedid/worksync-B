// src/utils/validator.js
import { body } from 'express-validator';

export const validateRegister = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('userName').notEmpty().withMessage('Username is required')
];

export const validateLogin = [
  body('email').isEmail().withMessage('Invalid email'),
  body('password').notEmpty().withMessage('Password is required')
];
