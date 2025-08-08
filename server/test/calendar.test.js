const request = require('supertest');
const app = require('../src/app.js');
const { getToken } = require('./setup');

describe('Calendar API', () => {
  it('should get calendar data', async () => {
    const res = await request(app)
      .get('/api/calendar?start=2023-01-01&end=2023-12-31')
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('tasks');
    expect(res.body).toHaveProperty('events');
    expect(Array.isArray(res.body.tasks)).toBe(true);
    expect(Array.isArray(res.body.events)).toBe(true);
  });
}); 