
CREATE TABLE public.api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NOT NULL DEFAULT '',
  provider text NOT NULL DEFAULT 'gemini',
  model text NOT NULL DEFAULT 'gemini-2.0-flash',
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage api settings"
  ON public.api_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Edge functions can read api settings"
  ON public.api_settings FOR SELECT
  TO anon
  USING (true);

INSERT INTO public.api_settings (api_key, provider, model, enabled)
VALUES ('', 'gemini', 'gemini-2.0-flash', false);
