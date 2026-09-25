-- 1) source column on holidays
ALTER TABLE public.holidays
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

-- 2) dismissed national holidays
CREATE TABLE IF NOT EXISTS public.dismissed_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, title)
);

ALTER TABLE public.dismissed_holidays ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated access; edge function uses service role.
REVOKE ALL ON public.dismissed_holidays FROM anon, authenticated;

CREATE POLICY "No direct access to dismissed_holidays"
  ON public.dismissed_holidays
  FOR ALL
  USING (false);