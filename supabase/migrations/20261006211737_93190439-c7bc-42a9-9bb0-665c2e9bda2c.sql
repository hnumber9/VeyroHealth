ALTER TABLE public.booking_intents ALTER COLUMN client_user_id DROP NOT NULL;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS manage_token text;
CREATE UNIQUE INDEX IF NOT EXISTS appointments_manage_token_key ON public.appointments(manage_token) WHERE manage_token IS NOT NULL;
UPDATE public.appointments SET manage_token = encode(extensions.gen_random_bytes(24), 'hex') WHERE manage_token IS NULL;
ALTER TABLE public.appointments ALTER COLUMN manage_token SET DEFAULT encode(extensions.gen_random_bytes(24), 'hex');