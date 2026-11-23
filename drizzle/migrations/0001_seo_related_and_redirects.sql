ALTER TABLE public.seo_pages ADD COLUMN related_slugs text[] NOT NULL DEFAULT '{}';
CREATE TABLE public.seo_redirects (
  from_slug text PRIMARY KEY,
  to_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.seo_redirects TO service_role;
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;