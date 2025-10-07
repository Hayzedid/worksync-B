const request = require('supertest')

const BASE = process.env.BASE_URL || 'http://localhost:3100'

describe('Activity endpoints', () => {
  let token
  test('login and fetch /api/activity normalized shape', async () => {
    const loginRes = await request(BASE).post('/api/auth/login').send({ email: 'testee@gmail.com', password: '1a2b3c' })
    expect(loginRes.status).toBe(200)
    expect(loginRes.body).toHaveProperty('token')
    token = loginRes.body.token

    const res = await request(BASE).get('/api/activity').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('activities')
    expect(Array.isArray(res.body.activities)).toBe(true)
    for (const a of res.body.activities) {
      expect(a).toHaveProperty('id')
      expect(a).toHaveProperty('type')
      expect(a).toHaveProperty('user')
      expect(a.user).toHaveProperty('name')
      expect(a).toHaveProperty('message')
      expect(a).toHaveProperty('createdAt')
    }
  }, 20000)
})
