
-- Add music_model column to api_settings
ALTER TABLE public.api_settings ADD COLUMN IF NOT EXISTS music_model text NOT NULL DEFAULT 'lyria-002';

-- Create music generation cap table
CREATE TABLE IF NOT EXISTS public.music_generation_cap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  daily_limit integer NOT NULL DEFAULT 50,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.music_generation_cap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage music cap" ON public.music_generation_cap FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read music cap" ON public.music_generation_cap FOR SELECT TO authenticated USING (true);

-- Insert default row
INSERT INTO public.music_generation_cap (enabled, daily_limit) VALUES (true, 50);
