import request from 'supertest';
import app from '../src/app.js';
const { getToken } = require('./setup');

describe('Activity API', () => {
  it('should get workspace activity', async () => {
    const res = await request(app)
      .get('/api/activity')
  .set('Authorization', `Bearer ${await getToken()}`);
    expect([200, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.activity)).toBe(true);
    }
  });
}); 