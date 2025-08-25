import cors from 'cors';
import { FRONTEND_URL } from '../config/config.js';

const corsOptions = {
  origin: FRONTEND_URL, // Only allow your frontend
  credentials: true,
  optionsSuccessStatus: 204,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'X-Workspace-Id'
  ],
  // You can further restrict headers or add a whitelist function for more control
};

export default cors(corsOptions);
