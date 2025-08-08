const request = require('supertest');
const app = require('../src/app.js');
const { getToken } = require('./setup');

describe('Activity API', () => {
  it('should get workspace activity', async () => {
    const res = await request(app)
      .get('/api/activity')
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.activity)).toBe(true);
  });
}); 