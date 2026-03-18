-- Add limit_type to usage_limits (per_day, per_hour, per_minute)
ALTER TABLE public.usage_limits ADD COLUMN limit_type text NOT NULL DEFAULT 'per_day';

-- Create per-user usage limits table
CREATE TABLE public.user_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  section text NOT NULL,
  custom_limit integer NOT NULL DEFAULT 10,
  limit_type text NOT NULL DEFAULT 'per_day',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section)
);

ALTER TABLE public.user_usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user limits" ON public.user_usage_limits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own limits" ON public.user_usage_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);