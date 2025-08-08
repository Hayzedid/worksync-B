const request = require('supertest');
const app = require('../src/app.js');
const { getToken, testTaskId } = require('./setup');
const fs = require('fs');
const path = require('path');

describe('Attachments API', () => {
  let attachmentId;

  it('should upload an attachment', async () => {
    const res = await request(app)
      .post('/api/attachments')
      .set('Authorization', `Bearer ${await getToken()}`)
      .attach('file', Buffer.from('dummy file content'), 'testfile.txt')
      .field('task_id', testTaskId);
    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('attachmentId');
    attachmentId = res.body.attachmentId;
  });

  it('should get attachments for a task', async () => {
    const res = await request(app)
      .get(`/api/attachments/task/${testTaskId}`)
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.attachments)).toBe(true);
  });

  it('should delete an attachment', async () => {
    if (!attachmentId) return;
    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${await getToken()}`);
    expect([200, 404]).toContain(res.statusCode);
  });
}); 