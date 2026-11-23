-- 1. Remove public (anon) read access to therapist_reviews, which exposed client_user_id
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.therapist_reviews;
REVOKE SELECT ON public.therapist_reviews FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.therapist_reviews TO authenticated;
GRANT ALL ON public.therapist_reviews TO service_role;

CREATE POLICY "Clients read own reviews"
  ON public.therapist_reviews FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());

CREATE POLICY "Therapists read reviews for own profile"
  ON public.therapist_reviews FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.therapist_profiles tp
    WHERE tp.id = therapist_reviews.therapist_id AND tp.user_id = auth.uid()
  ));

-- 2. Internal SECURITY DEFINER helper must not be callable from the Data API
REVOKE ALL ON FUNCTION public.validate_invite_token(text) FROM anon, authenticated, PUBLIC;