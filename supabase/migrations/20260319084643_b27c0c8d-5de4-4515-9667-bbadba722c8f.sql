
-- Remove overly permissive anon policy - service role bypasses RLS anyway
DROP POLICY "Service role manages rate limit log" ON public.rate_limit_log;
