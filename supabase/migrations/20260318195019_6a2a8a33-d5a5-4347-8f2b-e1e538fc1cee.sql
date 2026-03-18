CREATE TABLE public.lipsync_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'heygen',
  heygen_api_key text NOT NULL DEFAULT '',
  did_api_key text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lipsync_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lipsync settings" ON public.lipsync_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Edge functions can read lipsync settings" ON public.lipsync_settings
  FOR SELECT TO anon USING (true);

CREATE POLICY "Authenticated can read lipsync settings" ON public.lipsync_settings
  FOR SELECT TO authenticated USING (true);