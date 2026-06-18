REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_review_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_grant_admin_for_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.enforce_review_limit() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_grant_admin_for_owner() TO service_role;