
CREATE TABLE public.therapist_approval_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  therapist_profile_id uuid NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at timestamptz,
  used_by_ip text
);

CREATE INDEX therapist_approval_tokens_profile_idx ON public.therapist_approval_tokens (therapist_profile_id);

GRANT ALL ON public.therapist_approval_tokens TO service_role;

ALTER TABLE public.therapist_approval_tokens ENABLE ROW LEVEL SECURITY;

-- No policies: table is only accessed by service_role via server code.
