
-- Drop legacy policies FIRST (they reference legacy columns)
DROP POLICY IF EXISTS "Public can view approved reviews (no email)" ON public.reviews;
DROP POLICY IF EXISTS "authenticated submit own review" ON public.reviews;
DROP POLICY IF EXISTS "admins manage reviews" ON public.reviews;
DROP POLICY IF EXISTS "public reads approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "anyone submits a review" ON public.reviews;
DROP POLICY IF EXISTS "admins read all reviews" ON public.reviews;
DROP POLICY IF EXISTS "admins update reviews" ON public.reviews;
DROP POLICY IF EXISTS "admins delete reviews" ON public.reviews;

-- 1) New columns
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS review_text text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS "position" text,
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS submission_date timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2) Backfill from legacy columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='name') THEN
    EXECUTE 'UPDATE public.reviews SET client_name = COALESCE(client_name, name) WHERE client_name IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='message') THEN
    EXECUTE 'UPDATE public.reviews SET review_text = COALESCE(review_text, message) WHERE review_text IS NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='avatar_url') THEN
    EXECUTE 'UPDATE public.reviews SET profile_image_url = COALESCE(profile_image_url, avatar_url)';
  END IF;
END$$;

UPDATE public.reviews SET
  submission_date = COALESCE(submission_date, created_at),
  updated_at = COALESCE(updated_at, created_at),
  approved_at = CASE WHEN status='approved' AND approved_at IS NULL THEN created_at ELSE approved_at END,
  rejected_at = CASE WHEN status='rejected' AND rejected_at IS NULL THEN created_at ELSE rejected_at END;

-- 3) Drop legacy columns
ALTER TABLE public.reviews
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS message,
  DROP COLUMN IF EXISTS avatar_url;

-- 4) Constraints / defaults
ALTER TABLE public.reviews
  ALTER COLUMN client_name SET NOT NULL,
  ALTER COLUMN review_text SET NOT NULL,
  ALTER COLUMN submission_date SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN author_id DROP NOT NULL;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_status_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_status_check
  CHECK (status IN ('pending','approved','rejected','archived'));

-- 5) Drop old author-based enforce trigger
DROP TRIGGER IF EXISTS enforce_review_limit ON public.reviews;

-- 6) updated_at trigger
CREATE OR REPLACE FUNCTION public.reviews_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END$$;

DROP TRIGGER IF EXISTS reviews_touch_updated_at ON public.reviews;
CREATE TRIGGER reviews_touch_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_touch_updated_at();

-- 7) Force safe defaults on public inserts
CREATE OR REPLACE FUNCTION public.reviews_force_pending_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT COALESCE(private.has_role(auth.uid(), 'admin'::app_role), false) THEN
    NEW.status := 'pending';
    NEW.approved_at := NULL;
    NEW.rejected_at := NULL;
    NEW.archived_at := NULL;
    NEW.deleted_at := NULL;
    NEW.submission_date := now();
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS reviews_force_pending_on_insert ON public.reviews;
CREATE TRIGGER reviews_force_pending_on_insert
BEFORE INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_force_pending_on_insert();

-- 8) Status change timestamp trigger
CREATE OR REPLACE FUNCTION public.reviews_stamp_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN NEW.approved_at := now();
    ELSIF NEW.status = 'rejected' THEN NEW.rejected_at := now();
    ELSIF NEW.status = 'archived' THEN NEW.archived_at := now();
    END IF;
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS reviews_stamp_status_change ON public.reviews;
CREATE TRIGGER reviews_stamp_status_change
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.reviews_stamp_status_change();

-- 9) New RLS policies
CREATE POLICY "public reads approved reviews"
ON public.reviews FOR SELECT
TO anon, authenticated
USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "admins read all reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "anyone submits a review"
ON public.reviews FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(client_name)) BETWEEN 1 AND 120
  AND length(btrim(review_text)) BETWEEN 10 AND 2000
  AND rating BETWEEN 1 AND 5
);

CREATE POLICY "admins update reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

-- 10) Grants
GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

-- 11) Indexes
CREATE INDEX IF NOT EXISTS reviews_status_created_idx ON public.reviews (status, submission_date DESC);
CREATE INDEX IF NOT EXISTS reviews_approved_idx ON public.reviews (approved_at DESC) WHERE status = 'approved' AND deleted_at IS NULL;
