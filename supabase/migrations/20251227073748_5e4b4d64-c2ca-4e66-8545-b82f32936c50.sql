-- Create enum for course types
CREATE TYPE public.course_type AS ENUM ('theory', 'sessional');

-- Create admin_users table for username/password auth
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create teachers table
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  building TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type course_type NOT NULL DEFAULT 'theory',
  color TEXT NOT NULL DEFAULT '217 91% 45%',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create batches/routines table
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  term INTEGER NOT NULL,
  total_weeks INTEGER NOT NULL DEFAULT 13,
  start_date DATE NOT NULL,
  mid_break_start DATE,
  mid_break_end DATE,
  vacant_week_start DATE,  -- ADDED: Vacant week start date
  vacant_week_end DATE,    -- ADDED: Vacant week end date
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create schedule_slots table
CREATE TABLE public.schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK (day IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday')),
  slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index <= 9),
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(batch_id, day, slot_index)
);

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;

-- Public read access for visitors (teachers, rooms, courses, batches, schedule_slots)
CREATE POLICY "Public can view teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Public can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Public can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public can view active batches" ON public.batches FOR SELECT USING (is_active = true);
CREATE POLICY "Public can view schedule slots" ON public.schedule_slots FOR SELECT USING (true);

-- Admin users table - no public access, only via edge function
CREATE POLICY "No direct access to admin_users" ON public.admin_users FOR ALL USING (false);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schedule_slots_updated_at BEFORE UPDATE ON public.schedule_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default admin user (password: 123456, hashed with bcrypt)
INSERT INTO public.admin_users (username, password_hash) 
VALUES ('ETE_ADMIN', '$2a$10$rICvqXBpxBJn8sZ5q5k5XOQIEPqHNF5HkCLvhAoKLqZH5T.Ov0qZC')
ON CONFLICT (username) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX idx_schedule_slots_batch_id ON public.schedule_slots(batch_id);
CREATE INDEX idx_schedule_slots_day ON public.schedule_slots(day);
CREATE INDEX idx_batches_level_term ON public.batches(level DESC, term DESC);
CREATE INDEX idx_batches_is_active ON public.batches(is_active);
CREATE INDEX idx_batches_start_date ON public.batches(start_date);
