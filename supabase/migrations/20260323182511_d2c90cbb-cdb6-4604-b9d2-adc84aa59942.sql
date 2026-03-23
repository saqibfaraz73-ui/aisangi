
CREATE TABLE public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  page_path text NOT NULL,
  device_type text NOT NULL DEFAULT 'unknown',
  browser text NOT NULL DEFAULT 'unknown',
  os text NOT NULL DEFAULT 'unknown',
  country text NOT NULL DEFAULT 'unknown',
  city text NOT NULL DEFAULT 'unknown',
  ip_address text,
  session_id text,
  visited_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all visits"
  ON public.page_visits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert visits"
  ON public.page_visits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX idx_page_visits_visited_at ON public.page_visits (visited_at DESC);
CREATE INDEX idx_page_visits_user_id ON public.page_visits (user_id);
