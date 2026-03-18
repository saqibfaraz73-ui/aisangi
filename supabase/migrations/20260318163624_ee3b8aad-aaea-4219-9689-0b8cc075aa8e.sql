
CREATE TABLE public.global_usage_cap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  daily_limit integer NOT NULL DEFAULT 1400,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.global_usage_cap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage global cap"
  ON public.global_usage_cap FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read global cap"
  ON public.global_usage_cap FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.global_usage_cap (enabled, daily_limit) VALUES (true, 1400);
