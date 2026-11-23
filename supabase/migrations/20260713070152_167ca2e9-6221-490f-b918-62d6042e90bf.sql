
-- 1) Storage: drop redundant explicit public read policies (bucket-level public flag is set separately)
DROP POLICY IF EXISTS "Anyone can read therapist photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view therapist videos" ON storage.objects;

-- 2) user_roles: restrict self-assign to 'client' only
DROP POLICY IF EXISTS "Users can self-assign client or therapist role" ON public.user_roles;
CREATE POLICY "Users can self-assign client role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'client'::app_role);

-- 3) Set fixed search_path on SECURITY DEFINER functions missing it
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 4) Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions not called by clients
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tp_set_updated_at()                                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake()                                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch()                             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer)           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)             FROM PUBLIC, anon, authenticated;
-- has_role() must remain callable by authenticated because RLS policies reference it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
