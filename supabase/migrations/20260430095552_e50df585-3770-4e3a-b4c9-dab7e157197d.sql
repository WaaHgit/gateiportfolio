
-- 1. Update email social link & hide portfolio
UPDATE public.social_links SET url = 'mailto:projectfilesav@gmail.com' WHERE platform = 'email';
UPDATE public.social_links SET is_visible = false WHERE platform = 'portfolio';

-- 2. Trigger: auto-grant admin to desheriffV653@gmail.com on signup
CREATE OR REPLACE FUNCTION public.auto_grant_admin_for_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = lower('desheriffV653@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_admin_for_owner();

-- 3. If the owner has already signed up, grant immediately
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = lower('desheriffV653@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
