DO $$
DECLARE
  _owner uuid;
BEGIN
  SELECT user_id INTO _owner
  FROM public.user_roles
  WHERE role = 'admin'::public.app_role
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF _owner IS NOT NULL THEN
    UPDATE public.reviews
    SET author_id = _owner
    WHERE author_id IS NULL;
  END IF;
END $$;

ALTER TABLE public.reviews
  ALTER COLUMN author_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS reviews_author_id_idx ON public.reviews(author_id);
CREATE INDEX IF NOT EXISTS reviews_status_created_idx ON public.reviews(status, created_at DESC);

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

  SELECT count(*) INTO cnt
  FROM public.reviews
  WHERE author_id = NEW.author_id;

  IF cnt >= 2 THEN
    RAISE EXCEPTION 'Review limit reached: each account can submit a maximum of 2 reviews.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_enforce_limit ON public.reviews;
CREATE TRIGGER reviews_enforce_limit
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_review_limit();

ALTER TABLE public.reviews REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  END IF;
END $$;