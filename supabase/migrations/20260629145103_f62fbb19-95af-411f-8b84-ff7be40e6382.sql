
-- Auto-create profile rows when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any existing auth users that don't have a profile yet
INSERT INTO public.profiles (user_id, email, first_name, last_name)
SELECT u.id, u.email,
       u.raw_user_meta_data->>'first_name',
       u.raw_user_meta_data->>'last_name'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- Allow therapists to create/update client links for their own profile
CREATE POLICY "Therapist inserts own client links"
  ON public.therapist_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.therapist_profiles tp
    WHERE tp.id = therapist_clients.therapist_id AND tp.user_id = auth.uid()
  ));

CREATE POLICY "Therapist updates own client links"
  ON public.therapist_clients
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.therapist_profiles tp
    WHERE tp.id = therapist_clients.therapist_id AND tp.user_id = auth.uid()
  ));
