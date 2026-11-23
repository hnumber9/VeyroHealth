ALTER TABLE public.therapist_profiles
  ADD COLUMN IF NOT EXISTS intro_video_url text,
  ADD COLUMN IF NOT EXISTS insurance_providers text[] NOT NULL DEFAULT ARRAY[]::text[];