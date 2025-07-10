import request from 'supertest';
import app from '../src/server.js';

let token = null;

export const getToken = async () => {
  if (token) return token;

  const res = await request(app).post('/api/auth/login').send({
    email: 'testuser@example.com',
    password: 'password123'
  });

  token = res.body.token;
  return token;
};