-- Restore SELECT grants for public-read tables (RLS policies still enforce row filters)
GRANT SELECT ON public.batches TO anon, authenticated;
GRANT SELECT ON public.holidays TO anon, authenticated;
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT SELECT ON public.teachers TO anon, authenticated;
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT SELECT ON public.schedule_slots TO anon, authenticated;
