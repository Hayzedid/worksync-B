import request from 'supertest';
import app from '../src/server.js';
import { authHeader } from './setup.js';
import authenticateToken from '../src/middleware/auth.js';

describe('User Endpoints', () => {
  it('should get current user profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set(authHeader());
    expect(res.statusCode).toBe(200);
    expect(res.body.user).toBeDefined();
  });
});
 

// import request from 'supertest';
// import app from '../src/app'; // or your server/app entry
// import { authHeader } from './helpers'; // ← how you're importing this

// describe('User Endpoints', () => {
//   it('should get current user profile', async () => {
//     const res = await request(app)
//       .get('/api/users/me')
//       .set(authHeader()); // <-- need to inspect how this token is generated
//     expect(res.statusCode).toBe(200);
//     expect(res.body.user).toBeDefined();
//   });
// });
