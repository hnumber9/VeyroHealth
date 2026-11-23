
-- ============ Extend therapist_profiles ============
ALTER TABLE public.therapist_profiles
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS years_in_practice integer,
  ADD COLUMN IF NOT EXISTS session_fee_50 integer,
  ADD COLUMN IF NOT EXISTS session_fee_80 integer,
  ADD COLUMN IF NOT EXISTS offers_intro_call boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS specialties text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approach text,
  ADD COLUMN IF NOT EXISTS qualifications text,
  ADD COLUMN IF NOT EXISTS modalities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS calendly_user_uri text,
  ADD COLUMN IF NOT EXISTS calendly_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Public anon SELECT only for safe, published rows. Old generic SELECT policies (if any) stay narrowed:
DO $$ BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Anyone can view published therapist profiles" ON public.therapist_profiles';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "Public can view published therapist profiles"
  ON public.therapist_profiles FOR SELECT
  TO anon, authenticated
  USING (published = true);

GRANT SELECT ON public.therapist_profiles TO anon;

-- ============ Client profiles ============
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ Therapist <> Client links ============
CREATE TABLE IF NOT EXISTS public.therapist_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_email text NOT NULL,
  linked_via text NOT NULL DEFAULT 'booking',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (therapist_id, client_email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.therapist_clients TO authenticated;
GRANT ALL ON public.therapist_clients TO service_role;

ALTER TABLE public.therapist_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapist reads own client links" ON public.therapist_clients
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.therapist_profiles tp WHERE tp.id = therapist_id AND tp.user_id = auth.uid()));
CREATE POLICY "Client reads own links" ON public.therapist_clients
  FOR SELECT TO authenticated USING (client_user_id = auth.uid());

-- ============ Appointments ============
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_email text NOT NULL,
  client_name text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  meeting_url text,
  calendly_event_uri text UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapist reads own appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.therapist_profiles tp WHERE tp.id = therapist_id AND tp.user_id = auth.uid()));
CREATE POLICY "Client reads own appointments" ON public.appointments
  FOR SELECT TO authenticated USING (client_user_id = auth.uid());

CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();

CREATE INDEX IF NOT EXISTS appointments_therapist_starts ON public.appointments (therapist_id, starts_at);
CREATE INDEX IF NOT EXISTS appointments_client_starts ON public.appointments (client_user_id, starts_at);

-- ============ Session notes ============
CREATE TABLE IF NOT EXISTS public.session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  client_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_email text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_notes TO authenticated;
GRANT ALL ON public.session_notes TO service_role;

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapist manages own notes" ON public.session_notes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.therapist_profiles tp WHERE tp.id = therapist_id AND tp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.therapist_profiles tp WHERE tp.id = therapist_id AND tp.user_id = auth.uid()));
CREATE POLICY "Client reads shared notes" ON public.session_notes
  FOR SELECT TO authenticated
  USING (shared = true AND client_user_id = auth.uid());

CREATE TRIGGER session_notes_set_updated_at
  BEFORE UPDATE ON public.session_notes
  FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();

CREATE INDEX IF NOT EXISTS session_notes_therapist ON public.session_notes (therapist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS session_notes_client_shared ON public.session_notes (client_user_id, shared, created_at DESC);
