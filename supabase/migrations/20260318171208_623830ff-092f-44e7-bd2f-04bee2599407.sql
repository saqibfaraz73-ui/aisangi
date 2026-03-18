CREATE TABLE public.script_generation_cap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  daily_limit integer NOT NULL DEFAULT 1160,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.script_generation_cap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage script cap" ON public.script_generation_cap
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read script cap" ON public.script_generation_cap
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.script_generation_cap (enabled, daily_limit) VALUES (true, 1160);