
-- Allow authenticated users to manage their own photos (path prefixed by their user id)
CREATE POLICY "Therapists can upload own photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'therapist-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Therapists can update own photo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'therapist-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Therapists can delete own photo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'therapist-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can read therapist photos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'therapist-photos');
