// tests/auth.test.js
import request from 'supertest';
import { pool } from '../src/config/database.js';
import app from '../src/server.js';

describe('Auth Endpoints', () => {
  const unique = Date.now();
const email = `testuser${unique}@example.com`;
const userName = `testuser${unique}`;

it('should register a new user', async () => {
  const res = await request(app).post('/api/auth/register').send({
    email,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    userName
  });
  console.log(res.body);
  expect(res.statusCode).toBe(201);
  expect(res.body.success).toBe(true);
});

it('should login the user', async () => {
  const res = await request(app).post('/api/auth/login').send({
    email,
    password: 'password123'
  });
  console.log(res.body);
  expect(res.statusCode).toBe(200);
  expect(res.body.token).toBeDefined();
});
  // it('should register a new user', async () => {
  //   const res = await request(app).post('/api/auth/register').send({
  //     email: 'testuser@example.com',
  //     password: 'password123',
  //     firstName: 'Test',
  //     lastName: 'User',
  //     userName: 'testuser1'
  //   });
  //    console.log(res.body);
  //   expect(res.statusCode).toBe(201);
  //   expect(res.body.success).toBe(true);
  // });

  // it('should login the user', async () => {
  //   const res = await request(app).post('/api/auth/login').send({
  //     email: 'testuser@example.com',
  //     password: 'password123'
  //   });
  //    console.log(res.body);
  //   expect(res.statusCode).toBe(200);
  //   expect(res.body.token).toBeDefined();
  // });

  afterAll(async () => {
    // 👇 Close DB pool or connection to fix open handle warning
    await pool.end();
  });
});

