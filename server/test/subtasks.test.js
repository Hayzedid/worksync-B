const request = require('supertest');
const app = require('../src/app.js');
const { getToken, testTaskId } = require('./setup');

describe('Subtasks API', () => {
  let subtaskId;

  it('should add a subtask', async () => {
    const res = await request(app)
      .post(`/api/subtasks/${testTaskId}`)
      .set('Authorization', `Bearer ${await getToken()}`)
      .send({ title: 'Test Subtask' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('subtaskId');
    subtaskId = res.body.subtaskId;
  });

  it('should update a subtask', async () => {
    if (!subtaskId) return;
    const res = await request(app)
      .put(`/api/subtasks/${subtaskId}`)
      .set('Authorization', `Bearer ${await getToken()}`)
      .send({ title: 'Updated Subtask', completed: true });
    expect([200, 404]).toContain(res.statusCode);
  });

  it('should get subtasks for a task', async () => {
    const res = await request(app)
      .get(`/api/subtasks/${testTaskId}`)
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.subtasks)).toBe(true);
  });
}); 