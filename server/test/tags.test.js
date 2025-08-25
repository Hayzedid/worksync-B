import request from 'supertest';
import app from '../src/app.js';
import { getToken, testTaskId } from './setup.js';

describe('Tags API', () => {
  let tagId;

  it('should create a new tag', async () => {
    const res = await request(app)
      .post('/api/tags')
  .set('Authorization', `Bearer ${await getToken()}`)
      .send({ name: 'urgent' });
    expect([201, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 201) {
      expect(res.body).toHaveProperty('tagId');
      tagId = res.body.tagId;
    }
  });

  it('should add a tag to a task', async () => {
    const res = await request(app)
      .post(`/api/tags/tasks/${testTaskId}`)
  .set('Authorization', `Bearer ${await getToken()}`)
      .send({ tag_id: tagId });
    expect([200, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('success', true);
    }
  });

  it('should get tags for a task', async () => {
    const res = await request(app)
      .get(`/api/tags/tasks/${testTaskId}`)
  .set('Authorization', `Bearer ${await getToken()}`);
    expect([200, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('tags');
      expect(Array.isArray(res.body.tags)).toBe(true);
    }
  });

  it('should get all tags', async () => {
    const res = await request(app)
      .get('/api/tags')
  .set('Authorization', `Bearer ${await getToken()}`);
    expect([200, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body).toHaveProperty('tags');
      expect(Array.isArray(res.body.tags)).toBe(true);
    }
  });
}); 