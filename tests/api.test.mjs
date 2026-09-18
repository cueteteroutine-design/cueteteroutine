import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, copyFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { handler } from '../server/api.mjs';

test('JSON API migration, CRUD, permissions, encryption and conflict handling', async t => {
  const temp = await mkdtemp(path.join(tmpdir(),'ete-api-test-'));
  const file = path.join(temp,'store.json');
  await copyFile('data/store.json',file);
  process.env.DATA_FILE = file;
  process.env.AUTH_SECRET = 'test-only-secret-that-is-longer-than-32-characters';
  process.env.ADMIN_USERNAME = 'testadmin';
  process.env.ADMIN_PASSWORD = 'test-only-password-123';
  delete process.env.VERCEL; delete process.env.GITHUB_TOKEN; delete process.env.GITHUB_REPOSITORY;
  const server = createServer(handler); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  let token, rev;
  async function request(endpoint, method='GET', body, override={}) {
    const response = await fetch(base+endpoint,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`} : {}),...(rev?{'If-Match':rev}:{}),...override},body:body===undefined?undefined:JSON.stringify(body)});
    const data = await response.json();
    if(data.revision) rev=data.revision;
    return {status:response.status,data};
  }
  let snapshot;
  await t.test('imports expected row counts and valid references; public response excludes credentials',async()=>{
    const result=await request('data'); snapshot=result.data; assert.equal(result.status,200);
    for(const [name,count] of Object.entries({batches:5,courses:96,teachers:13,rooms:9,schedule_slots:40,holidays:54})) assert.equal(snapshot.tables[name].length,count);
    assert.equal(JSON.stringify(snapshot).includes('password_hash'),false); assert.equal('auth' in snapshot,false);
    for(const row of snapshot.tables.schedule_slots) for(const [field,table] of [['batch_id','batches'],['course_id','courses'],['teacher_id','teachers'],['room_id','rooms']]) if(row[field]) assert.ok(snapshot.tables[table].some(r=>r.id===row[field]));
    assert.ok(Array.isArray(snapshot.tables.time_settings[0].custom_slots));
  });
  await t.test('anonymous writes and admin reads are rejected',async()=>{
    assert.equal((await request('admin/teachers','POST',{short_name:'T',full_name:'Test'})).status,401);
    assert.equal((await request('admin/admins')).status,401);
  });
  await t.test('login accepts configured password and rejects wrong password',async()=>{
    assert.equal((await request('admin/login','POST',{username:'testadmin',password:'bad'})).status,401);
    const login=await request('admin/login','POST',{username:'testadmin',password:process.env.ADMIN_PASSWORD}); assert.equal(login.status,200);token=login.data.token;
    assert.equal((await request('admin/me')).data.role,'admin');
  });
  let teacher;
  await t.test('creates, updates and deletes JSON records; credentials are encrypted on disk',async()=>{
    const created=await request('admin/teachers','POST',{short_name:'TEST',full_name:'Test Teacher'}); assert.equal(created.status,200);teacher=created.data.result;
    assert.equal((await request(`admin/teachers/${teacher.id}`,'PUT',{full_name:'Updated Teacher'})).data.result.full_name,'Updated Teacher');
    const disk=JSON.parse(await readFile(file,'utf8')); assert.ok(disk.auth.content);assert.ok(!JSON.stringify(disk).includes('password_hash')); assert.ok(!JSON.stringify(disk).includes('test-only-password'));
    assert.equal((await request(`admin/teachers/${teacher.id}`,'DELETE')).status,200);
  });
  await t.test('stale revision and invalid data leave the file unchanged',async()=>{
    const before=await readFile(file,'utf8');
    assert.equal((await request('admin/rooms','POST',{name:'stale'},{'If-Match':'outdated'})).status,409);
    assert.equal((await request('admin/teachers','POST',{short_name:'missing-full-name'})).status,400);
    assert.equal(await readFile(file,'utf8'),before);
  });
  await t.test('schedule joins can be reconstructed and referenced records cannot be deleted',async()=>{
    const slot=snapshot.tables.schedule_slots[0];
    assert.equal((await request(`admin/courses/${slot.course_id}`,'DELETE')).status,409);
    const result=await request('admin/upsert-slot','POST',{...slot,group_name:'Test group'}); assert.equal(result.status,200);
    assert.equal(result.data.tables.schedule_slots.find(r=>r.id===slot.id).group_name,'Test group');
  });
  await t.test('co-admin is limited to assigned batches and cannot manage global directories',async()=>{
    const batch=snapshot.tables.batches[0];
    const added=await request('admin/admins','POST',{username:'testcoadmin',password:'coadmin-test-password',batch_ids:[batch.id]}); assert.equal(added.status,200);
    const login=await request('admin/login','POST',{username:'testcoadmin',password:'coadmin-test-password'}); const mainToken=token;token=login.data.token;
    assert.equal((await request('admin/teachers','POST',{short_name:'DENY',full_name:'Denied'})).status,403);
    assert.equal((await request(`admin/batches/${snapshot.tables.batches[1].id}`,'PUT',{name:'Denied'})).status,403);
    assert.equal((await request(`admin/batches/${batch.id}`,'PUT',{name:batch.name})).status,200);
    assert.equal((await request('admin/admins')).status,403);token=mainToken;
  });
  await t.test('weekly modifications preserve source references and delete cleanly',async()=>{
    const s=snapshot.tables.schedule_slots[0];
    const value={batch_id:s.batch_id,week_start:'2026-09-20',action:'cancel',source_day:s.day,source_slot_index:s.slot_index,source_slot_position:s.slot_position,source_slot_id:s.id,target_day:null,target_slot_index:null,target_slot_position:null,target_room_id:null};
    const created=await request('admin/weekly-modifications','POST',value);assert.equal(created.status,200);
    assert.equal((await request('admin/weekly-modifications','POST',value)).status,400);
    assert.equal((await request(`admin/weekly-modifications/${created.data.result.id}`,'DELETE')).status,200);
  });
  await t.test('holiday bulk import and time settings persist',async()=>{
    assert.equal((await request('admin/holidays','POST',[{date:'2026-10-01',title:'Test holiday',is_national:false}])).status,200);
    assert.equal((await request('admin/time-settings','PUT',{use_custom:false,custom_slots:[]})).status,200);
  });
  await t.test('password change invalidates previous sessions and issues a replacement',async()=>{
    const previous=token;
    const result=await request('admin/change-password','POST',{username:'testadmin',currentPassword:process.env.ADMIN_PASSWORD,newPassword:'new-test-password-456'});
    assert.equal(result.status,200); token=result.data.result.token;
    assert.equal((await request('admin/me','GET',undefined,{Authorization:`Bearer ${previous}`})).status,401);
    assert.equal((await request('admin/me')).status,200);
  });
  await t.test('Vercel refuses ephemeral local writes without GitHub configured',async()=>{
    process.env.VERCEL='1'; assert.equal((await request('admin/rooms','POST',{name:'Must not save'})).status,503); delete process.env.VERCEL;
  });
  await t.test('GitHub adapter reads and commits JSON; remote conflicts are returned without a local fallback',async()=>{
    const originalFetch=globalThis.fetch;let remote=JSON.parse(await readFile(file,'utf8'));let sha='sha-one';let writes=0;let conflict=false;
    process.env.GITHUB_TOKEN='test-token';process.env.GITHUB_REPOSITORY='test/repo';
    globalThis.fetch=async (url,options={})=>{
      if(!String(url).startsWith('https://api.github.com/')) return originalFetch(url,options);
      if(options.method==='PUT') {
        writes++; if(conflict) return new Response('{}',{status:409});
        const body=JSON.parse(options.body);assert.equal(body.sha,sha);remote=JSON.parse(Buffer.from(body.content,'base64').toString());sha='sha-'+writes;return Response.json({content:{sha}});
      }
      return Response.json({sha,content:Buffer.from(JSON.stringify(remote)).toString('base64')});
    };
    try {
      await request('data');
      const saved=await request('admin/rooms','POST',{name:'GitHub room',building:'Test'});assert.equal(saved.status,200);assert.equal(writes,1);assert.ok(remote.tables.rooms.some(r=>r.name==='GitHub room'));
      conflict=true;assert.equal((await request('admin/rooms','POST',{name:'Conflict room'})).status,409);assert.ok(!remote.tables.rooms.some(r=>r.name==='Conflict room'));
    } finally {globalThis.fetch=originalFetch;delete process.env.GITHUB_TOKEN;delete process.env.GITHUB_REPOSITORY;}
  });
});
