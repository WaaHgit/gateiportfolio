-- 1. Reviews: stop exposing email / edit tokens publicly
DROP POLICY IF EXISTS "public can read live reviews" ON public.reviews;

CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker = false) AS
SELECT id, client_name, rating, review_text, is_edited, approved_at, created_at
FROM public.reviews
WHERE status = 'live'::review_status;

REVOKE ALL ON public.reviews_public FROM PUBLIC;
GRANT SELECT ON public.reviews_public TO anon, authenticated;

REVOKE SELECT ON public.reviews FROM anon;
GRANT INSERT ON public.reviews TO anon;

-- 2. Standardize admin policies on private.has_role
DROP POLICY IF EXISTS "Admins full access profiles" ON public.profiles;
CREATE POLICY "admins full access profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins manage bookings" ON public.bookings;

-- 3. Media bucket: public read limited to portfolio folders
DROP POLICY IF EXISTS "media public read" ON storage.objects;
CREATE POLICY "media public read" ON storage.objects
  FOR SELECT TO public
  USING (
    bucket_id = 'media'
    AND (
      name LIKE 'image/%' OR name LIKE 'video/%' OR name LIKE 'audio/%' OR name LIKE 'about/%'
    )
  );