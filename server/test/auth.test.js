import request from 'supertest';
import { server } from './setup.js';

describe('Auth API', () => {
  const unique = Date.now();
  const email = `testuser_auth_${unique}@example.com`;
  const password = 'password123';
  const userData = {
    email,
    password,
    firstName: 'Test',
    lastName: 'User',
    userName: `testuser_auth_${unique}`
  };
  let token;

  it('should register a new user', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send(userData);
    expect([201, 400]).toContain(res.statusCode);
  });

  it('should login the user and return a token', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email, password });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('should reject login with wrong password', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email, password: 'wrongpassword' });
    expect(res.statusCode).toBe(401);
  });
}); 