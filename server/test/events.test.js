import request from 'supertest';
import app from '../src/server.js';
import { getToken } from './utils.js';

describe('Event Endpoints', () => {
  let eventId;

  it('should create an event', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${await getToken()}`)
      .send({ title: 'Event Title', start: '2025-08-01T10:00:00Z', end: '2025-08-01T11:00:00Z' });
    expect(res.statusCode).toBe(201);
    eventId = res.body.event.id;
  });

  it('should get events', async () => {
    const res = await request(app)
      .get('/api/events')
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
  });
});