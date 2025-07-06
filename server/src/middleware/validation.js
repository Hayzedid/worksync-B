import { validationResult } from 'express-validator';

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extracted = errors.array().map(err => err.msg);
    return res.status(400).json({
      success: false,
      message: extracted.join(', ')
    });
  }
  next();
}
