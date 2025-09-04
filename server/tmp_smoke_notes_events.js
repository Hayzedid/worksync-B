(async ()=>{
  try{
  const base = 'http://127.0.0.1:4100';
  console.log('SMOKE: using base', base);
    // Resolve a fetch implementation: prefer global fetch (Node18+), otherwise try node-fetch
    let fetchFn = typeof fetch === 'function' ? fetch : null;
    if (!fetchFn) {
      try {
        // CommonJS require (works on Node <18 if node-fetch is installed)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        fetchFn = require('node-fetch');
      } catch (e) {
        try {
          // Dynamic import fallback
          // Note: import() returns a namespace with default export
          // eslint-disable-next-line no-await-in-loop
          fetchFn = (await import('node-fetch')).default;
        } catch (err) {
          console.error('Node fetch not available. Install node-fetch or use Node 18+.');
          process.exit(2);
        }
      }
    }

    const ts = Date.now();
    const email = `smoke${ts}@example.com`;
    const password = 'Password123!';

    // register
    await fetchFn(base + '/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password, firstName: 'Smoke', lastName:'Tester', userName:`smoke${ts}` }) });
    const loginRes = await fetchFn(base + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password }) });
    const loginJson = await loginRes.json();
    console.log('LOGIN', loginRes.status, loginJson && loginJson.user && loginJson.user.id);
    const token = loginJson && loginJson.token;
    const headers = { 'Content-Type':'application/json', 'Authorization': token ? `Bearer ${token}` : undefined };

    // Create a project to attach note/event
    const projRes = await fetchFn(base + '/api/projects', { method:'POST', headers, body: JSON.stringify({ name: 'smoke-project-'+ts, status:'active' }) });
    const projJson = await projRes.json().catch(()=>null);
    const projectId = projJson && projJson.project && projJson.project.id;
    console.log('CREATE PROJECT', projRes.status, projectId);

    // 1) Notes: create a note in project
    const noteRes = await fetchFn(`${base}/api/projects/${projectId}/notes`, { method:'POST', headers, body: JSON.stringify({ title: 'smoke note', content: 'note content' }) });
    const noteJson = await noteRes.json().catch(()=>null);
    console.log('CREATE NOTE', noteRes.status, noteJson);
    const noteId = noteJson && noteJson.noteId;

    // 2) List notes for project
    const listNotesRes = await fetchFn(`${base}/api/projects/${projectId}/notes`, { method:'GET', headers });
    const listNotesJson = await listNotesRes.json().catch(()=>null);
    console.log('LIST NOTES', listNotesRes.status, Array.isArray(listNotesJson.notes) ? listNotesJson.notes.length : listNotesJson);

    // 3) Events: create an event
    const start = new Date().toISOString();
    const end = new Date(Date.now()+3600*1000).toISOString();
  // event endpoint expects `start` and `end` fields
  const eventRes = await fetchFn(base + '/api/events', { method:'POST', headers, body: JSON.stringify({ title:'smoke event', start: start, end: end }) });
    const eventJson = await eventRes.json().catch(()=>null);
    console.log('CREATE EVENT', eventRes.status, eventJson);
    const eventId = eventJson && (eventJson.id || eventJson.eventId || (eventJson.event && eventJson.event.id));

    // 4) List events
    const listEventsRes = await fetchFn(base + '/api/events', { method:'GET', headers });
    const listEventsJson = await listEventsRes.json().catch(()=>null);
    console.log('LIST EVENTS', listEventsRes.status, Array.isArray(listEventsJson) ? listEventsJson.length : listEventsJson);

    // 5) Reactions (likes): add reaction to the note
  // reactions API exposed under /api/tasks/reactions
  const reactionRes = await fetchFn(base + '/api/tasks/reactions', { method:'POST', headers, body: JSON.stringify({ type: 'like', target_type: 'note', target_id: noteId }) });
    const reactionJson = await reactionRes.json().catch(()=>null);
    console.log('ADD REACTION', reactionRes.status, reactionJson);

    // 6) Get reactions for note
  const getReactionsRes = await fetchFn(base + '/api/tasks/reactions?target_type=note&target_id='+noteId, { method:'GET', headers });
    const getReactionsJson = await getReactionsRes.json().catch(()=>null);
    console.log('GET REACTIONS', getReactionsRes.status, getReactionsJson && getReactionsJson.reactions ? getReactionsJson.reactions.length : getReactionsJson);

  } catch (err) {
    console.error('Smoke notes/events error', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
