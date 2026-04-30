-- 1. Portfolio status (draft vs published)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='portfolio_items' AND column_name='status') THEN
    ALTER TABLE public.portfolio_items ADD COLUMN status text NOT NULL DEFAULT 'published';
    ALTER TABLE public.portfolio_items ADD CONSTRAINT portfolio_items_status_check CHECK (status IN ('draft','published'));
  END IF;
END $$;

-- Replace public read policy so only published items are visible
DROP POLICY IF EXISTS "public can view portfolio" ON public.portfolio_items;
CREATE POLICY "public can view published portfolio"
  ON public.portfolio_items
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Admins keep full access via existing "admins manage portfolio" ALL policy.

-- 2. Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  avatar_url text,
  message text NOT NULL,
  rating int NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT reviews_status_check CHECK (status IN ('pending','approved','rejected')),
  CONSTRAINT reviews_name_len CHECK (length(name) BETWEEN 1 AND 80),
  CONSTRAINT reviews_message_len CHECK (length(message) BETWEEN 1 AND 280),
  CONSTRAINT reviews_email_len CHECK (email IS NULL OR length(email) <= 320)
);

CREATE INDEX IF NOT EXISTS reviews_status_created_idx ON public.reviews (status, created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can submit review" ON public.reviews;
CREATE POLICY "anyone can submit review"
  ON public.reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 80
    AND length(message) BETWEEN 1 AND 280
    AND rating BETWEEN 1 AND 5
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "public can view approved reviews" ON public.reviews;
CREATE POLICY "public can view approved reviews"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

DROP POLICY IF EXISTS "admins manage reviews" ON public.reviews;
CREATE POLICY "admins manage reviews"
  ON public.reviews
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));