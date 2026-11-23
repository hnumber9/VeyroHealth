CREATE POLICY "Users can self-assign client or therapist role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role IN ('client'::app_role, 'therapist'::app_role));