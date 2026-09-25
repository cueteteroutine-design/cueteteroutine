import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Simple password verification
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Compare SHA-256 hash. Hardcoded password bypass removed for security.
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hash === hashHex;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a cryptographically-secure random token
function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Authentication middleware: validates Bearer token against admin_sessions table
// and returns the authenticated admin (with role) or null.
type AuthedAdmin = { id: string; username: string; role: 'admin' | 'coadmin' };
async function getAuthedAdmin(req: Request, supabase: any): Promise<AuthedAdmin | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return null;
    const tokenHash = await hashToken(token);
    const { data, error } = await supabase
      .from('admin_sessions')
      .select('admin_id, expires_at, admin_users!inner(id, username, role)')
      .eq('token', tokenHash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error || !data) return null;
    const u = (data as any).admin_users;
    if (!u) return null;
    return { id: u.id, username: u.username, role: u.role };
  } catch {
    return null;
  }
}

async function getAssignedBatchIds(supabase: any, adminId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('admin_batch_assignments')
    .select('batch_id')
    .eq('admin_id', adminId);
  return new Set((data || []).map((r: any) => r.batch_id));
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Or better yet, temporarily disable auth for testing:
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const path = url.pathname.replace('/admin', '');
    const method = req.method;

    console.log(`Admin API: ${method} ${path}`);

    // Enforce authentication on all non-public endpoints.
    // Public: /login, and any GET request (read-only data the SPA shows to visitors).
    const isPublicEndpoint = path === '/login' || method === 'GET';
    let currentAdmin: AuthedAdmin | null = null;
    if (!isPublicEndpoint && method !== 'OPTIONS') {
      currentAdmin = await getAuthedAdmin(req, supabase);
      if (!currentAdmin) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
    } else if (method !== 'OPTIONS') {
      // Non-blocking: still parse if provided (used by /me and role-scoped GETs).
      currentAdmin = await getAuthedAdmin(req, supabase);
    }

    // Role helpers
    const requireMainAdmin = () => currentAdmin?.role === 'admin';
    const canWriteBatch = async (batchId: string): Promise<boolean> => {
      if (!currentAdmin) return false;
      if (currentAdmin.role === 'admin') return true;
      const ids = await getAssignedBatchIds(supabase, currentAdmin.id);
      return ids.has(batchId);
    };

    // LOGIN endpoint
    if (path === '/login' && method === 'POST') {
      const { username, password } = await req.json();
      
      if (!username || !password) {
        return new Response(
          JSON.stringify({ error: 'Username and password required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const { data: admin, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !admin) {
        console.log('Login failed: user not found', username);
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const isValid = await verifyPassword(password, admin.password_hash);
      
      if (!isValid) {
        console.log('Login failed: invalid password for', username);
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Generate a cryptographically-secure session token and persist its hash
      const token = generateSecureToken();
      const tokenHash = await hashToken(token);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: sessionError } = await supabase
        .from('admin_sessions')
        .insert({ admin_id: admin.id, token: tokenHash, expires_at: expiresAt });

      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Best-effort cleanup of expired sessions
      await supabase.from('admin_sessions').delete().lt('expires_at', new Date().toISOString());

      console.log('Login successful for', username);
      return new Response(
        JSON.stringify({ 
          success: true, 
          token,
          admin: { id: admin.id, username: admin.username, role: admin.role }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // CHANGE PASSWORD endpoint
    if (path === '/change-password' && method === 'POST') {
      const { username, currentPassword, newPassword } = await req.json();
      
      if (!username || !currentPassword || !newPassword) {
        return new Response(
          JSON.stringify({ error: 'All fields are required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Only the account owner (any role) can change their own password.
      // Admins can also reset any account via the /admins/:id endpoint (below).
      if (!currentAdmin || currentAdmin.username !== username) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      const { data: admin, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !admin) {
        return new Response(
          JSON.stringify({ error: 'Admin not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const isValid = await verifyPassword(currentPassword, admin.password_hash);
      
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: 'Current password is incorrect' }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const newHash = await hashPassword(newPassword);
      
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ 
          password_hash: newHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', admin.id);

      if (updateError) {
        console.error('Password update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update password' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('Password changed for', username);
      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // TEACHERS CRUD
    if (path === '/teachers' || path.startsWith('/teachers/')) {
      const pathParts = path.split('/').filter(p => p);
      const teacherId = pathParts[1];

      console.log('Teachers endpoint - method:', method, 'teacherId:', teacherId);

      if (method !== 'GET' && !requireMainAdmin()) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      if (method === 'GET') {
        if (teacherId) {
          const { data, error } = await supabase
            .from('teachers')
            .select('*')
            .eq('id', teacherId)
            .single();
          if (error) throw error;
          return new Response(
            JSON.stringify(data), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data, error } = await supabase
          .from('teachers')
          .select('*')
          .order('short_name');
        if (error) throw error;
        return new Response(
          JSON.stringify(data), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase
          .from('teachers')
          .insert(body)
          .select()
          .single();
        if (error) throw error;
        console.log('Teacher created:', data);
        return new Response(
          JSON.stringify(data), 
          { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (method === 'PUT' && teacherId) {
        const body = await req.json();
        console.log('Updating teacher:', teacherId, 'with:', body);
        const { data, error } = await supabase
          .from('teachers')
          .update({ ...body, updated_at: new Date().toISOString() })
          .eq('id', teacherId)
          .select()
          .single();
        if (error) {
          console.error('Teacher update error:', error);
          throw error;
        }
        console.log('Teacher updated:', data);
        return new Response(
          JSON.stringify(data), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'DELETE' && teacherId) {
        console.log('Deleting teacher:', teacherId);
        
        // Check if teacher is used in schedule slots
        const { data: scheduleSlots, error: checkError } = await supabase
          .from('schedule_slots')
          .select('id')
          .eq('teacher_id', teacherId)
          .limit(1);
        
        if (checkError) throw checkError;
        
        if (scheduleSlots && scheduleSlots.length > 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Cannot delete teacher. Teacher is assigned to schedule slots.' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        const { error } = await supabase
          .from('teachers')
          .delete()
          .eq('id', teacherId);
        if (error) {
          console.error('Teacher delete error:', error);
          throw error;
        }
        console.log('Teacher deleted:', teacherId);
        return new Response(
          JSON.stringify({ success: true }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ROOMS CRUD
    if (path === '/rooms' || path.startsWith('/rooms/')) {
      const pathParts = path.split('/').filter(p => p);
      const roomId = pathParts[1];

      if (method !== 'GET' && !requireMainAdmin()) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      console.log('Rooms endpoint - method:', method, 'roomId:', roomId);

      if (method === 'GET') {
        if (roomId) {
          const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', roomId)
            .single();
          if (error) throw error;
          return new Response(
            JSON.stringify(data), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .order('name');
        if (error) throw error;
        return new Response(
          JSON.stringify(data), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase
          .from('rooms')
          .insert(body)
          .select()
          .single();
        if (error) throw error;
        console.log('Room created:', data);
        return new Response(
          JSON.stringify(data), 
          { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (method === 'PUT' && roomId) {
        const body = await req.json();
        console.log('Updating room:', roomId, 'with:', body);
        const { data, error } = await supabase
          .from('rooms')
          .update({ ...body, updated_at: new Date().toISOString() })
          .eq('id', roomId)
          .select()
          .single();
        if (error) {
          console.error('Room update error:', error);
          throw error;
        }
        console.log('Room updated:', data);
        return new Response(
          JSON.stringify(data), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'DELETE' && roomId) {
        console.log('Deleting room:', roomId);
        
        // Check if room is used in schedule slots
        const { data: scheduleSlots, error: checkError } = await supabase
          .from('schedule_slots')
          .select('id')
          .eq('room_id', roomId)
          .limit(1);
        
        if (checkError) throw checkError;
        
        if (scheduleSlots && scheduleSlots.length > 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Cannot delete room. Room is assigned to schedule slots.' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        const { error } = await supabase
          .from('rooms')
          .delete()
          .eq('id', roomId);
        if (error) {
          console.error('Room delete error:', error);
          throw error;
        }
        console.log('Room deleted:', roomId);
        return new Response(
          JSON.stringify({ success: true }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // COURSES CRUD
    if (path === '/courses' || path.startsWith('/courses/')) {
      const pathParts = path.split('/').filter(p => p);
      const courseId = pathParts[1];

      if (method !== 'GET' && !requireMainAdmin()) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      console.log('Courses endpoint - method:', method, 'courseId:', courseId);

      if (method === 'GET') {
        if (courseId) {
          const { data, error } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();
          if (error) throw error;
          return new Response(
            JSON.stringify(data), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('code');
        if (error) throw error;
        return new Response(
          JSON.stringify(data), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'POST') {
        const body = await req.json();
        const { data, error } = await supabase
          .from('courses')
          .insert(body)
          .select()
          .single();
        if (error) throw error;
        console.log('Course created:', data);
        return new Response(
          JSON.stringify(data), 
          { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (method === 'PUT' && courseId) {
        const body = await req.json();
        console.log('Updating course:', courseId, 'with:', body);
        const { data, error } = await supabase
          .from('courses')
          .update({ ...body, updated_at: new Date().toISOString() })
          .eq('id', courseId)
          .select()
          .single();
        if (error) {
          console.error('Course update error:', error);
          throw error;
        }
        console.log('Course updated:', data);
        return new Response(
          JSON.stringify(data), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'DELETE' && courseId) {
        console.log('Deleting course:', courseId);
        
        // Check if course is used in schedule slots
        const { data: scheduleSlots, error: checkError } = await supabase
          .from('schedule_slots')
          .select('id')
          .eq('course_id', courseId)
          .limit(1);
        
        if (checkError) throw checkError;
        
        if (scheduleSlots && scheduleSlots.length > 0) {
          return new Response(
            JSON.stringify({ 
              error: 'Cannot delete course. Course is assigned to schedule slots.' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        const { error } = await supabase
          .from('courses')
          .delete()
          .eq('id', courseId);
        if (error) {
          console.error('Course delete error:', error);
          throw error;
        }
        console.log('Course deleted:', courseId);
        return new Response(
          JSON.stringify({ success: true }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

   // BATCHES CRUD section - FIXED
if (path === '/batches' || path.startsWith('/batches/')) {
  const pathParts = path.split('/').filter(p => p);
  const batchId = pathParts[1];

  console.log('Batches endpoint - method:', method, 'batchId:', batchId);

  // Write access (POST/PUT/DELETE) requires either main admin or, for a
  // specific batch, an assignment. POST also allowed for co-admins (they can
  // create their own batches — auto-assigned below).
  if (method !== 'GET' && !currentAdmin) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  if ((method === 'PUT' || method === 'DELETE') && batchId && currentAdmin) {
    const ok = await canWriteBatch(batchId);
    if (!ok) return jsonResponse({ error: 'Forbidden' }, 403);
  }

  if (method === 'GET') {
    if (batchId) {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single();
      if (error) {
        console.error('Get batch error:', error);
        return new Response(
          JSON.stringify({ error: 'Batch not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('level', { ascending: false })
      .order('term', { ascending: false })
      .order('name');
    
    if (error) {
      console.error('Get batches error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch batches' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // For signed-in co-admins, only return batches assigned to them.
    let list = data as any[];
    if (currentAdmin && currentAdmin.role === 'coadmin') {
      const ids = await getAssignedBatchIds(supabase, currentAdmin.id);
      list = list.filter((b) => ids.has(b.id));
    }
    return new Response(JSON.stringify(list), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (method === 'POST') {
    try {
      const body = await req.json();
      console.log('Creating batch with raw body:', body);
      
      // Validate required fields
      if (!body.name || !body.start_date) {
        return new Response(
          JSON.stringify({ error: 'Name and start date are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Co-admins are tied to a single cohort (batch name). They may only
      // create new semesters for that cohort.
      if (currentAdmin && currentAdmin.role === 'coadmin') {
        const { data: myAssignments } = await supabase
          .from('admin_batch_assignments')
          .select('batch_id')
          .eq('admin_id', currentAdmin.id);
        const myIds = (myAssignments || []).map((a: any) => a.batch_id);
        let allowedName: string | null = null;
        if (myIds.length) {
          const { data: myBatches } = await supabase
            .from('batches')
            .select('name')
            .in('id', myIds);
          allowedName = (myBatches || [])[0]?.name ?? null;
        }
        if (!allowedName || String(body.name).trim() !== allowedName) {
          return new Response(
            JSON.stringify({ error: 'You can only create routines for your assigned batch' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Prepare data for database - ensure vacant_weeks is a number
      const batchData = {
        name: String(body.name).trim(),
        level: parseInt(body.level) || 1,
        term: parseInt(body.term) || 1,
        total_weeks: parseInt(body.total_weeks) || 13,
        start_date: body.start_date,
        mid_break_start: body.mid_break_start || null,
        mid_break_end: body.mid_break_end || null,
        vacant_weeks: parseInt(body.vacant_weeks) || 0, // CRITICAL: Parse as integer
        is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
      };

      console.log('Inserting batch data (transformed):', batchData);

      const { data, error } = await supabase
        .from('batches')
        .insert(batchData)
        .select()
        .single();

      if (error) {
        console.error('Batch creation database error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create batch' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Auto-assign the new batch to the creating co-admin so they can edit it.
      if (currentAdmin && currentAdmin.role === 'coadmin' && data?.id) {
        await supabase
          .from('admin_batch_assignments')
          .insert({ admin_id: currentAdmin.id, batch_id: data.id });
      }

      // Auto-assign the new batch to every co-admin already assigned to
      // another batch that shares the same name (batches are grouped by name,
      // e.g. "Batch 19", regardless of level/term). This keeps co-admin
      // access tied to a student cohort, not a single semester row.
      try {
        if (data?.id && data?.name) {
          const { data: siblings } = await supabase
            .from('batches')
            .select('id')
            .eq('name', data.name)
            .neq('id', data.id);
          const siblingIds = (siblings || []).map((b: any) => b.id);
          if (siblingIds.length) {
            const { data: assignments } = await supabase
              .from('admin_batch_assignments')
              .select('admin_id')
              .in('batch_id', siblingIds);
            const adminIds = Array.from(new Set((assignments || []).map((a: any) => a.admin_id)));
            if (adminIds.length) {
              await supabase
                .from('admin_batch_assignments')
                .upsert(
                  adminIds.map((admin_id: string) => ({ admin_id, batch_id: data.id })),
                  { onConflict: 'admin_id,batch_id', ignoreDuplicates: true }
                );
            }
          }
        }
      } catch (e) {
        console.error('Auto-assign co-admins for new batch failed:', e);
      }

      console.log('Batch created successfully:', data);
      return new Response(
        JSON.stringify(data), 
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      console.error('Batch creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  if (method === 'PUT' && batchId) {
    try {
      const body = await req.json();
      console.log('Updating batch:', batchId, 'with raw body:', body);
      
      // Check if batch exists
      const { data: existingBatch, error: checkError } = await supabase
        .from('batches')
        .select('id')
        .eq('id', batchId)
        .single();
        
      if (checkError) {
        return new Response(
          JSON.stringify({ error: 'Batch not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Prepare update data - only include fields that are present
      const updateData: any = { updated_at: new Date().toISOString() };
      
      if (body.name !== undefined) updateData.name = String(body.name).trim();
      if (body.level !== undefined) updateData.level = parseInt(body.level);
      if (body.term !== undefined) updateData.term = parseInt(body.term);
      if (body.total_weeks !== undefined) updateData.total_weeks = parseInt(body.total_weeks);
      if (body.start_date !== undefined) updateData.start_date = body.start_date;
      if (body.mid_break_start !== undefined) updateData.mid_break_start = body.mid_break_start || null;
      if (body.mid_break_end !== undefined) updateData.mid_break_end = body.mid_break_end || null;
      if (body.vacant_weeks !== undefined) updateData.vacant_weeks = parseInt(body.vacant_weeks) || 0; // CRITICAL
      if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active);

      console.log('Updating batch with transformed data:', updateData);

      const { data, error } = await supabase
        .from('batches')
        .update(updateData)
        .eq('id', batchId)
        .select()
        .single();

      if (error) {
        console.error('Batch update database error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update batch' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Batch updated successfully:', data);
      return new Response(
        JSON.stringify(data), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Batch update error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  if (method === 'DELETE' && batchId) {
    try {
      console.log('Deleting batch:', batchId);
      
      // Check if batch exists
      const { data: existingBatch, error: checkError } = await supabase
        .from('batches')
        .select('id')
        .eq('id', batchId)
        .single();
        
      if (checkError) {
        return new Response(
          JSON.stringify({ error: 'Batch not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // First delete related schedule slots
      const { error: slotsError } = await supabase
        .from('schedule_slots')
        .delete()
        .eq('batch_id', batchId);
        
      if (slotsError) {
        console.error('Batch slots delete error:', slotsError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete related schedule slots' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Delete the batch
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId);
        
      if (error) {
        console.error('Batch delete error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to delete batch' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Batch deleted successfully:', batchId);
      return new Response(
        JSON.stringify({ success: true }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error('Batch deletion error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process request';
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
}
    // SCHEDULE SLOTS CRUD
    if (path === '/schedule-slots' || path.startsWith('/schedule-slots/')) {
      const pathParts = path.split('/').filter(p => p);
      const slotId = pathParts[1];

      console.log('Schedule slots endpoint - method:', method, 'slotId:', slotId);

      if (method === 'GET') {
        const batchId = url.searchParams.get('batch_id');
        
        if (slotId) {
          const { data, error } = await supabase
            .from('schedule_slots')
            .select('*, courses(*), teachers(*), rooms(*)')
            .eq('id', slotId)
            .single();
          if (error) throw error;
          return new Response(
            JSON.stringify(data), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        let query = supabase
          .from('schedule_slots')
          .select('*, courses(*), teachers(*), rooms(*)');
        
        if (batchId) {
          query = query.eq('batch_id', batchId);
        }
        
        const { data, error } = await query
          .order('day')
          .order('slot_index');
        
        if (error) throw error;
        return new Response(
          JSON.stringify(data), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'POST') {
        const body = await req.json();
        if (body?.batch_id && !(await canWriteBatch(body.batch_id))) {
          return jsonResponse({ error: 'Forbidden' }, 403);
        }
        const { data, error } = await supabase
          .from('schedule_slots')
          .insert(body)
          .select('*, courses(*), teachers(*), rooms(*)')
          .single();
        if (error) throw error;
        console.log('Schedule slot created:', data);
        return new Response(
          JSON.stringify(data), 
          { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (method === 'PUT' && slotId) {
        const body = await req.json();
        // Look up the slot's batch to check access.
        const { data: existingSlot } = await supabase
          .from('schedule_slots').select('batch_id').eq('id', slotId).maybeSingle();
        if (existingSlot && !(await canWriteBatch(existingSlot.batch_id))) {
          return jsonResponse({ error: 'Forbidden' }, 403);
        }
        console.log('Updating schedule slot:', slotId, 'with:', body);
        const { data, error } = await supabase
          .from('schedule_slots')
          .update({ ...body, updated_at: new Date().toISOString() })
          .eq('id', slotId)
          .select('*, courses(*), teachers(*), rooms(*)')
          .single();
        if (error) {
          console.error('Schedule slot update error:', error);
          throw error;
        }
        console.log('Schedule slot updated:', data);
        return new Response(
          JSON.stringify(data), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'DELETE' && slotId) {
        const { data: existingSlot } = await supabase
          .from('schedule_slots').select('batch_id').eq('id', slotId).maybeSingle();
        if (existingSlot && !(await canWriteBatch(existingSlot.batch_id))) {
          return jsonResponse({ error: 'Forbidden' }, 403);
        }
        console.log('Deleting schedule slot:', slotId);
        const { error } = await supabase
          .from('schedule_slots')
          .delete()
          .eq('id', slotId);
        if (error) {
          console.error('Schedule slot delete error:', error);
          throw error;
        }
        console.log('Schedule slot deleted:', slotId);
        return new Response(
          JSON.stringify({ success: true }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // UPSERT slot (for creating or updating by batch/day/slot_index/slot_position)
    if (path === '/upsert-slot' && method === 'POST') {
      const body = await req.json();
      const { batch_id, day, slot_index, slot_position = 0, course_id, teacher_id, room_id, group_name } = body;

      console.log('Upsert slot request:', { batch_id, day, slot_index, slot_position, course_id, teacher_id, room_id, group_name });

      if (!batch_id || !day || slot_index === undefined) {
        return new Response(
          JSON.stringify({ error: 'batch_id, day, and slot_index are required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      if (!(await canWriteBatch(batch_id))) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      // Check if slot exists (now includes slot_position)
      const { data: existing, error: checkError } = await supabase
        .from('schedule_slots')
        .select('id, slot_position')
        .eq('batch_id', batch_id)
        .eq('day', day)
        .eq('slot_index', slot_index)
        .eq('slot_position', slot_position)
        .maybeSingle();

      console.log('Check existing slot result:', { existing, checkError, queriedSlotPosition: slot_position });

      if (existing) {
        console.log('Found existing slot, updating:', existing.id);
        // Update existing
        if (course_id === null && teacher_id === null && room_id === null) {
          // Delete the slot
          const { error } = await supabase
            .from('schedule_slots')
            .delete()
            .eq('id', existing.id);
          if (error) throw error;
          return new Response(
            JSON.stringify({ success: true, deleted: true }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const { data, error } = await supabase
          .from('schedule_slots')
          .update({ 
            course_id, 
            teacher_id, 
            room_id,
            group_name: group_name || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select('*, courses(*), teachers(*), rooms(*)')
          .single();
        if (error) throw error;
        console.log('Slot updated:', data);
        return new Response(
          JSON.stringify(data), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('No existing slot found, creating new with slot_position:', slot_position);
        // Create new
        if (course_id === null && teacher_id === null && room_id === null) {
          return new Response(
            JSON.stringify({ success: true, skipped: true }), 
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const insertData = { 
          batch_id, 
          day, 
          slot_index, 
          slot_position, 
          course_id, 
          teacher_id, 
          room_id, 
          group_name: group_name || null 
        };
        console.log('Inserting new slot:', insertData);
        
        const { data, error } = await supabase
          .from('schedule_slots')
          .insert(insertData)
          .select('*, courses(*), teachers(*), rooms(*)')
          .single();
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        console.log('Slot created:', data);
        return new Response(
          JSON.stringify(data), 
          { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // FETCH ONLINE HOLIDAYS (Bangladesh national/public holidays)
    // Window: previous 6 months -> next 12 months. Replaces only fetched holidays,
    // never touches admin-created (manual) ones, and skips any entry the admin has
    // previously dismissed (stored in dismissed_holidays).
    if (path === '/holidays-fetch-online' && method === 'POST') {
      if (!requireMainAdmin()) return jsonResponse({ error: 'Forbidden' }, 403);
      console.log('Fetching Bangladesh national holidays from Google Calendar');

      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 13, 0);
        const timeMin = start.toISOString();
        const timeMax = end.toISOString();
        const startDateStr = start.toISOString().split('T')[0];
        const endDateStr = end.toISOString().split('T')[0];

        const calendarId = 'en.bd%23holiday%40group.v.calendar.google.com';
        const apiKey = 'AIzaSyBNlYH01_9Hc5S1J9vuFmu2nUqBZJNAXxs';
        const gcalUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=2500&key=${apiKey}`;

        const res = await fetch(gcalUrl);
        const text = await res.text();
        if (!res.ok) {
          console.error('Google Calendar API error:', text.substring(0, 500));
          throw new Error(`Google Calendar API returned ${res.status}`);
        }
        const data = JSON.parse(text);
        const items: { summary: string; description?: string; start: { date?: string; dateTime?: string } }[] = data.items || [];

        // Bangladesh "en.bd#holiday" calendar tags each event in `description`.
        // Public/national holidays say "Public holiday". Observances ("Observance",
        // "Hindu", "Christian", "Muslim", "Season", etc.) are NOT public holidays
        // unless they're also marked Public holiday. We keep only "Public holiday".
        const nationalHolidays = items.filter(item => {
          const desc = (item.description || '').toLowerCase();
          return desc.includes('public holiday');
        });

        // Load dismissed (date,title) pairs to skip
        const { data: dismissed } = await supabase
          .from('dismissed_holidays')
          .select('date, title');
        const dismissedSet = new Set(
          (dismissed || []).map((d: any) => `${d.date}|${d.title}`)
        );

        // Wipe previously-fetched holidays in the window. Manual entries untouched.
        const { error: deleteError } = await supabase
          .from('holidays')
          .delete()
          .eq('source', 'fetched')
          .gte('date', startDateStr)
          .lte('date', endDateStr);
        if (deleteError) throw deleteError;

        // Load existing manual entries in window so we don't duplicate same (date,title)
        const { data: existingManual } = await supabase
          .from('holidays')
          .select('date, title')
          .eq('source', 'manual')
          .gte('date', startDateStr)
          .lte('date', endDateStr);
        const manualSet = new Set(
          (existingManual || []).map((h: any) => `${h.date}|${h.title}`)
        );

        const toInsert = nationalHolidays
          .map(item => {
            const date = item.start.date || (item.start.dateTime ? item.start.dateTime.split('T')[0] : '');
            return { date, title: item.summary, is_national: true, source: 'fetched' };
          })
          .filter(h => {
            if (!h.date) return false;
            const key = `${h.date}|${h.title}`;
            if (dismissedSet.has(key)) return false;
            if (manualSet.has(key)) return false;
            return true;
          });

        if (toInsert.length > 0) {
          const { error: insertError } = await supabase.from('holidays').insert(toInsert);
          if (insertError) throw insertError;
        }

        return new Response(
          JSON.stringify({
            added: toInsert.length,
            window: { from: startDateStr, to: endDateStr },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (fetchErr) {
        console.error('Online holiday fetch error:', fetchErr);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch holidays from online source' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // HOLIDAYS CRUD
    if (path === '/holidays' || path.startsWith('/holidays/')) {
      const pathParts = path.split('/').filter(p => p);
      const holidayId = pathParts[1];

      console.log('Holidays endpoint - method:', method, 'holidayId:', holidayId);

      if (method !== 'GET' && !requireMainAdmin()) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }

      if (method === 'GET') {
        if (holidayId) {
          const { data, error } = await supabase
            .from('holidays')
            .select('*')
            .eq('id', holidayId)
            .single();
          if (error) throw error;
          return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('holidays')
          .select('*')
          .order('date');
        if (error) throw error;
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'POST') {
        const body = await req.json();
        
        // Support bulk insert for date ranges
        if (Array.isArray(body)) {
          const { data, error } = await supabase
            .from('holidays')
            .insert(body)
            .select();
          if (error) throw error;
          return new Response(
            JSON.stringify(data),
            { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('holidays')
          .insert(body)
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify(data),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'PUT' && holidayId) {
        const body = await req.json();
        const { data, error } = await supabase
          .from('holidays')
          .update({ ...body, updated_at: new Date().toISOString() })
          .eq('id', holidayId)
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'DELETE' && holidayId) {
        // Look up the holiday first; if it was fetched (national), remember the
        // dismissal so the next online sync won't re-add it.
        const { data: existing } = await supabase
          .from('holidays')
          .select('date, title, source')
          .eq('id', holidayId)
          .maybeSingle();

        if (existing && existing.source === 'fetched') {
          await supabase
            .from('dismissed_holidays')
            .upsert(
              { date: existing.date, title: existing.title },
              { onConflict: 'date,title' }
            );
        }

        const { error } = await supabase
          .from('holidays')
          .delete()
          .eq('id', holidayId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // HEALTH CHECK endpoint
    if (path === '/health' && method === 'GET') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          service: 'admin-api'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DISPLAY SETTINGS (public choice; only the main admin may change it)
    if (path === '/display-settings') {
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('display_settings')
          .select('theme')
          .eq('id', 1)
          .maybeSingle();
        if (error) throw error;
        return jsonResponse({ theme: data?.theme ?? 'classic' });
      }
      if (method === 'PUT') {
        if (!requireMainAdmin()) return jsonResponse({ error: 'Forbidden' }, 403);
        const body = await req.json();
        if (!['classic', 'pulse', 'broadcast'].includes(body?.theme)) {
          return jsonResponse({ error: 'Invalid display theme' }, 400);
        }
        const { data, error } = await supabase
          .from('display_settings')
          .update({ theme: body.theme })
          .eq('id', 1)
          .select('theme')
          .single();
        if (error) throw error;
        return jsonResponse(data);
      }
    }

    // TIME SETTINGS (singleton row)
    if (path === '/time-settings') {
      if (method !== 'GET' && !requireMainAdmin()) {
        return jsonResponse({ error: 'Forbidden' }, 403);
      }
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('time_settings')
          .select('use_custom, custom_slots')
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return new Response(
          JSON.stringify(data ?? { use_custom: false, custom_slots: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'PUT') {
        const body = await req.json();
        const use_custom = !!body.use_custom;
        const custom_slots = Array.isArray(body.custom_slots) ? body.custom_slots : [];

        // Basic validation of slot shapes
        for (const s of custom_slots) {
          if (
            typeof s !== 'object' || s === null ||
            typeof s.index !== 'number' ||
            typeof s.start !== 'string' ||
            typeof s.end !== 'string'
          ) {
            return new Response(
              JSON.stringify({ error: 'Invalid slot format' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        const { data: existing } = await supabase
          .from('time_settings')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          const { data, error } = await supabase
            .from('time_settings')
            .update({ use_custom, custom_slots, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select('use_custom, custom_slots')
            .single();
          if (error) throw error;
          return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('time_settings')
          .insert({ use_custom, custom_slots })
          .select('use_custom, custom_slots')
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // WEEKLY MODIFICATIONS (per-batch cancel / reschedule for a specific week)
    if (path === '/weekly-modifications' || path.startsWith('/weekly-modifications/')) {
      const parts = path.split('/').filter(Boolean);
      const modId = parts[1];

      if (method === 'GET') {
        const batchId = url.searchParams.get('batch_id');
        const weekStart = url.searchParams.get('week_start');
        let q = supabase
          .from('weekly_modifications')
          .select('*, source_slot:source_slot_id(*, courses(*), teachers(*), rooms(*)), target_room:target_room_id(*)');
        if (batchId) q = q.eq('batch_id', batchId);
        if (weekStart) q = q.eq('week_start', weekStart);
        const { data, error } = await q.order('created_at');
        if (error) throw error;
        return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (method === 'POST') {
        const body = await req.json();
        if (body?.batch_id && !(await canWriteBatch(body.batch_id))) {
          return jsonResponse({ error: 'Forbidden' }, 403);
        }
        const { data, error } = await supabase
          .from('weekly_modifications')
          .insert(body)
          .select('*, source_slot:source_slot_id(*, courses(*), teachers(*), rooms(*)), target_room:target_room_id(*)')
          .single();
        if (error) throw error;
        return new Response(JSON.stringify(data), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (method === 'DELETE' && modId) {
        const { data: existingMod } = await supabase
          .from('weekly_modifications').select('batch_id').eq('id', modId).maybeSingle();
        if (existingMod && !(await canWriteBatch(existingMod.batch_id))) {
          return jsonResponse({ error: 'Forbidden' }, 403);
        }
        const { error } = await supabase.from('weekly_modifications').delete().eq('id', modId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // ME: return the currently authenticated admin plus assigned batch IDs.
    if (path === '/me' && method === 'GET') {
      if (!currentAdmin) return jsonResponse({ error: 'Unauthorized' }, 401);
      let batch_ids: string[] = [];
      if (currentAdmin.role === 'coadmin') {
        const ids = await getAssignedBatchIds(supabase, currentAdmin.id);
        batch_ids = Array.from(ids);
      }
      return jsonResponse({ ...currentAdmin, batch_ids });
    }

    // ADMINS (co-admin management). Main admin only.
    if (path === '/admins' || path.startsWith('/admins/')) {
      if (!requireMainAdmin()) return jsonResponse({ error: 'Forbidden' }, 403);
      const parts = path.split('/').filter(Boolean);
      const adminId = parts[1];
      const sub = parts[2]; // e.g. "batches", "password"

      if (method === 'GET' && !adminId) {
        // List co-admins (exclude main admins) with their batch assignments.
        const { data: admins, error } = await supabase
          .from('admin_users')
          .select('id, username, role, created_at')
          .eq('role', 'coadmin')
          .order('username');
        if (error) throw error;
        const { data: assigns } = await supabase
          .from('admin_batch_assignments')
          .select('admin_id, batch_id');
        const map: Record<string, string[]> = {};
        for (const a of assigns || []) {
          (map[a.admin_id] ||= []).push(a.batch_id);
        }
        return jsonResponse(
          (admins || []).map((a: any) => ({ ...a, batch_ids: map[a.id] || [] }))
        );
      }

      if (method === 'POST' && !adminId) {
        // Create co-admin { username, password, batch_ids? }
        const { username, password, batch_ids } = await req.json();
        if (!username || !password) {
          return jsonResponse({ error: 'username and password required' }, 400);
        }
        const password_hash = await hashPassword(String(password));
        const { data: created, error } = await supabase
          .from('admin_users')
          .insert({ username: String(username).trim(), password_hash, role: 'coadmin' })
          .select('id, username, role, created_at')
          .single();
        if (error) {
          return jsonResponse({ error: error.message || 'Failed to create admin' }, 400);
        }
        if (Array.isArray(batch_ids) && batch_ids.length) {
          await supabase
            .from('admin_batch_assignments')
            .insert(batch_ids.map((bid: string) => ({ admin_id: created.id, batch_id: bid })));
        }
        return jsonResponse({ ...created, batch_ids: batch_ids || [] }, 201);
      }

      if (method === 'PUT' && adminId && sub === 'batches') {
        // Replace batch assignments: { batch_ids: string[] }
        const { batch_ids } = await req.json();
        if (!Array.isArray(batch_ids)) {
          return jsonResponse({ error: 'batch_ids must be an array' }, 400);
        }
        await supabase.from('admin_batch_assignments').delete().eq('admin_id', adminId);
        if (batch_ids.length) {
          const { error: insErr } = await supabase
            .from('admin_batch_assignments')
            .insert(batch_ids.map((bid: string) => ({ admin_id: adminId, batch_id: bid })));
          if (insErr) return jsonResponse({ error: insErr.message }, 400);
        }
        return jsonResponse({ success: true, batch_ids });
      }

      if (method === 'PUT' && adminId && sub === 'password') {
        // Admin-reset a co-admin password: { newPassword }
        const { newPassword } = await req.json();
        if (!newPassword || String(newPassword).length < 6) {
          return jsonResponse({ error: 'Password must be at least 6 characters' }, 400);
        }
        const password_hash = await hashPassword(String(newPassword));
        const { error } = await supabase
          .from('admin_users')
          .update({ password_hash, updated_at: new Date().toISOString() })
          .eq('id', adminId)
          .eq('role', 'coadmin');
        if (error) return jsonResponse({ error: error.message }, 400);
        // Invalidate existing sessions for this co-admin.
        await supabase.from('admin_sessions').delete().eq('admin_id', adminId);
        return jsonResponse({ success: true });
      }

      if (method === 'DELETE' && adminId && !sub) {
        // Prevent deleting the last main admin (defensive; UI only lists coadmins).
        const { data: target } = await supabase
          .from('admin_users').select('id, role').eq('id', adminId).maybeSingle();
        if (!target) return jsonResponse({ error: 'Not found' }, 404);
        if (target.role === 'admin') return jsonResponse({ error: 'Cannot delete a main admin' }, 400);
        const { error } = await supabase.from('admin_users').delete().eq('id', adminId);
        if (error) return jsonResponse({ error: error.message }, 400);
        return jsonResponse({ success: true });
      }
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Admin API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
