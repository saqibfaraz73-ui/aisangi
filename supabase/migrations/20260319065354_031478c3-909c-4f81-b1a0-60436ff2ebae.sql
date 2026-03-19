INSERT INTO storage.buckets (id, name, public) VALUES ('lipsync-files', 'lipsync-files', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload lipsync files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lipsync-files');
CREATE POLICY "Anyone can read lipsync files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'lipsync-files');