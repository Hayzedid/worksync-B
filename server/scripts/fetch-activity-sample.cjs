const http = require('http')
const https = require('https')
const { URL } = require('url')

function request(opts, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(opts.url)
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request(url, { method: opts.method || 'GET', headers: opts.headers || {} }, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        let parsed = data
        try { parsed = JSON.parse(data) } catch (e) {}
        resolve({ status: res.statusCode, body: parsed })
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

(async function(){
  try{
    const base = process.env.BASE_URL || 'http://localhost:3100'
    console.log('Using base URL', base)

    const login = await request({ url: `${base}/api/auth/login`, method: 'POST', headers: { 'Content-Type':'application/json' } }, { email: 'testee@gmail.com', password: '1a2b3c' })
    console.log('/api/auth/login', login.status)
    if (login.status !== 200) { console.error('Login failed', login.body); process.exit(1) }
    const token = login.body && login.body.token
    console.log('token?', !!token)

    const headers = { Authorization: `Bearer ${token}` }
    const a = await request({ url: `${base}/api/activity`, headers })
    console.log('/api/activity', a.status, JSON.stringify(a.body, null, 2))

    const b = await request({ url: `${base}/api/workspaces/1/activity`, headers })
    console.log('/api/workspaces/1/activity', b.status, JSON.stringify(b.body, null, 2))

    const c = await request({ url: `${base}/api/activity/all`, headers })
    console.log('/api/activity/all', c.status, JSON.stringify(c.body, null, 2))
  }catch(e){
    console.error('error', e && e.message || e)
    process.exit(2)
  }
})()
