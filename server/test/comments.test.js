const request = require('supertest');
const app = require('../src/app.js');
const { getToken, testTaskId, testNoteId } = require('./setup');

describe('Comments API', () => {
  let commentId;

  it('should add a comment to a task', async () => {
    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${await getToken()}`)
      .send({
        content: 'Test comment on task',
        commentable_type: 'task',
        commentable_id: testTaskId
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('commentId');
    commentId = res.body.commentId;
  });

  it('should add a comment to a note', async () => {
    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${await getToken()}`)
      .send({
        content: 'Test comment on note',
        commentable_type: 'note',
        commentable_id: testNoteId
      });
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('commentId');
  });

  it('should get comments for a task', async () => {
    const res = await request(app)
      .get(`/api/comments/task/${testTaskId}`)
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.comments)).toBe(true);
  });

  it('should get comments for a note', async () => {
    const res = await request(app)
      .get(`/api/comments/note/${testNoteId}`)
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.comments)).toBe(true);
  });
}); 