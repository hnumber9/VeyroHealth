
CREATE TABLE public.therapist_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  title text,
  bio text,
  calendly_url text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendly_url_format CHECK (
    calendly_url IS NULL OR calendly_url ~* '^https://(www\.)?calendly\.com/.+'
  ),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]{2,60}$')
);

GRANT SELECT ON public.therapist_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.therapist_profiles TO authenticated;
GRANT ALL ON public.therapist_profiles TO service_role;

ALTER TABLE public.therapist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published profiles"
  ON public.therapist_profiles FOR SELECT
  USING (published = true);

CREATE POLICY "Therapists can view own profile"
  ON public.therapist_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Therapists can insert own profile"
  ON public.therapist_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Therapists can update own profile"
  ON public.therapist_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Therapists can delete own profile"
  ON public.therapist_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tp_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER therapist_profiles_set_updated_at
  BEFORE UPDATE ON public.therapist_profiles
  FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();
