(async ()=>{
  try{
    const base = 'http://localhost:4100';
    const ts = Date.now();
    const email = `smoke_tasks${ts}@example.com`;
    const password = 'Password123!';

    const fetchFn = fetch;

    // register
    console.log('Registering', email);
    await fetchFn(base + '/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password, firstName:'Smoke', lastName:'Tester', userName:'smoketasks' }) });
    const loginRes = await fetchFn(base + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    const loginJson = await loginRes.json().catch(()=>null);
    console.log('Login status', loginRes.status, loginJson ? 'token=yes' : 'no-json');
    const authHeader = loginJson && loginJson.token ? `Bearer ${loginJson.token}` : null;
    const headers = { 'Content-Type':'application/json', ...(authHeader ? { Authorization: authHeader } : {}) };

    // 1 GET tasks
    let res = await fetchFn(base + '/api/tasks', { headers });
    console.log('GET /api/tasks', res.status);
    let body = await res.text(); console.log(body.slice(0,1000));

    // 2 Create task directly
    res = await fetchFn(base + '/api/tasks', { method:'POST', headers, body: JSON.stringify({ title: 'Direct smoke task', description: 'created by smoke script' }) });
    console.log('POST /api/tasks', res.status);
    body = await res.text(); console.log(body.slice(0,2000));
    let json = null;
    try{ json = JSON.parse(body); }catch(e){}
    const taskId = json && (json.taskId || (json.task && json.task.id) || json.id) || null;

    // 3 GET /api/tasks/:id
    if(taskId){
      res = await fetchFn(base + '/api/tasks/' + taskId, { headers });
      console.log('GET /api/tasks/' + taskId, res.status);
      console.log((await res.text()).slice(0,1000));

      // Update
      res = await fetchFn(base + '/api/tasks/' + taskId, { method:'PUT', headers, body: JSON.stringify({ title: 'Updated by smoke', status: 'in_progress' }) });
      console.log('PUT /api/tasks/' + taskId, res.status, (await res.text()).slice(0,1000));

      // Patch
      res = await fetchFn(base + '/api/tasks/' + taskId, { method:'PATCH', headers, body: JSON.stringify({ description: 'Patched description' }) });
      console.log('PATCH /api/tasks/' + taskId, res.status, (await res.text()).slice(0,1000));

      // Dependencies: add a dummy dependency to itself (API may accept)
      res = await fetchFn(base + '/api/tasks/' + taskId + '/dependencies', { method:'POST', headers, body: JSON.stringify({ blocked_by_task_id: taskId }) });
      console.log('POST dependency', res.status, (await res.text()).slice(0,1000));
      res = await fetchFn(base + '/api/tasks/' + taskId + '/dependencies', { headers });
      console.log('GET dependencies', res.status, (await res.text()).slice(0,1000));

      // Reactions
      res = await fetchFn(base + '/api/tasks/reactions', { method:'POST', headers, body: JSON.stringify({ type: 'like', target_type: 'task', target_id: taskId }) });
      console.log('POST reaction', res.status, (await res.text()).slice(0,1000));
      res = await fetchFn(base + '/api/tasks/reactions?target_type=task&target_id=' + taskId, { headers });
      console.log('GET reactions', res.status, (await res.text()).slice(0,2000));
      const reactionsJson = await res.json().catch(()=>null);
      const reactionId = reactionsJson && reactionsJson.reactions && reactionsJson.reactions[0] && reactionsJson.reactions[0].id;
      if(reactionId){
        res = await fetchFn(base + '/api/tasks/reactions/' + reactionId, { method:'DELETE', headers });
        console.log('DELETE reaction', res.status, (await res.text()).slice(0,1000));
      }

      // Delete task
      res = await fetchFn(base + '/api/tasks/' + taskId, { method:'DELETE', headers });
      console.log('DELETE task', res.status, (await res.text()).slice(0,1000));
    }

    console.log('\nSmoke finished');
    process.exit(0);
  }catch(err){
  console.error('Smoke error', err && (err.stack || err.message) || err);
    process.exit(1);
  }
})();
