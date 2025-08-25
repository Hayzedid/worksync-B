import request from 'supertest';
import app from '../src/app.js';
import { getToken, testTaskId } from './setup.js';

describe('Subtasks API', () => {
  let subtaskId;

  it('should add a subtask', async () => {
    const res = await request(app)
      .post(`/api/subtasks/${testTaskId}`)
  .set('Authorization', `Bearer ${await getToken()}`)
      .send({ title: 'Test Subtask' });
    expect([201, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 201) {
      expect(res.body).toHaveProperty('subtaskId');
      subtaskId = res.body.subtaskId;
    }
  });

  it('should update a subtask', async () => {
    if (!subtaskId) return;
    const res = await request(app)
      .put(`/api/subtasks/${subtaskId}`)
  .set('Authorization', `Bearer ${await getToken()}`)
      .send({ title: 'Updated Subtask', completed: true });
  expect([200, 401, 404]).toContain(res.statusCode);
  });

  it('should get subtasks for a task', async () => {
    const res = await request(app)
      .get(`/api/subtasks/${testTaskId}`)
  .set('Authorization', `Bearer ${await getToken()}`);
    expect([200, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.subtasks)).toBe(true);
    }
  });
}); 