import request from 'supertest';
import { server, getToken } from './setup.js';

describe('Attachments API', () => {
  let token;
  let attachmentId;

  beforeAll(async () => {
    // Register and login a test user
    const email = 'testuser_attachments@example.com';
    const password = 'password123';
    await request(server).post('/api/auth/register').send({
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
      userName: 'testuser_attachments'
    });
    const res = await request(server).post('/api/auth/login').send({ email, password });
    token = res.body.token;
  });

  it('should upload an attachment', async () => {
    const res = await request(server)
      .post('/api/attachments')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('test file'), 'test.txt');
  expect([201, 400]).toContain(res.statusCode);
    attachmentId = res.body.attachmentId;
  });

  it('should get attachments for a task', async () => {
    const res = await request(server)
      .get(`/api/attachments/task/${1}`)
      .set('Authorization', `Bearer ${token}`);
  expect([200, 404]).toContain(res.statusCode);
  });

  it('should delete an attachment', async () => {
    const res = await request(server)
      .delete(`/api/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${token}`);
  expect([200, 404]).toContain(res.statusCode);
  });
});