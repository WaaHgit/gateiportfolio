DROP TABLE IF EXISTS public.reviews CASCADE;
DROP FUNCTION IF EXISTS public.enforce_review_limit() CASCADE;
DROP FUNCTION IF EXISTS public.reviews_force_pending_on_insert() CASCADE;
DROP FUNCTION IF EXISTS public.reviews_stamp_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.reviews_touch_updated_at() CASCADE;
DROP TYPE IF EXISTS public.review_status CASCADE;

CREATE TYPE public.review_status AS ENUM ('pending', 'live', 'archived');

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  client_name text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text text NOT NULL CHECK (char_length(btrim(review_text)) BETWEEN 10 AND 1000),
  status public.review_status NOT NULL DEFAULT 'pending',
  edit_count smallint NOT NULL DEFAULT 0 CHECK (edit_count >= 0 AND edit_count <= 1),
  is_edited boolean NOT NULL DEFAULT false,
  edit_token text,
  edit_token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  archived_at timestamptz,
  status_history jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE UNIQUE INDEX idx_reviews_email_unique ON public.reviews (lower(btrim(email)));
CREATE INDEX idx_reviews_status ON public.reviews (status);

GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read live reviews"
ON public.reviews FOR SELECT TO anon, authenticated
USING (status = 'live');

CREATE POLICY "anyone can insert a pending review"
ON public.reviews FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND edit_count = 0
  AND is_edited = false
  AND edit_token IS NULL
  AND char_length(btrim(client_name)) BETWEEN 1 AND 120
  AND char_length(btrim(email)) BETWEEN 3 AND 320
);

CREATE POLICY "admins full access reviews"
ON public.reviews FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.handle_review_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_history := COALESCE(OLD.status_history, '[]'::jsonb) ||
      jsonb_build_object('from', OLD.status, 'to', NEW.status, 'at', now());
    IF NEW.status = 'live' THEN
      NEW.approved_at := now();
    ELSIF NEW.status = 'archived' THEN
      NEW.archived_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_status_change
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.handle_review_status_change();

REVOKE ALL ON FUNCTION public.handle_review_status_change() FROM PUBLIC, anon, authenticated;