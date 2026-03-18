CREATE TABLE public.image_generation_cap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  daily_limit integer NOT NULL DEFAULT 240,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.image_generation_cap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage image cap" ON public.image_generation_cap
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read image cap" ON public.image_generation_cap
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.image_generation_cap (enabled, daily_limit) VALUES (true, 240);