CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER POLICY "admins modify settings" ON public.app_settings
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "admins read settings" ON public.app_settings
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins delete bookings" ON public.bookings
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "admins update bookings" ON public.bookings
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "admins view bookings" ON public.bookings
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins manage media" ON public.media
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins read events" ON public.page_events
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins manage portfolio" ON public.portfolio_items
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins manage reviews" ON public.reviews
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins manage social links" ON public.social_links
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Only admins can insert roles" ON public.user_roles
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "admins manage roles" ON public.user_roles
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins subscribe sensitive topics" ON realtime.messages
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "admins delete media" ON storage.objects
  USING ((bucket_id = 'media'::text) AND private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "admins update media" ON storage.objects
  USING ((bucket_id = 'media'::text) AND private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "admins upload media" ON storage.objects
  WITH CHECK ((bucket_id = 'media'::text) AND private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "media admin delete" ON storage.objects
  USING ((bucket_id = 'media'::text) AND private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "media admin insert" ON storage.objects
  WITH CHECK ((bucket_id = 'media'::text) AND private.has_role(auth.uid(), 'admin'::public.app_role));
ALTER POLICY "media admin update" ON storage.objects
  USING ((bucket_id = 'media'::text) AND private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK ((bucket_id = 'media'::text) AND private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);