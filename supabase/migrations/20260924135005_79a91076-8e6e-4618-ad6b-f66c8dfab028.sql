CREATE TABLE public.therapist_bank_details (
  user_id uuid PRIMARY KEY,
  account_name text NOT NULL,
  account_number text NOT NULL,
  sort_code text NOT NULL,
  bank_name text,
  bank_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.therapist_bank_details TO authenticated;
GRANT ALL ON public.therapist_bank_details TO service_role;
ALTER TABLE public.therapist_bank_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own bank details read" ON public.therapist_bank_details FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Own bank details insert" ON public.therapist_bank_details FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own bank details update" ON public.therapist_bank_details FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER therapist_bank_details_set_updated_at BEFORE UPDATE ON public.therapist_bank_details FOR EACH ROW EXECUTE FUNCTION public.tp_set_updated_at();