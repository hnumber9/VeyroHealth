CREATE TABLE public.matching_enquiries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL,
 help_with text NOT NULL,
 preferred_gender text NOT NULL,
 preferred_age text NOT NULL,
 consent_text text NOT NULL,
 consent_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 rate_key text NOT NULL
);
GRANT ALL ON public.matching_enquiries TO service_role;
ALTER TABLE public.matching_enquiries ENABLE ROW LEVEL SECURITY;
CREATE INDEX matching_enquiries_rate_idx ON public.matching_enquiries(rate_key, created_at);
CREATE OR REPLACE FUNCTION public.submit_matching_enquiry(p_email text, p_help text, p_gender text, p_age text, p_consent text, p_rate_key text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE new_id uuid;
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_rate_key, 0));
 IF (SELECT count(*) FROM public.matching_enquiries WHERE rate_key = p_rate_key AND created_at > now() - interval '1 hour') >= 5 THEN
 RAISE EXCEPTION 'matching_rate_limit';
 END IF;
 INSERT INTO public.matching_enquiries(email,help_with,preferred_gender,preferred_age,consent_text,rate_key)
 VALUES(p_email,p_help,p_gender,p_age,p_consent,p_rate_key) RETURNING id INTO new_id;
 RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_matching_enquiry(text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_matching_enquiry(text,text,text,text,text,text) TO service_role;