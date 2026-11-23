-- Per-therapist Calendly OAuth connections
CREATE TABLE public.calendly_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  calendly_user_uri text NOT NULL,
  calendly_organization_uri text,
  calendly_email text,
  calendly_name text,
  scheduling_url text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  webhook_subscription_uri text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (therapist_id),
  UNIQUE (calendly_user_uri)
);

GRANT SELECT, DELETE ON public.calendly_connections TO authenticated;
GRANT ALL ON public.calendly_connections TO service_role;

ALTER TABLE public.calendly_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Therapists can view their own calendly connection"
  ON public.calendly_connections FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Therapists can delete their own calendly connection"
  ON public.calendly_connections FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER calendly_connections_set_updated_at
  BEFORE UPDATE ON public.calendly_connections
  FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();

-- Idempotency for webhook upserts
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS calendly_event_uri text,
  ADD COLUMN IF NOT EXISTS calendly_invitee_uri text;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_calendly_invitee_uri_key
  ON public.appointments (calendly_invitee_uri)
  WHERE calendly_invitee_uri IS NOT NULL;