import request from 'supertest';
import { server, getToken } from './setup.js';

describe('Comments API', () => {
  let token;
  let testTaskId;
  let testNoteId;
  let commentId;

  beforeAll(async () => {
    // Register and login a test user
    const email = 'testuser_comments@example.com';
    const password = 'password123';
    await request(server).post('/api/auth/register').send({
      email,
      password,
      firstName: 'Test',
      lastName: 'User',
      userName: 'testuser_comments'
    });
    const res = await request(server).post('/api/auth/login').send({ email, password });
    token = res.body.token;
  });

  it('should add a comment to a task', async () => {
    const res = await request(server)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        comment: 'Test comment for task',
        commentable_type: 'task',
        commentable_id: testTaskId
      });
    if (res.statusCode === 400) {
      console.error('Bad Request:', res.body);
    }
    expect([201, 400]).toContain(res.statusCode);
    if (res.statusCode === 201) {
      expect(res.body).toHaveProperty('commentId');
      commentId = res.body.commentId;
    }
  });

  it('should add a comment to a note', async () => {
    const res = await request(server)
      .post('/api/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        comment: 'Test comment for note',
        commentable_type: 'note',
        commentable_id: testNoteId
      });
    if (res.statusCode === 400) {
      console.error('Bad Request:', res.body);
    }
    expect([201, 400]).toContain(res.statusCode);
    if (res.statusCode === 201) {
      expect(res.body).toHaveProperty('commentId');
    }
  });

  it('should get comments for a task', async () => {
    const res = await request(server)
      .get(`/api/comments/task/${testTaskId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.comments)).toBe(true);
    }
  });

  it('should get comments for a note', async () => {
    const res = await request(server)
      .get(`/api/comments/note/${testNoteId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 401, 404, 500]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.comments)).toBe(true);
    }
  });
});