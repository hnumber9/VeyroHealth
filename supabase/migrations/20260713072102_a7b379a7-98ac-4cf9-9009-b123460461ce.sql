
-- 1) Move has_role() out of the PostgREST-exposed public schema into a private schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Repoint policies that referenced public.has_role to private.has_role.
DROP POLICY IF EXISTS "Clients insert own review" ON public.therapist_reviews;
DROP POLICY IF EXISTS "Clients update own review" ON public.therapist_reviews;

CREATE POLICY "Clients insert own review"
  ON public.therapist_reviews FOR INSERT
  TO authenticated
  WITH CHECK (client_user_id = auth.uid() AND private.has_role(auth.uid(), 'client'::public.app_role));

CREATE POLICY "Clients update own review"
  ON public.therapist_reviews FOR UPDATE
  TO authenticated
  USING (client_user_id = auth.uid() AND private.has_role(auth.uid(), 'client'::public.app_role))
  WITH CHECK (client_user_id = auth.uid() AND private.has_role(auth.uid(), 'client'::public.app_role));

-- Now safe to drop the public-schema version so it's no longer callable via the Data API.
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 2) Add a self-scoped UPDATE policy for calendly_connections (owner only).
CREATE POLICY "Therapists can update their own calendly connection"
  ON public.calendly_connections FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3) Hide reviewer identity (client_user_id) from unauthenticated visitors on therapist_reviews.
-- Row visibility is unchanged; anon can still read public review fields (rating, body, etc.) but not the reviewer's user id.
REVOKE SELECT ON public.therapist_reviews FROM anon;
GRANT SELECT (id, therapist_id, rating, body, traits, created_at, updated_at)
  ON public.therapist_reviews TO anon;
