ALTER TABLE public.therapist_profiles
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.therapist_profiles
  DROP CONSTRAINT IF EXISTS therapist_profiles_gender_check;

ALTER TABLE public.therapist_profiles
  ADD CONSTRAINT therapist_profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS client_note text;

CREATE TABLE IF NOT EXISTS public.therapist_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.therapist_interest TO anon;
GRANT INSERT ON public.therapist_interest TO authenticated;
GRANT ALL ON public.therapist_interest TO service_role;

ALTER TABLE public.therapist_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can register interest" ON public.therapist_interest;
CREATE POLICY "Anyone can register interest"
  ON public.therapist_interest FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read interest list" ON public.therapist_interest;
CREATE POLICY "Admins can read interest list"
  ON public.therapist_interest FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));
