UPDATE public.therapist_profiles tp
SET calendly_url = cc.scheduling_url
FROM public.calendly_connections cc
WHERE cc.therapist_id = tp.id
  AND cc.scheduling_url IS NOT NULL
  AND tp.calendly_url IS DISTINCT FROM cc.scheduling_url;