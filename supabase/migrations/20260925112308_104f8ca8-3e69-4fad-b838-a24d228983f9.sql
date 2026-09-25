REVOKE SELECT ON public.display_settings FROM anon, authenticated;
DROP POLICY "Anyone can view display theme" ON public.display_settings;