/*
  # Fix RLS Policies for Delete Operations
  
  1. Changes
    - Remove incorrect FOR ALL policies
    - Add separate SELECT, INSERT, UPDATE, and DELETE policies for service role
    - DELETE operations require only USING clause (not WITH CHECK)
  
  2. Security
    - Service role can perform all CRUD operations
    - Each operation type has proper policy structure
    - Fixes the issue where DELETE was failing
*/

-- Drop the broken FOR ALL policies
DROP POLICY IF EXISTS "Service role full access to teachers" ON public.teachers;
DROP POLICY IF EXISTS "Service role full access to rooms" ON public.rooms;
DROP POLICY IF EXISTS "Service role full access to courses" ON public.courses;
DROP POLICY IF EXISTS "Service role full access to batches" ON public.batches;
DROP POLICY IF EXISTS "Service role full access to schedule_slots" ON public.schedule_slots;
DROP POLICY IF EXISTS "Service role full access to admin_users" ON public.admin_users;

-- Teachers policies
CREATE POLICY "Teachers - select all"
  ON public.teachers FOR SELECT
  USING (true);

CREATE POLICY "Teachers - insert for service role"
  ON public.teachers FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Teachers - update for service role"
  ON public.teachers FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Teachers - delete for service role"
  ON public.teachers FOR DELETE
  TO service_role
  USING (true);

-- Rooms policies
CREATE POLICY "Rooms - select all"
  ON public.rooms FOR SELECT
  USING (true);

CREATE POLICY "Rooms - insert for service role"
  ON public.rooms FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Rooms - update for service role"
  ON public.rooms FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Rooms - delete for service role"
  ON public.rooms FOR DELETE
  TO service_role
  USING (true);

-- Courses policies
CREATE POLICY "Courses - select all"
  ON public.courses FOR SELECT
  USING (true);

CREATE POLICY "Courses - insert for service role"
  ON public.courses FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Courses - update for service role"
  ON public.courses FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Courses - delete for service role"
  ON public.courses FOR DELETE
  TO service_role
  USING (true);

-- Batches policies
CREATE POLICY "Batches - select active"
  ON public.batches FOR SELECT
  USING (is_active = true);

CREATE POLICY "Batches - insert for service role"
  ON public.batches FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Batches - update for service role"
  ON public.batches FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Batches - delete for service role"
  ON public.batches FOR DELETE
  TO service_role
  USING (true);

-- Schedule Slots policies
CREATE POLICY "Schedule slots - select all"
  ON public.schedule_slots FOR SELECT
  USING (true);

CREATE POLICY "Schedule slots - insert for service role"
  ON public.schedule_slots FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Schedule slots - update for service role"
  ON public.schedule_slots FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Schedule slots - delete for service role"
  ON public.schedule_slots FOR DELETE
  TO service_role
  USING (true);

-- Admin Users policies
CREATE POLICY "Admin users - insert for service role"
  ON public.admin_users FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Admin users - update for service role"
  ON public.admin_users FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin users - delete for service role"
  ON public.admin_users FOR DELETE
  TO service_role
  USING (true);