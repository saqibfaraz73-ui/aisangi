CREATE TABLE public.premium_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  daily_limit integer NOT NULL DEFAULT 50,
  limit_type text NOT NULL DEFAULT 'per_day',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(section)
);

ALTER TABLE public.premium_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage premium limits" ON public.premium_usage_limits FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read premium limits" ON public.premium_usage_limits FOR SELECT TO authenticated USING (true);

INSERT INTO public.premium_usage_limits (section, daily_limit, limit_type) VALUES
  ('text_to_image', 100, 'per_day'),
  ('image_to_video', 50, 'per_day'),
  ('script_ai', 100, 'per_day'),
  ('music_gen', 50, 'per_day'),
  ('voice_generator', 100, 'per_day'),
  ('lip_sync', 30, 'per_day'),
  ('prompt_generator', 100, 'per_day')
ON CONFLICT (section) DO NOTHING;