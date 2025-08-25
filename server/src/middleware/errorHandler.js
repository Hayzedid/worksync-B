import { NODE_ENV } from '../config/config.js';

export default function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err);

  // Use any status already set, otherwise default to 500
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : (err.statusCode || 500);
  const message = NODE_ENV === 'production'
    ? (status === 500 ? 'Internal Server Error' : (err.message || 'Error'))
    : (err.message || 'Internal Server Error');

  res.status(status).json({
    success: false,
    message,
    ...(NODE_ENV === 'production' ? {} : { stack: err.stack })
  });
}
