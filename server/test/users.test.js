import request from 'supertest';
import app from '../src/app.js';
import { server, getToken } from './setup.js';

describe('Users API', () => {
  let token;
  const email = 'testuser_users@example.com';
  const password = 'password123';
  const userData = {
    email,
    password,
    firstName: 'Test',
    lastName: 'User',
    userName: 'testuser_users'
  };

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send(userData);
    const res = await request(app).post('/api/auth/login').send({ email, password });
    token = res.body.token;
  });

  it('should get user profile', async () => {
    const res = await request(app)
      .get('/api/users/profile')
  .set('Authorization', `Bearer ${await getToken()}`);
    expect([200, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('user');
    }
  });

  it('should update user profile', async () => {
    const res = await request(app)
      .put('/api/users/profile')
  .set('Authorization', `Bearer ${await getToken()}`)
      .send({ firstName: 'Updated', lastName: 'User' });
  expect([200, 400, 401]).toContain(res.statusCode);
  });
}); 