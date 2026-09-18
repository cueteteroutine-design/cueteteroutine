import { publicRead, loadData, acceptSnapshot } from './jsonData';
const ADMIN_API_URL = '/api/admin';

interface AdminSession {
  token: string;
  admin: {
    id: string;
    username: string;
    role: 'admin' | 'coadmin';
  };
}

// Session management
export function getAdminSession(): AdminSession | null {
  const stored = sessionStorage.getItem('admin_session');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setAdminSession(session: AdminSession): void {
  sessionStorage.setItem('admin_session', JSON.stringify(session));
}

export function clearAdminSession(): void {
  sessionStorage.removeItem('admin_session');
}

export function isAdminLoggedIn(): boolean {
  return getAdminSession() !== null;
}

// API calls
let editorRevision: string | undefined;
async function apiCall<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  if (method === 'GET' && !['/me','/admins','/health'].includes(path)) {
    const value = await publicRead(path);
    editorRevision = (await loadData()).revision;
    return value;
  }
  const session = getAdminSession();
  const headers: Record<string,string> = {'Content-Type':'application/json'};
  if (session?.token) headers.Authorization = 'Bearer ' + session.token;
  if (method !== 'GET' && path !== '/login') headers['If-Match'] = editorRevision || (await loadData()).revision;
  const response = await fetch(ADMIN_API_URL + path,{...options,headers});
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') { clearAdminSession(); window.location.href = '/admin'; }
    throw new Error(data.error || 'Request failed.');
  }
  if (data.revision && data.tables) {
    editorRevision = data.revision;
    acceptSnapshot(data);
    if (data.result?.token && session) setAdminSession({...session,token:data.result.token});
    return data.result;
  }
  return data;
}

// Auth
export async function adminLogin(username: string, password: string): Promise<AdminSession> {
  const result = await apiCall<{ success?: boolean; error?: string; token?: string; admin?: { id: string; username: string; role: 'admin' | 'coadmin' } }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

  // The edge function returns status 200 with error field for invalid credentials
  if (result.error || !result.success) {
    throw new Error(result.error || 'Invalid credentials');
  }

  const session = { token: result.token!, admin: result.admin! };
  setAdminSession(session);
  return session;
}

export async function changePassword(username: string, currentPassword: string, newPassword: string): Promise<void> {
  const result = await apiCall<{ success?: boolean; error?: string }>('/change-password', {
    method: 'POST',
    body: JSON.stringify({ username, currentPassword, newPassword }),
  });
  
  // The edge function returns status 200 with error field for invalid password
  if (result.error) {
    throw new Error(result.error);
  }
}

export function adminLogout(): void {
  clearAdminSession();
  window.location.href = '/admin';
}

// Teachers
export interface Teacher {
  id: string;
  short_name: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export async function getTeachers(): Promise<Teacher[]> {
  return apiCall('/teachers');
}

export async function createTeacher(data: { short_name: string; full_name: string }): Promise<Teacher> {
  return apiCall('/teachers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTeacher(id: string, data: { short_name?: string; full_name?: string }): Promise<Teacher> {
  return apiCall(`/teachers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTeacher(id: string): Promise<void> {
  await apiCall(`/teachers/${id}`, { method: 'DELETE' });
}

// Rooms
export interface Room {
  id: string;
  name: string;
  building: string | null;
  created_at: string;
  updated_at: string;
}

export async function getRooms(): Promise<Room[]> {
  return apiCall('/rooms');
}

export async function createRoom(data: { name: string; building?: string }): Promise<Room> {
  return apiCall('/rooms', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRoom(id: string, data: { name?: string; building?: string }): Promise<Room> {
  return apiCall(`/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRoom(id: string): Promise<void> {
  await apiCall(`/rooms/${id}`, { method: 'DELETE' });
}

// Courses
export interface Course {
  id: string;
  code: string;
  name: string;
  type: 'theory' | 'sessional';
  color: string;
  credit: number;
  level: number | null;
  term: number | null;
  created_at: string;
  updated_at: string;
}

export async function getCourses(): Promise<Course[]> {
  return apiCall('/courses');
}

export async function createCourse(data: { code: string; name: string; type: 'theory' | 'sessional'; color: string; credit?: number; level?: number | null; term?: number | null }): Promise<Course> {
  return apiCall('/courses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCourse(id: string, data: Partial<Course>): Promise<Course> {
  return apiCall(`/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCourse(id: string): Promise<void> {
  await apiCall(`/courses/${id}`, { method: 'DELETE' });
}

// Batches - FIXED: Uses vacant_weeks as number (matches your database)
export interface Batch {
  id: string;
  name: string;
  level: number;
  term: number;
  total_weeks: number;
  start_date: string;
  mid_break_start: string | null;
  mid_break_end: string | null;
  vacant_weeks: number; // FIXED: Changed from date fields to number
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getBatches(): Promise<Batch[]> {
  return apiCall('/batches');
}

export async function getBatch(id: string): Promise<Batch> {
  return apiCall(`/batches/${id}`);
}

export async function createBatch(data: Omit<Batch, 'id' | 'created_at' | 'updated_at'>): Promise<Batch> {
  return apiCall('/batches', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBatch(id: string, data: Partial<Omit<Batch, 'id' | 'created_at' | 'updated_at'>>): Promise<Batch> {
  return apiCall(`/batches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBatch(id: string): Promise<void> {
  await apiCall(`/batches/${id}`, { method: 'DELETE' });
}

// Schedule Slots
export interface ScheduleSlot {
  id: string;
  batch_id: string;
  day: string;
  slot_index: number;
  slot_position: number; // 0 = first/only slot, 1 = second slot
  course_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
  group_name: string | null;
  courses: Course | null;
  teachers: Teacher | null;
  rooms: Room | null;
  created_at: string;
  updated_at: string;
}

export async function getScheduleSlots(batchId?: string): Promise<ScheduleSlot[]> {
  const query = batchId ? `?batch_id=${batchId}` : '';
  return apiCall(`/schedule-slots${query}`);
}

export async function upsertSlot(data: {
  batch_id: string;
  day: string;
  slot_index: number;
  slot_position?: number; // 0 or 1
  course_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
  group_name?: string | null;
}): Promise<ScheduleSlot | { success: boolean }> {
  return apiCall('/upsert-slot', {
    method: 'POST',
    body: JSON.stringify({ ...data, slot_position: data.slot_position ?? 0 }),
  });
}

export async function deleteScheduleSlot(id: string): Promise<void> {
  await apiCall(`/schedule-slots/${id}`, { method: 'DELETE' });
}

// Holidays
export interface Holiday {
  id: string;
  date: string;
  title: string;
  is_national: boolean;
  created_at: string;
  updated_at: string;
}

export async function getHolidays(): Promise<Holiday[]> {
  return apiCall('/holidays');
}

export async function createHoliday(data: { date: string; title: string; is_national: boolean }): Promise<Holiday> {
  return apiCall('/holidays', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createHolidaysBulk(data: { date: string; title: string; is_national: boolean }[]): Promise<Holiday[]> {
  return apiCall('/holidays', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateHoliday(id: string, data: Partial<Holiday>): Promise<Holiday> {
  return apiCall(`/holidays/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteHoliday(id: string): Promise<void> {
  await apiCall(`/holidays/${id}`, { method: 'DELETE' });
}

export async function fetchOnlineHolidays(): Promise<{ added: number; window: { from: string; to: string } }> {
  return apiCall('/holidays-fetch-online', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// Time settings
export interface TimeSlotEntry {
  index: number;
  start: string;
  end: string;
  isBreak?: boolean;
}

export interface TimeSettings {
  use_custom: boolean;
  custom_slots: TimeSlotEntry[];
}

export async function getTimeSettings(): Promise<TimeSettings> {
  return apiCall('/time-settings');
}

export async function updateTimeSettings(data: TimeSettings): Promise<TimeSettings> {
  return apiCall('/time-settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// Weekly modifications
export interface WeeklyModificationRow {
  id: string;
  batch_id: string;
  week_start: string;
  action: 'cancel' | 'reschedule';
  source_day: string;
  source_slot_index: number;
  source_slot_position: number;
  source_slot_id: string | null;
  target_day: string | null;
  target_slot_index: number | null;
  target_slot_position: number | null;
  target_room_id: string | null;
  source_slot?: any;
  target_room?: { name: string } | null;
}

export async function getWeeklyMods(batchId: string, weekStart: string): Promise<WeeklyModificationRow[]> {
  return apiCall(`/weekly-modifications?batch_id=${batchId}&week_start=${weekStart}`);
}

export async function createWeeklyMod(data: Omit<WeeklyModificationRow, 'id' | 'source_slot' | 'target_room'>): Promise<WeeklyModificationRow> {
  return apiCall('/weekly-modifications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteWeeklyMod(id: string): Promise<void> {
  await apiCall(`/weekly-modifications/${id}`, { method: 'DELETE' });
}

// Current signed-in admin
export interface MeResponse {
  id: string;
  username: string;
  role: 'admin' | 'coadmin';
  batch_ids: string[];
}

export async function getMe(): Promise<MeResponse> {
  return apiCall<MeResponse>('/me');
}

// Co-admin management (main admin only)
export interface CoAdmin {
  id: string;
  username: string;
  role: 'coadmin';
  created_at: string;
  batch_ids: string[];
}

export async function getCoAdmins(): Promise<CoAdmin[]> {
  return apiCall<CoAdmin[]>('/admins');
}

export async function createCoAdmin(data: { username: string; password: string; batch_ids: string[] }): Promise<CoAdmin> {
  return apiCall<CoAdmin>('/admins', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCoAdminBatches(id: string, batch_ids: string[]): Promise<void> {
  await apiCall(`/admins/${id}/batches`, { method: 'PUT', body: JSON.stringify({ batch_ids }) });
}

export async function resetCoAdminPassword(id: string, newPassword: string): Promise<void> {
  await apiCall(`/admins/${id}/password`, { method: 'PUT', body: JSON.stringify({ newPassword }) });
}

export async function deleteCoAdmin(id: string): Promise<void> {
  await apiCall(`/admins/${id}`, { method: 'DELETE' });
}

// Helper function for batch form data
export type BatchFormData = {
  name: string;
  level: number;
  term: number;
  total_weeks: number;
  start_date: string;
  mid_break_start: string;
  mid_break_end: string;
  vacant_weeks: number; // FIXED: Changed to number
  is_active: boolean;
};

export function transformBatchFormData(formData: BatchFormData): Omit<Batch, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: formData.name.trim(),
    level: formData.level,
    term: formData.term,
    total_weeks: formData.total_weeks,
    start_date: formData.start_date,
    mid_break_start: formData.mid_break_start || null,
    mid_break_end: formData.mid_break_end || null,
    vacant_weeks: formData.vacant_weeks, // FIXED: Use number directly
    is_active: formData.is_active,
  };
}
