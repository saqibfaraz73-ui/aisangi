
-- App settings for Play Store URL, AdMob config etc.
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage app settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read app settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anon can read app settings" ON public.app_settings
  FOR SELECT TO anon
  USING (true);

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('play_store_url', ''),
  ('admob_enabled', 'false'),
  ('admob_publisher_id', ''),
  ('admob_banner_unit_id', ''),
  ('admob_interstitial_unit_id', ''),
  ('privacy_policy', 'Privacy Policy content goes here. Update from Admin dashboard.'),
  ('about_app', 'About this app. Update from Admin dashboard.');
