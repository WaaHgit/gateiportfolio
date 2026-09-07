DROP VIEW IF EXISTS public.reviews_public;

REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, client_name, rating, review_text, is_edited, approved_at, created_at)
  ON public.reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT INSERT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;

DROP POLICY IF EXISTS "public can read live reviews" ON public.reviews;
CREATE POLICY "public can read live reviews" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (status = 'live'::review_status);