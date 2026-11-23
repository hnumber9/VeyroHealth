
CREATE TABLE public.therapist_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id UUID NOT NULL REFERENCES public.therapist_profiles(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  traits TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (therapist_id, client_user_id)
);

GRANT SELECT ON public.therapist_reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.therapist_reviews TO authenticated;
GRANT ALL ON public.therapist_reviews TO service_role;

ALTER TABLE public.therapist_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON public.therapist_reviews FOR SELECT
  USING (true);

CREATE POLICY "Clients insert own review"
  ON public.therapist_reviews FOR INSERT
  TO authenticated
  WITH CHECK (client_user_id = auth.uid());

CREATE POLICY "Clients update own review"
  ON public.therapist_reviews FOR UPDATE
  TO authenticated
  USING (client_user_id = auth.uid())
  WITH CHECK (client_user_id = auth.uid());

CREATE POLICY "Clients delete own review"
  ON public.therapist_reviews FOR DELETE
  TO authenticated
  USING (client_user_id = auth.uid());

CREATE INDEX therapist_reviews_therapist_idx ON public.therapist_reviews (therapist_id, created_at DESC);

CREATE TRIGGER therapist_reviews_set_updated_at
  BEFORE UPDATE ON public.therapist_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();
