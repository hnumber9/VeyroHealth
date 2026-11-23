UPDATE public.therapist_profiles p
SET calendly_url = NULL, calendly_user_uri = NULL, calendly_connected_at = NULL
WHERE p.calendly_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.calendly_connections c WHERE c.therapist_id = p.id);