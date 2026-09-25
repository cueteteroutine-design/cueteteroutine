
-- Weekly per-batch schedule modifications
-- Auto-cleaned every Friday 00:00 BDT (Thu 18:00 UTC)

CREATE TABLE public.weekly_modifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('cancel','reschedule')),
  -- source (the original cell/slot involved)
  source_day TEXT NOT NULL,
  source_slot_index INT NOT NULL,
  source_slot_position INT NOT NULL DEFAULT 0,
  source_slot_id UUID REFERENCES public.schedule_slots(id) ON DELETE CASCADE,
  -- target (only for reschedule)
  target_day TEXT,
  target_slot_index INT,
  target_slot_position INT DEFAULT 0,
  target_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.weekly_modifications TO anon;
GRANT SELECT ON public.weekly_modifications TO authenticated;
GRANT ALL ON public.weekly_modifications TO service_role;

ALTER TABLE public.weekly_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read weekly modifications"
ON public.weekly_modifications FOR SELECT
USING (true);

CREATE INDEX weekly_modifications_batch_week_idx
  ON public.weekly_modifications(batch_id, week_start);

CREATE TRIGGER update_weekly_modifications_updated_at
BEFORE UPDATE ON public.weekly_modifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live public updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_modifications;

-- pg_cron: delete every past week's mods each Fri 00:00 BDT (Thu 18:00 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-weekly-modifications',
  '0 18 * * 4',
  $$DELETE FROM public.weekly_modifications
    WHERE week_start < (CURRENT_DATE AT TIME ZONE 'Asia/Dhaka')::date
       - EXTRACT(DOW FROM (CURRENT_DATE AT TIME ZONE 'Asia/Dhaka'))::int$$
);
