-- 1. Fix mutable search_path on remaining functions
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 2. calendly_connections: explicit owner-scoped INSERT policy
DROP POLICY IF EXISTS "Therapists can insert their own calendly connection" ON public.calendly_connections;
CREATE POLICY "Therapists can insert their own calendly connection"
ON public.calendly_connections FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.therapist_profiles tp
    WHERE tp.id = calendly_connections.therapist_id AND tp.user_id = auth.uid()
  )
);

-- 3. therapist_approval_tokens: service_role only
REVOKE ALL ON public.therapist_approval_tokens FROM anon, authenticated;
GRANT ALL ON public.therapist_approval_tokens TO service_role;

-- 4. Prevent therapists self-publishing / self-approving
CREATE OR REPLACE FUNCTION public.tp_guard_approval_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role / internal roles bypass; only guard end-user (authenticated) writes
  IF current_setting('role', true) = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  NEW.published := COALESCE(OLD.published, false);
  NEW.published_at := OLD.published_at;
  NEW.approved_at := OLD.approved_at;
  NEW.rejected_at := OLD.rejected_at;
  NEW.rejection_reason := OLD.rejection_reason;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS therapist_profiles_guard_approval ON public.therapist_profiles;
CREATE TRIGGER therapist_profiles_guard_approval
BEFORE UPDATE ON public.therapist_profiles
FOR EACH ROW EXECUTE FUNCTION public.tp_guard_approval_columns();

CREATE OR REPLACE FUNCTION public.tp_guard_approval_columns_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  NEW.published := false;
  NEW.published_at := NULL;
  NEW.approved_at := NULL;
  NEW.rejected_at := NULL;
  NEW.rejection_reason := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS therapist_profiles_guard_approval_insert ON public.therapist_profiles;
CREATE TRIGGER therapist_profiles_guard_approval_insert
BEFORE INSERT ON public.therapist_profiles
FOR EACH ROW EXECUTE FUNCTION public.tp_guard_approval_columns_insert();