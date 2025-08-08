const request = require('supertest');
const app = require('../src/app');
const { getToken, testTaskId } = require('./setup');

describe('Tags API', () => {
  let tagId;

  it('should create a new tag', async () => {
    const res = await request(app)
      .post('/api/tags')
      .set('Authorization', `Bearer ${await getToken()}`)
      .send({ name: 'urgent' });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('tagId');
    tagId = res.body.tagId;
  });

  it('should add a tag to a task', async () => {
    const res = await request(app)
      .post(`/api/tags/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${await getToken()}`)
      .send({ tag_id: tagId });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
  });

  it('should get tags for a task', async () => {
    const res = await request(app)
      .get(`/api/tags/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('tags');
    expect(Array.isArray(res.body.tags)).toBe(true);
  });

  it('should get all tags', async () => {
    const res = await request(app)
      .get('/api/tags')
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('tags');
    expect(Array.isArray(res.body.tags)).toBe(true);
  });
}); 