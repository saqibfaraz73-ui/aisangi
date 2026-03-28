INSERT INTO public.app_settings (key, value)
VALUES ('auto_confirm_email', 'false')
ON CONFLICT (key) DO NOTHING;