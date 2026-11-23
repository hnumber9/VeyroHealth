
CREATE POLICY "Therapists can read own photo"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'therapist-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Therapists can read own video"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'therapist-videos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
