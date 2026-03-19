
-- Global per-second rate limit settings
CREATE TABLE public.rate_limit_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  requests_per_second integer NOT NULL DEFAULT 5,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default row
INSERT INTO public.rate_limit_settings (enabled, requests_per_second) VALUES (true, 5);

-- Enable RLS
ALTER TABLE public.rate_limit_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage rate limit settings" ON public.rate_limit_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read rate limit settings" ON public.rate_limit_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Edge functions can read rate limit settings" ON public.rate_limit_settings
  FOR SELECT TO anon USING (true);

-- Rate limit log to track requests per second
CREATE TABLE public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS  
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Edge functions (service role) bypass RLS, so we just need anon insert for edge functions
CREATE POLICY "Service role manages rate limit log" ON public.rate_limit_log
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read rate limit log" ON public.rate_limit_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Function to check and record rate limit (called by edge functions with service role)
CREATE OR REPLACE FUNCTION public.check_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _enabled boolean;
  _max_rps integer;
  _current_count integer;
BEGIN
  SELECT enabled, requests_per_second INTO _enabled, _max_rps
  FROM public.rate_limit_settings LIMIT 1;

  IF NOT _enabled THEN
    RETURN true;
  END IF;

  -- Count requests in the current second
  SELECT count(*) INTO _current_count
  FROM public.rate_limit_log
  WHERE requested_at >= date_trunc('second', now());

  IF _current_count >= _max_rps THEN
    RETURN false;
  END IF;

  -- Record this request
  INSERT INTO public.rate_limit_log (requested_at) VALUES (now());

  -- Cleanup old entries (older than 5 seconds)
  DELETE FROM public.rate_limit_log WHERE requested_at < now() - interval '5 seconds';

  RETURN true;
END;
$$;
