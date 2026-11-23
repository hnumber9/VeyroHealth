DO $$
DECLARE uid uuid := 'fb2410db-9d54-40eb-aeb0-e96d1616a5da';
DECLARE tpid uuid;
BEGIN
  SELECT id INTO tpid FROM public.therapist_profiles WHERE user_id = uid;

  IF tpid IS NOT NULL THEN
    DELETE FROM public.session_notes WHERE therapist_id = tpid;
    DELETE FROM public.therapist_reviews WHERE therapist_id = tpid;
    DELETE FROM public.appointments WHERE therapist_id = tpid;
    DELETE FROM public.booking_intents WHERE therapist_id = tpid;
    DELETE FROM public.therapist_clients WHERE therapist_id = tpid;
    DELETE FROM public.therapist_invite_links WHERE therapist_id = tpid;
    DELETE FROM public.calendly_connections WHERE therapist_id = tpid;
    DELETE FROM public.therapist_approval_tokens WHERE therapist_profile_id = tpid;
    DELETE FROM public.therapist_profiles WHERE id = tpid;
  END IF;

  DELETE FROM public.session_notes WHERE client_user_id = uid;
  DELETE FROM public.therapist_reviews WHERE client_user_id = uid;
  DELETE FROM public.appointments WHERE client_user_id = uid;
  DELETE FROM public.booking_intents WHERE client_user_id = uid;
  DELETE FROM public.therapist_clients WHERE client_user_id = uid;
  DELETE FROM public.user_roles WHERE user_id = uid;
  DELETE FROM public.admins WHERE user_id = uid;
  DELETE FROM public.profiles WHERE user_id = uid;
  DELETE FROM auth.users WHERE id = uid;
END $$;