// tests/tasks.test.js
import request from 'supertest';
import app from '../src/server.js';
import { getToken } from './utils.js';

describe('Task Endpoints', () => {
  let taskId;

  it('should create a task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${await getToken()}`)
      .send({ title: 'New Task', description: 'Task description' });
    expect(res.statusCode).toBe(201);
    taskId = res.body.task.id;
  });

  it('should fetch tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
  });
});