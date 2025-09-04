(async ()=>{
  try{
    const hasFetch = typeof fetch === 'function';
    if(!hasFetch){
      console.error('global fetch not available in this Node. Node 18+ required.');
      process.exit(2);
    }

    const base = 'http://localhost:4100';

    // 1) Register a temporary user
    const ts = Date.now();
    const email = `smoke${ts}@example.com`;
    const password = 'Password123!';
    const registerRes = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password, firstName: 'Smoke', lastName: 'Tester', userName: `smoke${ts}` })
    });
    const registerBody = await registerRes.text();
    console.log('\n=== REGISTER ->', registerRes.status, '===');
    console.log(registerBody.slice(0,2000));

    // 2) Login to obtain token (and cookie)
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    const loginJson = await loginRes.json().catch(()=>null);
    console.log('\n=== LOGIN ->', loginRes.status, '===');
    console.log(loginJson);

    let authHeader = null;
    let cookieHeader = null;
    if (loginJson && loginJson.token) {
      authHeader = `Bearer ${loginJson.token}`;
    }
    // Extract set-cookie from raw headers if present (node fetch doesn't expose set-cookie easily); try to read from response.headers
    const sc = loginRes.headers.get('set-cookie');
    if (sc) cookieHeader = sc.split(';')[0];

    const headersAuth = (extra={}) => {
      const h = {'Content-Type':'application/json', ...extra};
      if (authHeader) h['Authorization'] = authHeader;
      if (cookieHeader) h['Cookie'] = cookieHeader;
      return h;
    };

    // 3) Authenticated endpoints
    const endpoints = [
      {method:'GET', url: base + '/api/health', headers: {}},
      {method:'GET', url: base + '/api/activity', headers: headersAuth()},
      {method:'POST', url: base + '/api/projects', headers: headersAuth(), body: JSON.stringify({name:'smoke-project-'+ts, status:'active'})},
    ];

    for(const e of endpoints){
      try{
        const res = await fetch(e.url, {method:e.method, headers:e.headers, body:e.body});
        const text = await res.text();
        console.log('\n===', e.method, e.url, '->', res.status, '===');
        console.log(text.slice(0,2000));
        // If project created, capture ID and create a task under it
        if (e.url.endsWith('/api/projects') && res.status >= 200 && res.status < 300) {
          const json = JSON.parse(text);
          const projectId = json.project?.id || json.project?.project_id || json.project?.id || json.projectId || json.project?.id || json.project?.id || (json.project && json.project.id) || (json.projectId);
          const pid = projectId || (json.project && json.project.id) || json.projectId || json.project || null;
          const actualId = pid || json.project?.id || json.projectId || null || (json.project && json.project.id);
          const finalId = actualId || (json.project && json.project.id) || null;
          // Try to parse id heuristically
          let id = null;
          if (json && json.project && json.project.id) id = json.project.id;
          if (!id && json && json.projectId) id = json.projectId;
          if (!id && json && json.taskId) id = json.taskId; // fallback
          if (!id && json && json.id) id = json.id;
          if (!id) {
            // try to fetch recent projects list
            const listRes = await fetch(base + '/api/projects', { headers: headersAuth() });
            const listJson = await listRes.json().catch(()=>null);
            id = Array.isArray(listJson.projects) && listJson.projects[0] && listJson.projects[0].id ? listJson.projects[0].id : null;
          }
          if (id) {
            // create a task in project
            const taskRes = await fetch(`${base}/api/projects/${id}/tasks`, { method:'POST', headers: headersAuth(), body: JSON.stringify({ title: 'smoke task', status: 'todo' }) });
            const taskText = await taskRes.text();
            console.log('\n=== POST /api/projects/' + id + '/tasks ->', taskRes.status, '===');
            console.log(taskText.slice(0,2000));
          } else {
            console.log('Could not determine project id from response, skipping task creation.');
          }
        }
      }catch(err){
        console.error('\nERR', e.method, e.url, err && err.message ? err.message : err);
      }
    }
  }catch(err){
    console.error('Smoke script error:', err);
    process.exit(1);
  }
})();
