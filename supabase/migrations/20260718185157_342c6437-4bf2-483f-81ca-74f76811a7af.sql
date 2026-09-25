
CREATE TABLE public.time_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  use_custom BOOLEAN NOT NULL DEFAULT false,
  custom_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.time_settings TO anon;
GRANT SELECT ON public.time_settings TO authenticated;
GRANT ALL ON public.time_settings TO service_role;

ALTER TABLE public.time_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read time_settings" ON public.time_settings
  FOR SELECT USING (true);

CREATE TRIGGER update_time_settings_updated_at
  BEFORE UPDATE ON public.time_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default row with standard time slots
INSERT INTO public.time_settings (use_custom, custom_slots)
VALUES (
  false,
  '[
    {"index":0,"start":"8:10","end":"9:00","isBreak":false},
    {"index":1,"start":"9:00","end":"9:50","isBreak":false},
    {"index":2,"start":"9:50","end":"10:40","isBreak":false},
    {"index":3,"start":"10:40","end":"11:00","isBreak":true},
    {"index":4,"start":"11:00","end":"11:50","isBreak":false},
    {"index":5,"start":"11:50","end":"12:40","isBreak":false},
    {"index":6,"start":"12:40","end":"1:30","isBreak":false},
    {"index":7,"start":"2:30","end":"3:20","isBreak":false},
    {"index":8,"start":"3:20","end":"4:10","isBreak":false},
    {"index":9,"start":"4:10","end":"5:00","isBreak":false}
  ]'::jsonb
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.time_settings;
