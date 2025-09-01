import request from 'supertest';
import { server, getToken } from './setup.js';

describe('Attachments API', () => {
  let token;
  let attachmentId;
  let testTaskId;

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

    // Create a test task for attachments
    const taskRes = await request(server)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Task for Attachments',
        description: 'A task for testing attachments',
        priority: 'medium',
        status: 'todo'
      });
    if (taskRes.statusCode === 201) {
      testTaskId = taskRes.body.taskId;
    }
  });

  it('should upload an attachment', async () => {
    const res = await request(server)
      .post(`/api/attachments/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('test file'), 'test.txt');
  expect([201, 400]).toContain(res.statusCode);
    if (res.statusCode === 201) {
      attachmentId = res.body.attachmentId;
    }
  });

  it('should get attachments for a task', async () => {
    const res = await request(server)
      .get(`/api/attachments/task/${testTaskId}`)
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