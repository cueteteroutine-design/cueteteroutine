CREATE TABLE public.display_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  theme text NOT NULL DEFAULT 'classic' CHECK (theme IN ('classic', 'aurora', 'ticker')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.display_settings TO anon, authenticated;
GRANT ALL ON public.display_settings TO service_role;
ALTER TABLE public.display_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view display theme" ON public.display_settings FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER update_display_settings_updated_at BEFORE UPDATE ON public.display_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.display_settings (id, theme) VALUES (1, 'classic');
ALTER PUBLICATION supabase_realtime ADD TABLE public.display_settings;