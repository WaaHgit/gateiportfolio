-- Fix 1: Lock down media table — anyone can read, only admins can write
DROP POLICY IF EXISTS "Allow all access" ON public.media;

CREATE POLICY "public can view media"
  ON public.media FOR SELECT
  USING (true);

CREATE POLICY "admins manage media"
  ON public.media FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Reviews — only allow email when submitter is authenticated (Google sign-in)
DROP POLICY IF EXISTS "Allow safe public insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "anyone can submit review" ON public.reviews;

CREATE POLICY "anonymous can submit review without email"
  ON public.reviews FOR INSERT
  TO anon
  WITH CHECK (
    email IS NULL
    AND avatar_url IS NULL
    AND length(name) BETWEEN 1 AND 80
    AND length(message) BETWEEN 1 AND 280
    AND rating BETWEEN 1 AND 5
    AND status = 'pending'
  );

CREATE POLICY "authenticated can submit review with email"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 80
    AND length(message) BETWEEN 1 AND 280
    AND rating BETWEEN 1 AND 5
    AND status = 'pending'
    AND (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
  );