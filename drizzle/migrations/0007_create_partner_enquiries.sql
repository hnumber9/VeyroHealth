CREATE TABLE public.partner_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  job_title text,
  organisation_type text NOT NULL,
  audience_size text,
  interests text[] NOT NULL DEFAULT '{}',
  additional_info text,
  consent_text text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  admin_notes text,
  rate_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.partner_enquiries TO service_role;
REVOKE ALL ON public.partner_enquiries FROM anon, authenticated;

ALTER TABLE public.partner_enquiries ENABLE ROW LEVEL SECURITY;

CREATE INDEX partner_enquiries_rate_idx ON public.partner_enquiries (rate_key, created_at);
CREATE INDEX partner_enquiries_created_idx ON public.partner_enquiries (created_at DESC);

CREATE OR REPLACE FUNCTION public.submit_partner_enquiry(
  p_org text, p_contact text, p_email text, p_job text, p_type text, p_size text,
  p_interests text[], p_info text, p_consent text, p_source jsonb, p_rate_key text
) RETURNS uuid
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE new_id uuid;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('partner:' || p_rate_key, 0));
  IF (SELECT count(*) FROM public.partner_enquiries WHERE rate_key = p_rate_key AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'partner_rate_limit';
  END IF;
  INSERT INTO public.partner_enquiries(organisation_name, contact_name, email, job_title, organisation_type, audience_size, interests, additional_info, consent_text, source, rate_key)
  VALUES (p_org, p_contact, p_email, p_job, p_type, p_size, p_interests, p_info, p_consent, COALESCE(p_source, '{}'::jsonb), p_rate_key)
  RETURNING id INTO new_id;
  RETURN new_id;
END $$;

REVOKE ALL ON FUNCTION public.submit_partner_enquiry(text,text,text,text,text,text,text[],text,text,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_partner_enquiry(text,text,text,text,text,text,text[],text,text,jsonb,text) TO service_role;