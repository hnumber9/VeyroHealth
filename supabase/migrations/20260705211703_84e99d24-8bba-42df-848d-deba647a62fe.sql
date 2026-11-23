CREATE UNIQUE INDEX IF NOT EXISTS therapist_reviews_therapist_client_key
  ON public.therapist_reviews (therapist_id, client_user_id);