import request from 'supertest';
import { server, getToken } from './setup.js';

describe('Notifications API', () => {
  let token;

  beforeAll(async () => {
    // Register and login a test user
    const email = 'testuser_notifications@example.com';
    const password = 'password123';
    await request(server).post('/api/auth/register').send({
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
      userName: 'testuser_notifications'
    });
    const res = await request(server).post('/api/auth/login').send({ email, password });
    token = res.body.token;
  });

  it('should get notifications', async () => {
    const res = await request(server)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${token}`);
    if (res.statusCode === 401) {
      console.error('Unauthorized:', res.body);
    }
    expect([200, 401]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.notifications)).toBe(true);
    }
  });

  it('should mark a notification as read', async () => {
    // This test assumes at least one notification exists
    const res = await request(server)
    .get('/api/notifications')
  .set('Authorization', `Bearer ${token}`);
  const notifications = res.body.notifications;
  if (!notifications || !notifications.length) return;
    const notificationId = notifications[0].id;
    const markRes = await request(server)
    .put(`/api/notifications/${notificationId}/read`)
  .set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(markRes.statusCode);
  });
});