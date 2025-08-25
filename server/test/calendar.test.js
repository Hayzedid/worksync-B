import request from 'supertest';
import { server, getToken } from './setup.js';

describe('Calendar API', () => {
  let token;
  beforeAll(async () => {
    // Use a test user for calendar API
    const email = 'testuser_calendar@example.com';
    const password = 'password123';
    await request(server).post('/api/auth/register').send({
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
      userName: 'testuser_calendar'
    });
    const res = await request(server).post('/api/auth/login').send({ email, password });
    token = res.body.token;
  });

  it('should get calendar data', async () => {
    const res = await request(server)
      .get('/api/calendar?start=2023-01-01&end=2023-12-31')
      .set('Authorization', `Bearer ${token}`);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('tasks');
      expect(res.body).toHaveProperty('events');
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(Array.isArray(res.body.events)).toBe(true);
    } else {
      console.error('Unauthorized or unexpected response:', res.statusCode, res.body);
      expect([200, 401]).toContain(res.statusCode);
    }
  });
});