
-- Add tokens_used column to usage_log
ALTER TABLE public.usage_log ADD COLUMN tokens_used integer DEFAULT 0;

-- Create daily token cap table
CREATE TABLE public.daily_token_cap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  daily_limit integer NOT NULL DEFAULT 1000000,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_token_cap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage token cap" ON public.daily_token_cap FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read token cap" ON public.daily_token_cap FOR SELECT TO authenticated USING (true);

-- Insert default row
INSERT INTO public.daily_token_cap (enabled, daily_limit) VALUES (false, 1000000);
