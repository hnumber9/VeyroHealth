-- M1: therapist services (duration + price per service)
CREATE TABLE public.therapist_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 10 AND 480),
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'GBP',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  calcom_event_type_id bigint,
  calcom_event_type_slug text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_therapist_services_therapist ON public.therapist_services(therapist_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.therapist_services TO authenticated;
GRANT SELECT ON public.therapist_services TO anon;
GRANT ALL ON public.therapist_services TO service_role;

ALTER TABLE public.therapist_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists manage their own services"
  ON public.therapist_services FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can view active services of published therapists"
  ON public.therapist_services FOR SELECT TO anon, authenticated
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM public.therapist_profiles tp
      WHERE tp.id = therapist_services.therapist_id AND tp.published = true
    )
  );

CREATE TRIGGER trg_therapist_services_updated_at
  BEFORE UPDATE ON public.therapist_services
  FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();

-- M2: Cal.com connection per therapist
CREATE TABLE public.calcom_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  calcom_username text NOT NULL,
  calcom_api_key text NOT NULL,
  calcom_user_id bigint,
  calcom_email text,
  calcom_name text,
  timezone text,
  connection_status text NOT NULL DEFAULT 'unknown',
  connection_error text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (therapist_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calcom_connections TO authenticated;
GRANT ALL ON public.calcom_connections TO service_role;

ALTER TABLE public.calcom_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists view their own calcom connection"
  ON public.calcom_connections FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Therapists insert their own calcom connection"
  ON public.calcom_connections FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Therapists update their own calcom connection"
  ON public.calcom_connections FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Therapists delete their own calcom connection"
  ON public.calcom_connections FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_calcom_connections_updated_at
  BEFORE UPDATE ON public.calcom_connections
  FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();

-- appointments: service snapshot + cal.com refs
ALTER TABLE public.appointments
  ADD COLUMN service_id uuid REFERENCES public.therapist_services(id) ON DELETE SET NULL,
  ADD COLUMN service_name text,
  ADD COLUMN service_duration_minutes integer,
  ADD COLUMN calcom_booking_uid text,
  ADD COLUMN calcom_reservation_uid text,
  ADD COLUMN hold_expires_at timestamptz;

-- booking_intents: service snapshot + hold
ALTER TABLE public.booking_intents
  ADD COLUMN service_id uuid REFERENCES public.therapist_services(id) ON DELETE SET NULL,
  ADD COLUMN service_name text,
  ADD COLUMN service_duration_minutes integer,
  ADD COLUMN calcom_reservation_uid text,
  ADD COLUMN calcom_booking_uid text,
  ADD COLUMN slot_start timestamptz,
  ADD COLUMN hold_expires_at timestamptz,
  ADD COLUMN needs_manual_review boolean NOT NULL DEFAULT false;

-- therapist_profiles: cal.com connected marker
ALTER TABLE public.therapist_profiles
  ADD COLUMN calcom_connected_at timestamptz,
  ADD COLUMN calcom_username text;