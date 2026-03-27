
CREATE TABLE public.section_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'enabled',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.section_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage section visibility" ON public.section_visibility
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read section visibility" ON public.section_visibility
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can read section visibility" ON public.section_visibility
  FOR SELECT TO anon USING (true);

INSERT INTO public.section_visibility (section, status) VALUES
  ('text_to_image', 'enabled'),
  ('image_to_video', 'enabled'),
  ('script_ai', 'enabled'),
  ('voice_generator', 'enabled'),
  ('music_generator', 'enabled'),
  ('lip_sync', 'enabled');

CREATE TABLE public.premium_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'manual',
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid
);

ALTER TABLE public.premium_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage premium users" ON public.premium_users
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own premium status" ON public.premium_users
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
