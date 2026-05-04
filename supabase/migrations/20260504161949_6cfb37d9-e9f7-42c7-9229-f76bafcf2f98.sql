-- Restrict Realtime channel subscriptions to admins for sensitive topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins subscribe sensitive topics" ON realtime.messages;
CREATE POLICY "admins subscribe sensitive topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Validate avatar_url for authenticated review submissions
DROP POLICY IF EXISTS "authenticated can submit review with email" ON public.reviews;
CREATE POLICY "authenticated can submit review with email"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (
  length(name) BETWEEN 1 AND 80
  AND length(message) BETWEEN 1 AND 280
  AND rating BETWEEN 1 AND 5
  AND status = 'pending'
  AND (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
  AND (avatar_url IS NULL OR avatar_url ~* '^https://[a-z0-9.-]+/')
);

-- Also enforce at column level via CHECK constraint
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_avatar_url_https;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_avatar_url_https
  CHECK (avatar_url IS NULL OR avatar_url ~* '^https://[a-z0-9.-]+/');