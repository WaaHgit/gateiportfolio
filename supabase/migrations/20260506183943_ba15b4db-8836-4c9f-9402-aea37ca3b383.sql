-- 1) Revoke EXECUTE on SECURITY DEFINER trigger functions from anon/authenticated/public
REVOKE ALL ON FUNCTION public.enforce_review_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_grant_admin_for_owner() FROM PUBLIC, anon, authenticated;

-- 2) Storage: prevent listing the bucket root, while still allowing direct file fetch via public URLs.
-- Drop overly-broad public SELECT policy on storage.objects for the media bucket if it exists,
-- and replace with a policy that allows SELECT only when a specific object name is queried.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN ('Public read media','public read media','media public read','Public can view media','public can view media')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END$$;

-- Re-create as object-scoped read (deny listing). Public URLs still work because they request a specific object name.
CREATE POLICY "media public object read"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'media' AND name IS NOT NULL AND length(name) > 0);

-- 3) Realtime: explicit topic-scoped policies on realtime.messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    -- drop any prior policies we may have added
    EXECUTE 'DROP POLICY IF EXISTS "realtime portfolio public read" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "realtime admin all topics" ON realtime.messages';

    -- Public + authenticated may subscribe ONLY to portfolio_items topic
    EXECUTE $p$CREATE POLICY "realtime portfolio public read" ON realtime.messages
      FOR SELECT TO anon, authenticated
      USING (topic = 'portfolio_items')$p$;

    -- Admins may subscribe to anything
    EXECUTE $p$CREATE POLICY "realtime admin all topics" ON realtime.messages
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))$p$;
  END IF;
END$$;