DROP POLICY IF EXISTS "Anyone can register interest" ON public.therapist_interest;
REVOKE INSERT ON public.therapist_interest FROM anon, authenticated;