
-- 1. Reviews: rewrite the INSERT policy without referencing email, then drop the column.
DROP POLICY IF EXISTS "authenticated submit own review" ON public.reviews;
ALTER TABLE public.reviews DROP COLUMN IF EXISTS email;

CREATE POLICY "authenticated submit own review"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND avatar_url IS NULL
    AND length(name) BETWEEN 1 AND 80
    AND length(message) BETWEEN 1 AND 280
    AND rating BETWEEN 1 AND 5
    AND status = 'pending'
  );

-- 2. Bookings: drop the unvalidated INSERT policy that bypassed length checks.
DROP POLICY IF EXISTS "public can create booking" ON public.bookings;

-- 3. user_roles: drop the duplicate USING-only policy; the lowercase
-- `admins manage roles` already has the correct USING + WITH CHECK.
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

-- Add a restrictive INSERT policy so non-admins can never grant themselves a role.
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
