import { randomUUID } from 'node:crypto';
import { readStore, mutateStore, revision, githubEnabled, fail } from './store.mjs';
import { authenticate, readAdmins, saveAdmins, signSession, hashPassword, verifyPassword } from './auth.mjs';

const fields = {
  teachers: ['short_name','full_name'], rooms: ['name','building'],
  courses: ['code','name','type','color','credit','level','term'],
  batches: ['name','level','term','total_weeks','start_date','mid_break_start','mid_break_end','vacant_weeks','is_active'],
  holidays: ['date','title','is_national'],
  weekly_modifications: ['batch_id','week_start','action','source_day','source_slot_index','source_slot_position','source_slot_id','target_day','target_slot_index','target_slot_position','target_room_id'],
};
const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday'];
const pick = (obj, keys) => Object.fromEntries(keys.filter(k => Object.hasOwn(obj,k)).map(k => [k,obj[k]]));
const required = (condition, message) => { if (!condition) throw fail(400, message); };
const mainOnly = user => { if (user.role !== 'admin') throw fail(403, 'Only the main administrator can do this.'); };
const canBatch = (user, id) => { if (user.role !== 'admin' && !user.batch_ids.includes(id)) throw fail(403, 'This batch is not assigned to your account.'); };
const createRow = values => ({ ...values, id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const ref = (tables, table, id) => tables[table].find(r => r.id === id);
function checkRef(tables, table, id, optional = false) { required((optional && id == null) || !!ref(tables,table,id), `Invalid ${table} reference.`); }
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const loginAttempts = new Map();
function limitLogin(req) {
  const address = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0];
  const now = Date.now();
  for (const [key,entry] of loginAttempts) if (entry.until < now) loginAttempts.delete(key);
  const entry = loginAttempts.get(address) || {count:0,until:now + 15 * 60 * 1000};
  entry.count++; loginAttempts.set(address,entry);
  if (entry.count > 15) throw fail(429,'Too many sign-in attempts. Try again in 15 minutes.');
}

function validate(table, row, t) {
  for (const key of fields[table] || []) if (typeof row[key] === 'string') required(row[key].length <= 500, `${key} is too long.`);
  const textKeys = { teachers: ['short_name','full_name'], rooms: ['name'], courses: ['code','name'], batches: ['name'], holidays: ['title'] }[table] || [];
  for (const key of textKeys) required(typeof row[key] === 'string' && row[key].trim(), `${key} is required.`);
  if (['courses','batches'].includes(table)) for (const key of ['level','term']) required((table === 'courses' && row[key] == null) || (Number.isInteger(row[key]) && row[key] >= 1 && row[key] <= (key === 'term' ? 2 : 5)), `Invalid ${key}.`);
  if (table === 'courses') {
    required(['theory','sessional'].includes(row.type), 'Invalid course type.');
    required(typeof row.credit === 'number' && row.credit >= 0 && row.credit <= 20, 'Invalid credit.');
    required(/^#[0-9a-f]{6}$/i.test(row.color), 'Choose a valid course color.');
  }
  if (table === 'batches') {
    required(validDate(row.start_date), 'A valid semester start date is required.');
    required(typeof row.is_active === 'boolean', 'Invalid active setting.');
    required(Number.isInteger(row.total_weeks) && row.total_weeks > 0 && row.total_weeks <= 100, 'Invalid total weeks.');
    required(Number.isInteger(row.vacant_weeks) && row.vacant_weeks >= 0 && row.vacant_weeks < row.total_weeks, 'Invalid vacant weeks.');
    required((!row.mid_break_start && !row.mid_break_end) || (validDate(row.mid_break_start) && validDate(row.mid_break_end) && row.mid_break_end >= row.mid_break_start), 'Set both mid-break dates in order.');
  }
  if (table === 'holidays') required(validDate(row.date) && typeof row.is_national === 'boolean', 'Invalid holiday date or type.');
  if (table === 'weekly_modifications') {
    checkRef(t,'batches',row.batch_id);
    required(validDate(row.week_start) && new Date(row.week_start).getUTCDay() === 0, 'Week must start on Sunday.');
    required(['cancel','reschedule'].includes(row.action), 'Invalid modification action.');
    checkRef(t,'schedule_slots',row.source_slot_id);
    const source = ref(t,'schedule_slots',row.source_slot_id);
    required(source.batch_id === row.batch_id && source.day === row.source_day && source.slot_index === row.source_slot_index && source.slot_position === row.source_slot_position, 'Source class does not match this batch and slot.');
    if (row.action === 'reschedule') {
      required(days.includes(row.target_day) && Number.isInteger(row.target_slot_index) && row.target_slot_index >= 0 && row.target_slot_index <= 9 && row.target_slot_index !== 3 && [0,1].includes(row.target_slot_position), 'Invalid target slot.');
      checkRef(t,'rooms',row.target_room_id,true);
    }
  }
  const unique = { teachers: 'short_name', rooms: 'name', courses: 'code' }[table];
  if (unique) required(!t[table].some(r => r.id !== row.id && r[unique].toLowerCase() === row[unique].toLowerCase()), `${unique} already exists.`);
  if (table === 'weekly_modifications') required(!t[table].some(r => r.id !== row.id && r.source_slot_id === row.source_slot_id && r.week_start === row.week_start), 'This class already has a modification for that week.');
}

async function readBody(req) {
  if (req.body != null) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let data = '';
  for await (const chunk of req) { data += chunk; if (Buffer.byteLength(data) > 100000) throw fail(413,'Request too large.'); }
  try { return data ? JSON.parse(data) : {}; } catch { throw fail(400,'Invalid JSON.'); }
}
function send(res, status, body) { res.statusCode = status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify(body)); }

export async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  try {
    const url = new URL(req.url, 'http://localhost');
    const endpoint = url.searchParams.get('path') || url.pathname.replace(/^\/api\/?/, '');
    const parts = endpoint.replace(/^admin\/?/, '').split('/').filter(Boolean);
    const [resource, id, action] = parts;
    const method = req.method;
    if (endpoint === 'data' && method === 'GET') {
      const { data } = await readStore(Boolean(req.headers.authorization));
      if (!req.headers.authorization) res.setHeader('Cache-Control','public, max-age=0, s-maxage=30, stale-while-revalidate=30');
      return send(res,200,{ tables:data.tables, revision:revision(data), updated_at:data.updated_at });
    }
    if (resource === 'health' && method === 'GET') return send(res,200,{ storage: githubEnabled() ? 'github' : process.env.VERCEL ? 'read-only' : 'local' });
    if (resource === 'login' && method === 'POST') {
      limitLogin(req);
      const body = await readBody(req);
      const { data } = await readStore(true);
      const users = await readAdmins(data);
      const user = users.find(u => u.username === body.username);
      // Always perform a password derivation, including unknown accounts.
      const dummy = '0'.repeat(32) + ':' + '0'.repeat(128);
      if (!verifyPassword(body.password, user?.password_hash || dummy)) throw fail(401,'Invalid username or password.');
      return send(res,200,{ success:true, token:signSession(user), admin:pick(user,['id','username','role']) });
    }
    if (method === 'GET') {
      const { data } = await readStore(true);
      const { user, users } = await authenticate(req,data);
      if (resource === 'me') return send(res,200,pick(user,['id','username','role','batch_ids']));
      if (resource === 'admins') { mainOnly(user); return send(res,200,users.filter(u => u.role === 'coadmin').map(u => pick(u,['id','username','role','batch_ids','created_at']))); }
      throw fail(404,'Endpoint not found.');
    }
    required(['POST','PUT','DELETE'].includes(method), 'Unsupported method.');
    const body = await readBody(req);
    const expected = req.headers['if-match'];
    const saved = await mutateStore(expected, async data => {
      const { user, users } = await authenticate(req,data);
      const t = data.tables;
      // Every first authenticated write persists bootstrap accounts encrypted.
      if (!data.auth) saveAdmins(data,users);
      if (resource === 'change-password') {
        required(body.username === user.username && verifyPassword(body.currentPassword,user.password_hash), 'Current password is incorrect.');
        user.password_hash = hashPassword(body.newPassword);
        saveAdmins(data,users);
        return { success:true, token:signSession(user) };
      }
      if (resource === 'admins') {
        mainOnly(user);
        const target = users.find(u => u.id === id && u.role === 'coadmin');
        if (id && !target) throw fail(404,'Co-admin not found.');
        if ((method === 'POST' && !id) || (method === 'PUT' && action === 'batches')) {
          required(Array.isArray(body.batch_ids), 'Select batches.');
          body.batch_ids.forEach(b => checkRef(t,'batches',b));
        }
        if (method === 'POST' && !id) {
          required(typeof body.username === 'string' && /^[a-zA-Z0-9_.-]{3,50}$/.test(body.username), 'Username must contain 3–50 letters, numbers, dots, dashes or underscores.');
          required(!users.some(u => u.username.toLowerCase() === body.username.toLowerCase()), 'Username already exists.');
          const created = createRow({ username:body.username, role:'coadmin', batch_ids:[...new Set(body.batch_ids)], password_hash:hashPassword(body.password) });
          users.push(created); saveAdmins(data,users); return pick(created,['id','username','role','batch_ids','created_at']);
        }
        if (method === 'PUT' && action === 'password') target.password_hash = hashPassword(body.newPassword);
        else if (method === 'PUT' && action === 'batches') target.batch_ids = [...new Set(body.batch_ids)];
        else if (method === 'DELETE' && id) users.splice(users.indexOf(target),1);
        else throw fail(404,'Endpoint not found.');
        saveAdmins(data,users); return { success:true };
      }
      if (resource === 'upsert-slot' && method === 'POST') {
        const value = pick(body,['batch_id','day','slot_index','slot_position','course_id','teacher_id','room_id','group_name']);
        value.slot_position ??= 0; value.group_name ||= null;
        canBatch(user,value.batch_id); checkRef(t,'batches',value.batch_id);
        required(days.includes(value.day) && Number.isInteger(value.slot_index) && value.slot_index >= 0 && value.slot_index <= 9 && value.slot_index !== 3 && [0,1].includes(value.slot_position), 'Invalid schedule position.');
        for (const [field,table] of [['course_id','courses'],['teacher_id','teachers'],['room_id','rooms']]) checkRef(t,table,value[field],true);
        const existing = t.schedule_slots.find(r => ['batch_id','day','slot_index','slot_position'].every(k => r[k] === value[k]));
        if (!value.course_id && !value.teacher_id && !value.room_id) {
          if (existing) { t.schedule_slots = t.schedule_slots.filter(r => r.id !== existing.id); t.weekly_modifications = t.weekly_modifications.filter(r => r.source_slot_id !== existing.id); }
          return { success:true };
        }
        required(value.course_id && value.teacher_id, 'Select a course and a teacher.');
        if (existing) { Object.assign(existing,value,{ updated_at:new Date().toISOString() }); return existing; }
        const created = createRow(value); t.schedule_slots.push(created); return created;
      }
      if (resource === 'schedule-slots' && method === 'DELETE') {
        const row = ref(t,'schedule_slots',id); if (!row) throw fail(404,'Slot not found.');
        canBatch(user,row.batch_id); t.schedule_slots = t.schedule_slots.filter(r => r.id !== id); t.weekly_modifications = t.weekly_modifications.filter(r => r.source_slot_id !== id); return { success:true };
      }
      if (resource === 'time-settings' && method === 'PUT') {
        mainOnly(user); required(typeof body.use_custom === 'boolean' && Array.isArray(body.custom_slots) && body.custom_slots.length <= 10, 'Invalid time settings.');
        const indexes = new Set();
        for (const slot of body.custom_slots) {
          required(Number.isInteger(slot.index) && slot.index >= 0 && slot.index <= 9 && !indexes.has(slot.index), 'Invalid or duplicate time slot index.'); indexes.add(slot.index);
          required([slot.start,slot.end].every(v => typeof v === 'string' && /^\d{1,2}:\d{2}$/.test(v) && Number(v.split(':')[0]) <= 23 && Number(v.split(':')[1]) <= 59), 'Use H:MM times.');
        }
        const value = { ...t.time_settings[0], use_custom:body.use_custom, custom_slots:body.custom_slots.map(s => pick(s,['index','start','end','isBreak'])) };
        t.time_settings = [value]; return value;
      }
      if (resource === 'holidays-fetch-online' && method === 'POST') {
        mainOnly(user);
        if (!process.env.GOOGLE_CALENDAR_API_KEY) throw fail(503,'Set GOOGLE_CALENDAR_API_KEY to enable holiday import, or add holidays manually.');
        const now = new Date(); const from = new Date(Date.UTC(now.getFullYear(),now.getMonth()-6,1)); const to = new Date(Date.UTC(now.getFullYear(),now.getMonth()+13,1));
        const params = new URLSearchParams({key:process.env.GOOGLE_CALENDAR_API_KEY,timeMin:from.toISOString(),timeMax:to.toISOString(),singleEvents:'true',maxResults:'2500'});
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/en.bd%23holiday%40group.v.calendar.google.com/events?${params}`,{signal:AbortSignal.timeout(10000)});
        if (!response.ok) throw fail(502,'Holiday source unavailable; existing holidays have been kept.');
        const external = await response.json();
        if (!Array.isArray(external.items) || external.nextPageToken) throw fail(502,'Holiday import incomplete; existing holidays have been kept.');
        const fromDate = from.toISOString().slice(0,10), toDate = to.toISOString().slice(0,10);
        t.holidays = t.holidays.filter(r => r.source !== 'fetched' || r.date < fromDate || r.date >= toDate);
        const excluded = new Set([...t.holidays,...t.dismissed_holidays].map(r => `${r.date}|${r.title}`)); let added = 0;
        for (const item of external.items) {
          const date = item.start?.date, title = item.summary;
          if (!validDate(date) || !title || !(item.description || '').toLowerCase().includes('public holiday') || excluded.has(`${date}|${title}`)) continue;
          t.holidays.push(createRow({date,title,is_national:true,source:'fetched'})); excluded.add(`${date}|${title}`); added++;
        }
        return { added, window:{from:fromDate,to:toDate} };
      }
      const table = resource?.replaceAll('-','_');
      if (!Object.hasOwn(fields,table || '')) throw fail(404,'Endpoint not found.');
      const existing = id && ref(t,table,id);
      if (id && !existing) throw fail(404,'Record not found.');
      if (table === 'weekly_modifications') canBatch(user,existing?.batch_id || body.batch_id);
      else if (table === 'batches' && method === 'PUT') canBatch(user,id);
      else mainOnly(user);
      if (method === 'DELETE' && id) {
        const foreignKey = {teachers:'teacher_id',rooms:'room_id',courses:'course_id'}[table];
        if (foreignKey && (t.schedule_slots.some(r => r[foreignKey] === id) || (table === 'rooms' && t.weekly_modifications.some(r => r.target_room_id === id)))) throw fail(409,'This record is used in a schedule. Remove its assignments first.');
        if (table === 'batches') {
          t.schedule_slots = t.schedule_slots.filter(r => r.batch_id !== id);
          t.weekly_modifications = t.weekly_modifications.filter(r => r.batch_id !== id);
          t.weekly_class_tests = t.weekly_class_tests.filter(r => r.batch_id !== id);
          users.forEach(u => u.batch_ids = u.batch_ids.filter(b => b !== id)); saveAdmins(data,users);
        }
        if (table === 'holidays' && existing.source === 'fetched') t.dismissed_holidays.push(createRow(pick(existing,['date','title'])));
        t[table] = t[table].filter(r => r.id !== id); return {success:true};
      }
      if (method === 'PUT' && id) {
        const changes = pick(body,fields[table]);
        if (table === 'weekly_modifications') canBatch(user,changes.batch_id || existing.batch_id);
        const updated = {...existing,...changes,updated_at:new Date().toISOString()}; validate(table,updated,t); Object.assign(existing,updated); return existing;
      }
      if (method === 'POST' && !id) {
        const inputs = Array.isArray(body) ? body : [body]; required(inputs.length > 0 && inputs.length <= 500 && (!Array.isArray(body) || table === 'holidays'), 'Invalid bulk request.');
        const rows = inputs.map(input => { const row = createRow({ ...(table === 'holidays' ? {source:'manual'} : {}), ...pick(input,fields[table]) }); validate(table,row,t); t[table].push(row); return row; });
        return Array.isArray(body) ? rows : rows[0];
      }
      throw fail(404,'Endpoint not found.');
    });
    send(res,200,saved);
  } catch (error) {
    send(res,error.status || 500,{ error: error.status ? error.message : 'Request failed. Check server configuration and try again.' });
  }
}
