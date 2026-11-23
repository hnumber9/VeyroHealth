ALTER TABLE public.session_notes
  ADD COLUMN appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL;
CREATE INDEX session_notes_appointment ON public.session_notes(appointment_id);