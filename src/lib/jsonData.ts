type Snapshot = { tables: Record<string, any[]>; revision: string; updated_at: string | null };
let snapshot: Snapshot | null = null;
let pending: Promise<Snapshot> | null = null;
let loadedAt = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
export async function loadData(): Promise<Snapshot> {
  if (snapshot && Date.now() - loadedAt < 30000) return snapshot;
  let token: string | undefined;
  try { token = JSON.parse(sessionStorage.getItem('admin_session') || 'null')?.token; } catch { /* Ignore invalid stored sessions. */ }
  if (!pending) pending = fetch('/api/data', { cache: 'no-store', headers: token ? {Authorization:`Bearer ${token}`} : {} }).then(async response => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to load the calendar.');
    snapshot = result; loadedAt = Date.now(); return result;
  }).finally(() => { pending = null; });
  return pending;
}
export function subscribeData(listener: () => void) {
  listeners.add(listener);
  if (!timer) timer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    loadedAt = 0;
    listeners.forEach(callback => callback());
  }, 60000);
  return () => { listeners.delete(listener); if (!listeners.size) { clearInterval(timer); timer = undefined; } };
}
export function acceptSnapshot(value: Snapshot) {
  snapshot = value; loadedAt = Date.now();
  listeners.forEach(callback => callback());
}
export async function publicRead(path: string): Promise<any> {
  const { tables: t } = await loadData();
  const url = new URL(path, 'https://local');
  const [resource, id] = url.pathname.replace(/^\/api\/admin/, '').split('/').filter(Boolean);
  const table = resource.replace(/-/g,'_');
  if (!Object.prototype.hasOwnProperty.call(t,table) || ['dismissed_holidays','weekly_class_tests'].includes(table)) throw new Error('Unknown public resource.');
  const join = (row: any) => row ? { ...row, courses:t.courses.find(r => r.id === row.course_id) || null, teachers:t.teachers.find(r => r.id === row.teacher_id) || null, rooms:t.rooms.find(r => r.id === row.room_id) || null } : null;
  let rows = t[table].map(row => ({...row}));
  if (table === 'time_settings') return rows[0] || {use_custom:false,custom_slots:[]};
  if (table === 'schedule_slots') rows = rows.map(join);
  if (table === 'weekly_modifications') rows = rows.map(row => ({...row,source_slot:join(t.schedule_slots.find(s => s.id === row.source_slot_id)),target_room:t.rooms.find(r => r.id === row.target_room_id) || null}));
  for (const key of ['batch_id','week_start']) if (url.searchParams.has(key)) rows = rows.filter(row => row[key] === url.searchParams.get(key));
  const order = {teachers:'short_name',rooms:'name',courses:'code',holidays:'date'}[table];
  if (order) rows.sort((a,b) => String(a[order]).localeCompare(String(b[order])));
  return id ? rows.find(row => row.id === id) : rows;
}
export async function dataFetch(url: string, options?: RequestInit): Promise<Response> {
  if (options?.method && options.method !== 'GET') return fetch(url,options);
  try { return new Response(JSON.stringify(await publicRead(url)),{status:200,headers:{'Content-Type':'application/json'}}); }
  catch (error) { return new Response(JSON.stringify({error:error instanceof Error ? error.message : 'Unable to load data'}),{status:503}); }
}
