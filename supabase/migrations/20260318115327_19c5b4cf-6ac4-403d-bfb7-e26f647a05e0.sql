
CREATE TABLE public.watermark_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Global setting row (user_id = NULL means global)
INSERT INTO public.watermark_settings (enabled, user_id) VALUES (true, NULL);

ALTER TABLE public.watermark_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read watermark settings
CREATE POLICY "Anyone can read watermark settings"
  ON public.watermark_settings FOR SELECT TO authenticated
  USING (true);

-- Admins can manage watermark settings
CREATE POLICY "Admins can manage watermark settings"
  ON public.watermark_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
