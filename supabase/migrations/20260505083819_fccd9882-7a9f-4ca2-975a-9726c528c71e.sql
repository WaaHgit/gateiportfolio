
-- ============================================================
-- 1. STORAGE: media bucket policies
-- ============================================================
DO $$ BEGIN
  -- public read
  DROP POLICY IF EXISTS "media public read" ON storage.objects;
  CREATE POLICY "media public read" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'media');

  -- admin insert
  DROP POLICY IF EXISTS "media admin insert" ON storage.objects;
  CREATE POLICY "media admin insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

  -- admin update
  DROP POLICY IF EXISTS "media admin update" ON storage.objects;
  CREATE POLICY "media admin update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'))
    WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

  -- admin delete
  DROP POLICY IF EXISTS "media admin delete" ON storage.objects;
  CREATE POLICY "media admin delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
END $$;

-- ============================================================
-- 2. APP_SETTINGS: allow public read for keys prefixed with 'public_'
-- ============================================================
DROP POLICY IF EXISTS "public read public_ settings" ON public.app_settings;
CREATE POLICY "public read public_ settings" ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (key LIKE 'public_%');

-- Seed about-page photo slots (admin will set values)
INSERT INTO public.app_settings (key, value) VALUES
  ('public_about_photo_1', ''),
  ('public_about_photo_2', '')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 3. REVIEWS: add author_id, replace policies, enforce 2-per-user
-- ============================================================
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS author_id uuid;
CREATE INDEX IF NOT EXISTS reviews_author_id_idx ON public.reviews(author_id);

-- Drop old insert policies
DROP POLICY IF EXISTS "anonymous can submit review without email" ON public.reviews;
DROP POLICY IF EXISTS "authenticated can submit review with email" ON public.reviews;

-- New: only authenticated users, must be themselves, status pending
CREATE POLICY "authenticated submit own review"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND email IS NULL
  AND avatar_url IS NULL
  AND length(name) BETWEEN 1 AND 80
  AND length(message) BETWEEN 1 AND 280
  AND rating BETWEEN 1 AND 5
  AND status = 'pending'
);

-- Trigger: max 2 reviews per author_id (lifetime)
CREATE OR REPLACE FUNCTION public.enforce_review_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt int;
BEGIN
  IF NEW.author_id IS NULL THEN
    RAISE EXCEPTION 'author_id required';
  END IF;
  SELECT count(*) INTO cnt FROM public.reviews WHERE author_id = NEW.author_id;
  IF cnt >= 2 THEN
    RAISE EXCEPTION 'Review limit reached: each account can submit a maximum of 2 reviews.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_enforce_limit ON public.reviews;
CREATE TRIGGER reviews_enforce_limit
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.enforce_review_limit();

-- ============================================================
-- 4. SOCIAL_LINKS: seed new platforms (hidden by default)
-- ============================================================
INSERT INTO public.social_links (platform, label, url, is_visible, sort_order) VALUES
  ('linkedin', 'LinkedIn', '#', false, 50),
  ('spotify',  'Spotify',  '#', false, 60),
  ('x',        'X',        '#', false, 70),
  ('facebook', 'Facebook', '#', false, 80)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. BOOKINGS: index for fast conflict checks
-- ============================================================
CREATE INDEX IF NOT EXISTS bookings_event_date_confirmed_idx
  ON public.bookings(event_date)
  WHERE agreement_confirmed = true;
