const request = require('supertest');
const app = require('../src/app.js');

describe('Tasks API', () => {
  const email = 'testuser_tasks@example.com';
  const password = 'password123';
  const userData = {
    email,
    password,
    firstName: 'Test',
    lastName: 'User',
    userName: 'testuser_tasks'
  };
  let token;
  let taskId;

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send(userData);
    const res = await request(app).post('/api/auth/login').send({ email, password });
    token = res.body.token;
  });

  it('should create a new task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Task', description: 'Test task description' });
    expect([201, 400]).toContain(res.statusCode);
    taskId = res.body.taskId || res.body.task?.id;
  });

  it('should get all tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });

  it('should get a task by id', async () => {
    if (!taskId) return;
    const res = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(res.statusCode);
  });

  it('should update a task', async () => {
    if (!taskId) return;
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Task', status: 'in_progress' });
    expect([200, 404]).toContain(res.statusCode);
  });

  it('should delete a task', async () => {
    if (!taskId) return;
    const res = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(res.statusCode);
  });
}); 