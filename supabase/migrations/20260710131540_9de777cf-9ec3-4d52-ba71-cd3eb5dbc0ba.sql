DELETE FROM public.profiles WHERE user_id IN ('bb0158d4-f87c-457e-bcd0-598633a447c4','32ad78af-e51a-43ed-9628-ec26a9bf4f8b');
DELETE FROM public.user_roles WHERE user_id IN ('bb0158d4-f87c-457e-bcd0-598633a447c4','32ad78af-e51a-43ed-9628-ec26a9bf4f8b');
DELETE FROM public.therapist_profiles WHERE user_id IN ('bb0158d4-f87c-457e-bcd0-598633a447c4','32ad78af-e51a-43ed-9628-ec26a9bf4f8b');
DELETE FROM auth.users WHERE id IN ('bb0158d4-f87c-457e-bcd0-598633a447c4','32ad78af-e51a-43ed-9628-ec26a9bf4f8b');