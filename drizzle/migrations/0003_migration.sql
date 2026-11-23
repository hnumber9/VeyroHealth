ALTER TABLE public.seo_pages
  ADD COLUMN status text NOT NULL DEFAULT 'draft',
  ADD COLUMN reviewer_name text NOT NULL DEFAULT '',
  ADD COLUMN reviewer_qualifications text NOT NULL DEFAULT '',
  ADD COLUMN reviewed_on date;

UPDATE public.seo_pages SET status = CASE WHEN published THEN 'published' ELSE 'draft' END;

ALTER TABLE public.seo_pages ADD CONSTRAINT seo_pages_status_check
  CHECK (status IN ('draft','clinical_review','approved','published'));

CREATE OR REPLACE FUNCTION public.seo_pages_review_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('approved','published')
     AND (btrim(NEW.reviewer_name) = '' OR btrim(NEW.reviewer_qualifications) = '' OR NEW.reviewed_on IS NULL) THEN
    RAISE EXCEPTION 'A page needs the reviewer''s name, qualifications and review date before it can be approved or published';
  END IF;
  NEW.published := (NEW.status = 'published');
  RETURN NEW;
END $$;

CREATE TRIGGER seo_pages_review_guard BEFORE INSERT OR UPDATE ON public.seo_pages
  FOR EACH ROW EXECUTE FUNCTION public.seo_pages_review_guard();