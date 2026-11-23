INSERT INTO public.seo_redirects (from_slug, to_slug) VALUES
  ('therapy-for-confidence', 'therapy-for-self-confidence'),
  ('therapy-for-bereavement', 'therapy-for-grief-and-bereavement'),
  ('therapy-for-parenting-support', 'therapy-for-parenting'),
  ('therapy-for-pre-natal', 'therapy-for-pregnancy'),
  ('therapy-for-mens-wellbeing', 'therapy-for-mens-mental-health')
ON CONFLICT (from_slug) DO UPDATE SET to_slug = EXCLUDED.to_slug;