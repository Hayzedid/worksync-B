import request from 'supertest';
import app from '../src/server.js';
import { getToken } from './utils.js';

describe('Note Endpoints', () => {
  let noteId;

  it('should create a note', async () => {
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${await getToken()}`)
      .send({ title: 'Note Title', content: 'Content goes here' });
    expect(res.statusCode).toBe(201);
    noteId = res.body.noteId;
  });

  it('should get notes', async () => {
    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
  });
});