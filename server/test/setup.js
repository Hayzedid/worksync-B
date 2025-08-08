const request = require('supertest');
const app = require('../src/app.js');

let token = null;
let testTaskId = null;
let testNoteId = null;

const getToken = async () => {
  if (token) return token;

  // Ensure the test user is registered
  await request(app).post('/api/auth/register').send({
    email: 'testuser@example10.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    userName: 'testuser'
  });

  // Login the test user
  const res = await request(app).post('/api/auth/login').send({
    email: 'testuser@example10.com',
    password: 'password123'
  });

  console.log('Login response:', res.body); // Debug log
  token = res.body.token;
  return token;
};

const authHeader = async () => ({
  Authorization: `Bearer ${await getToken()}`,
});

// Seed and cleanup hooks for test data
beforeEach(async () => {
  // Create a test task
  const taskRes = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${await getToken()}`)
    .send({ title: 'Test Task', description: 'Seeded for tests' });
  testTaskId = taskRes.body.taskId || taskRes.body.task?.id || 1;

  // Create a test note
  const noteRes = await request(app)
    .post('/api/notes')
    .set('Authorization', `Bearer ${await getToken()}`)
    .send({ title: 'Test Note', content: 'Seeded for tests' });
  testNoteId = noteRes.body.noteId || noteRes.body.note?.id || 1;
});

afterEach(async () => {
  // Delete the test task
  if (testTaskId) {
    await request(app)
      .delete(`/api/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${await getToken()}`);
    testTaskId = null;
  }
  // Delete the test note
  if (testNoteId) {
    await request(app)
      .delete(`/api/notes/${testNoteId}`)
      .set('Authorization', `Bearer ${await getToken()}`);
    testNoteId = null;
  }
});

module.exports = { getToken, authHeader, testTaskId, testNoteId };
