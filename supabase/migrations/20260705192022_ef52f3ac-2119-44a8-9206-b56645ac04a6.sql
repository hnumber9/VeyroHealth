-- Allow public read access to intro videos so they can be shown on public profiles
CREATE POLICY "Public can view therapist videos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'therapist-videos');

-- Therapists can upload their own video (path must start with their user_id/)
CREATE POLICY "Therapists can upload own video"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'therapist-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Therapists can update own video"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'therapist-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Therapists can delete own video"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'therapist-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);