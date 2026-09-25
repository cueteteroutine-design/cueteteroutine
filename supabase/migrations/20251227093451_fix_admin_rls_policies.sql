/*
  # Fix Admin RLS Policies
  
  1. Changes
    - Add policies for service role to perform all operations on teachers, rooms, courses, batches, and schedule_slots
    - This ensures the admin edge function (using service role) can INSERT, UPDATE, and DELETE
  
  2. Security
    - Service role can perform all operations (used by admin edge function)
    - Public users can only SELECT (read-only access)
    - Admin authentication is handled by the edge function
*/

-- Drop existing restrictive policies if they interfere
-- (The service role should bypass RLS, but we'll add explicit policies for clarity)

-- Teachers: Allow service role all operations
CREATE POLICY "Service role full access to teachers"
  ON public.teachers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Rooms: Allow service role all operations  
CREATE POLICY "Service role full access to rooms"
  ON public.rooms
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Courses: Allow service role all operations
CREATE POLICY "Service role full access to courses"
  ON public.courses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Batches: Allow service role all operations
CREATE POLICY "Service role full access to batches"
  ON public.batches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Schedule Slots: Allow service role all operations
CREATE POLICY "Service role full access to schedule_slots"
  ON public.schedule_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin Users: Allow service role all operations
CREATE POLICY "Service role full access to admin_users"
  ON public.admin_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);