// tests/projects.test.js
import request from 'supertest';
import app from '../src/server.js';
import { getToken } from './utils.js';

describe('Project Endpoints', () => {
  let projectId;

  it('should create a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${await getToken()}`)
      .send({ name: 'Test Project', description: 'Test desc' });
    expect(res.statusCode).toBe(201);
    projectId = res.body.project.id;
  });

  it('should get all projects', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${await getToken()}`);
    expect(res.statusCode).toBe(200);
  });
});