-- Schema snapshot for tables that were created outside the repo's migrations:
--   therapist_invite_links, booking_intents, payment_events, admins, admin_audit_log
-- (plus the private.has_role helper their policies use).
--
-- Mirrors the live database. Every statement is guarded (IF NOT EXISTS or an
-- existence check), so running it against the live database changes nothing;
-- on a fresh database it lets the schema be rebuilt from the repo.
--
-- booking_intents is created in the shape it had at this point in history. The
-- later migrations 20260803210420 (service/hold columns), 20261005104353
-- (status check) and 20261006211737 (nullable client_user_id) bring it to the
-- exact live definition.

-- Admin role helper (used by RLS policies below)
CREATE SCHEMA IF NOT EXISTS private;

DO $$
BEGIN
  IF to_regprocedure('private.has_role(uuid, public.app_role)') IS NULL THEN
    CREATE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
     RETURNS boolean
     LANGUAGE sql
     STABLE SECURITY DEFINER
     SET search_path TO 'public'
    AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$fn$;
    REVOKE ALL ON SCHEMA private FROM PUBLIC;
    GRANT USAGE ON SCHEMA private TO authenticated, service_role;
    REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
  END IF;
END $$;

-- therapist_invite_links
CREATE TABLE IF NOT EXISTS public.therapist_invite_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_user_id uuid NOT NULL,
  therapist_id uuid NOT NULL,
  token text NOT NULL,
  label text,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT therapist_invite_links_pkey PRIMARY KEY (id),
  CONSTRAINT therapist_invite_links_token_key UNIQUE (token),
  CONSTRAINT therapist_invite_links_therapist_id_fkey FOREIGN KEY (therapist_id)
    REFERENCES public.therapist_profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS therapist_invite_links_therapist_idx
  ON public.therapist_invite_links USING btree (therapist_user_id);

-- booking_intents
CREATE TABLE IF NOT EXISTS public.booking_intents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL,
  client_user_id uuid NOT NULL,
  client_email text NOT NULL,
  client_name text,
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'gbp'::text,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  is_direct_invite boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending_payment'::text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_environment text NOT NULL DEFAULT 'sandbox'::text,
  calendly_invitee_uri text,
  refunded_at timestamptz,
  refund_amount_cents integer,
  refund_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  booked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  calendly_scheduled_at timestamptz,
  calendly_event_uri text,
  pending_ref text,
  invite_link_id uuid,
  CONSTRAINT booking_intents_pkey PRIMARY KEY (id),
  CONSTRAINT booking_intents_status_check CHECK (status = ANY (ARRAY['pending_payment'::text, 'paid'::text, 'booking'::text, 'booked'::text, 'paid_needs_review'::text, 'refunded'::text, 'expired'::text, 'cancelled'::text])),
  CONSTRAINT booking_intents_stripe_environment_check CHECK (stripe_environment = ANY (ARRAY['sandbox'::text, 'live'::text])),
  CONSTRAINT booking_intents_therapist_id_fkey FOREIGN KEY (therapist_id)
    REFERENCES public.therapist_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT booking_intents_client_user_id_fkey FOREIGN KEY (client_user_id)
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT booking_intents_invite_link_fk FOREIGN KEY (invite_link_id)
    REFERENCES public.therapist_invite_links(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_intents_pending_ref_key
  ON public.booking_intents USING btree (pending_ref) WHERE (pending_ref IS NOT NULL);
CREATE INDEX IF NOT EXISTS booking_intents_pending_status_created_idx
  ON public.booking_intents USING btree (status, created_at) WHERE (status = 'pending_payment'::text);
CREATE INDEX IF NOT EXISTS idx_booking_intents_client_user_id
  ON public.booking_intents USING btree (client_user_id);
CREATE INDEX IF NOT EXISTS idx_booking_intents_status
  ON public.booking_intents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_booking_intents_stripe_session
  ON public.booking_intents USING btree (stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_booking_intents_therapist_id
  ON public.booking_intents USING btree (therapist_id);

-- payment_events
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL,
  event_type text NOT NULL,
  environment text NOT NULL,
  booking_intent_id uuid,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_events_pkey PRIMARY KEY (id),
  CONSTRAINT payment_events_stripe_event_id_key UNIQUE (stripe_event_id),
  CONSTRAINT payment_events_environment_check CHECK (environment = ANY (ARRAY['sandbox'::text, 'live'::text])),
  CONSTRAINT payment_events_booking_intent_id_fkey FOREIGN KEY (booking_intent_id)
    REFERENCES public.booking_intents(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_events_intent
  ON public.payment_events USING btree (booking_intent_id);

-- admins
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (user_id),
  CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- admin_audit_log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_log_admin_user_id_fkey FOREIGN KEY (admin_user_id)
    REFERENCES auth.users(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin
  ON public.admin_audit_log USING btree (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created
  ON public.admin_audit_log USING btree (created_at DESC);

-- Grants (match live; re-granting existing privileges is a no-op)
GRANT ALL ON public.therapist_invite_links TO anon, authenticated, service_role;
GRANT ALL ON public.booking_intents TO anon, authenticated, service_role;
GRANT ALL ON public.payment_events TO anon, authenticated, service_role;
GRANT ALL ON public.admins TO anon, authenticated, service_role;
GRANT ALL ON public.admin_audit_log TO anon, authenticated, service_role;

-- Row level security
ALTER TABLE public.therapist_invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies and triggers (created only when missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'therapist_invite_links' AND policyname = 'Therapists manage own invite links') THEN
    CREATE POLICY "Therapists manage own invite links" ON public.therapist_invite_links
      AS PERMISSIVE FOR ALL TO authenticated
      USING (auth.uid() = therapist_user_id)
      WITH CHECK (auth.uid() = therapist_user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'booking_intents' AND policyname = 'Admins can view all booking intents') THEN
    CREATE POLICY "Admins can view all booking intents" ON public.booking_intents
      AS PERMISSIVE FOR SELECT TO authenticated
      USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'booking_intents' AND policyname = 'Clients view own booking intents') THEN
    CREATE POLICY "Clients view own booking intents" ON public.booking_intents
      AS PERMISSIVE FOR SELECT TO authenticated
      USING (auth.uid() = client_user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'booking_intents' AND policyname = 'Therapists view intents on their profile') THEN
    CREATE POLICY "Therapists view intents on their profile" ON public.booking_intents
      AS PERMISSIVE FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.therapist_profiles tp
        WHERE tp.id = booking_intents.therapist_id AND tp.user_id = auth.uid()
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admins' AND policyname = 'Admins can view admin list') THEN
    CREATE POLICY "Admins can view admin list" ON public.admins
      AS PERMISSIVE FOR SELECT TO authenticated
      USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admin_audit_log' AND policyname = 'Admins view audit log') THEN
    CREATE POLICY "Admins view audit log" ON public.admin_audit_log
      AS PERMISSIVE FOR SELECT TO authenticated
      USING (private.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;

  -- payment_events intentionally has no policies (service role only).

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.booking_intents'::regclass AND tgname = 'booking_intents_set_updated_at') THEN
    CREATE TRIGGER booking_intents_set_updated_at BEFORE UPDATE ON public.booking_intents
      FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.therapist_invite_links'::regclass AND tgname = 'trg_invite_links_updated_at') THEN
    CREATE TRIGGER trg_invite_links_updated_at BEFORE UPDATE ON public.therapist_invite_links
      FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();
  END IF;
END $$;
