-- Drop overly permissive "Allow all for service role" policies (they used USING (true) for all roles)
DROP POLICY IF EXISTS "Allow all for service role" ON public.batches;
DROP POLICY IF EXISTS "Allow all for service role" ON public.courses;
DROP POLICY IF EXISTS "Allow all for service role" ON public.holidays;
DROP POLICY IF EXISTS "Allow all for service role" ON public.rooms;
DROP POLICY IF EXISTS "Allow all for service role" ON public.schedule_slots;
DROP POLICY IF EXISTS "Allow all for service role" ON public.teachers;

-- Revoke access to admin tables from anon/authenticated so they don't appear in the GraphQL schema.
-- Edge functions use the service_role key, which bypasses these grants.
REVOKE ALL ON public.admin_users FROM anon, authenticated;
REVOKE ALL ON public.admin_sessions FROM anon, authenticated;