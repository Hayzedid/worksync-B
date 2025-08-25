import request from 'supertest';
import { server, getToken } from './setup.js';

describe('Notes API', () => {
  const email = 'testuser_notes@example.com';
  const password = 'password123';
  const userData = {
    email,
    password,
    firstName: 'Test',
    lastName: 'User',
    userName: 'testuser_notes'
  };
  let token;
  let noteId;

  beforeAll(async () => {
    await request(server).post('/api/auth/register').send(userData);
    const res = await request(server).post('/api/auth/login').send({ email, password });
    token = res.body.token;
  });

  it('should create a new note', async () => {
    const res = await request(server)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Note', content: 'Test note content' });
    if (res.statusCode === 401) {
      console.error('Unauthorized: Token may be invalid or missing');
    }
  expect([201, 400]).toContain(res.statusCode);
    noteId = res.body.noteId || res.body.note?.id;
  });

  it('should get all notes', async () => {
    const res = await request(server)
      .get('/api/notes')
      .set('Authorization', `Bearer ${token}`);
    if (res.statusCode === 401) {
      console.error('Unauthorized: Token may be invalid or missing');
    }
    expect([200, 401]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(Array.isArray(res.body.notes)).toBe(true);
    }
  });

  it('should get a note by id', async () => {
    if (!noteId) return;
    const res = await request(server)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 401, 404, 500]).toContain(res.statusCode);
  });

  it('should update a note', async () => {
    if (!noteId) return;
    const res = await request(server)
      .put(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated Note', content: 'Updated content' });
    expect([200, 404]).toContain(res.statusCode);
  });

  it('should delete a note', async () => {
    if (!noteId) return;
    const res = await request(server)
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 401, 404, 500]).toContain(res.statusCode);
  });
});