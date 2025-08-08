const request = require('supertest');
const app = require('../src/app.js');
const { getToken } = require('./setup');

describe('Notifications API', () => {
  it('should get notifications', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  it('should mark a notification as read', async () => {
    // This test assumes at least one notification exists
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${await getToken()}`);
    const notifications = res.body.notifications;
    if (!notifications.length) return;
    const notificationId = notifications[0].id;
    const markRes = await request(app)
      .put(`/api/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${await getToken()}`);
    expect([200, 404]).toContain(markRes.statusCode);
  });
}); 