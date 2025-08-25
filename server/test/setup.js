import request from 'supertest';
import http from 'http';
import app from '../src/app.js';
import { clearAllTestData } from './dbUtils.js';



let server;
let token = null;
let testUserId = null;
let testTaskId = null;
let testNoteId = null;

// Generate a unique test user for each run
const TEST_USER_SUFFIX = Date.now();
const TEST_USER_EMAIL = `testuser_${TEST_USER_SUFFIX}@example.com`;
const TEST_USER_USERNAME = `testuser_${TEST_USER_SUFFIX}`;


const getToken = async () => {
  if (token && testUserId) return token;
  // Ensure the test user is registered
  await request(server).post('/api/auth/register').send({
    email: TEST_USER_EMAIL,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    userName: TEST_USER_USERNAME
  });
  // Login the test user
  const res = await request(server).post('/api/auth/login').send({
    email: TEST_USER_EMAIL,
    password: 'password123'
  });
  console.log('Login response:', res.body); // Debug log
  token = res.body.token;
  testUserId = res.body.user?.id || res.body.userId || null;
  return token;
};

const authHeader = async () => ({
  Authorization: `Bearer ${await getToken()}`,
});


// Start/stop server and clean DB for all tests
beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  await clearAllTestData();
});

afterAll(async () => {
  await clearAllTestData();
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(async () => {
  // Ensure test user is created and logged in
  await getToken();
  // Create a test task with created_by set to testUserId
  const taskRes = await request(server)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Test Task', description: 'Seeded for tests', created_by: testUserId });
  testTaskId = taskRes.body.taskId || taskRes.body.task?.id || 1;
  // Create a test note with created_by set to testUserId
  const noteRes = await request(server)
    .post('/api/notes')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Test Note', content: 'Seeded for tests', created_by: testUserId });
  testNoteId = noteRes.body.noteId || noteRes.body.note?.id || 1;
});

afterEach(async () => {
  // Delete the test task
  if (testTaskId) {
    await request(server)
      .delete(`/api/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${await getToken()}`);
    testTaskId = null;
  }
  // Delete the test note
  if (testNoteId) {
    await request(server)
      .delete(`/api/notes/${testNoteId}`)
      .set('Authorization', `Bearer ${await getToken()}`);
    testNoteId = null;
  }
});

export { server, getToken, authHeader, testUserId, testTaskId, testNoteId };
