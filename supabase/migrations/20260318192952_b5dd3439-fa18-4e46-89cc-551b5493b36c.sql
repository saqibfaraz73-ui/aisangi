
CREATE TABLE public.elevenlabs_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NOT NULL DEFAULT '',
  voice_id text NOT NULL DEFAULT '',
  voice_name text NOT NULL DEFAULT 'My Clone Voice',
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.elevenlabs_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage elevenlabs settings"
  ON public.elevenlabs_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Edge functions can read elevenlabs settings"
  ON public.elevenlabs_settings FOR SELECT TO anon
  USING (true);

INSERT INTO public.elevenlabs_settings (api_key, voice_id, voice_name, enabled)
VALUES ('', '', 'My Clone Voice', false);
