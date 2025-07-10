import request from 'supertest';
import app from '../src/server.js';

let token = null;

export const getToken = async () => {
  if (token) return token;

  // Ensure the test user is registered
  await request(app).post('/api/auth/register').send({
    email: 'testuser@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  });

  // Login the test user
  const res = await request(app).post('/api/auth/login').send({
    email: 'testuser@example.com',
    password: 'password123'
  });

  token = res.body.token;
  return token;
};

export const authHeader = async () => ({
  Authorization: `Bearer ${await getToken()}`,
});





// import request from 'supertest';
// import app from '../src/server.js';

// let token = '';

// beforeAll(async () => {
//   // Try to register the user (ignore errors if already exists)
//   await request(app).post('/api/auth/register').send({
//     email: 'test@example.com',
//     password: 'password123',
//     firstName: 'Test',
//     lastName: 'User',
//     userName: 'testuser'
//   });

//   // Now login
//   const res = await request(app).post('/api/auth/login').send({
//     email: 'test@example.com',
//     password: 'password123'
//   });
//   token = res.body.token;
// });

// export const authHeader = () => ({ Authorization: `Bearer ${token}` });
