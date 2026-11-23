DROP POLICY IF EXISTS "Clients insert own review" ON public.therapist_reviews;
CREATE POLICY "Clients insert own review" ON public.therapist_reviews
  FOR INSERT TO authenticated
  WITH CHECK (client_user_id = auth.uid() AND public.has_role(auth.uid(), 'client'::app_role));

DROP POLICY IF EXISTS "Clients update own review" ON public.therapist_reviews;
CREATE POLICY "Clients update own review" ON public.therapist_reviews
  FOR UPDATE TO authenticated
  USING (client_user_id = auth.uid() AND public.has_role(auth.uid(), 'client'::app_role))
  WITH CHECK (client_user_id = auth.uid() AND public.has_role(auth.uid(), 'client'::app_role));