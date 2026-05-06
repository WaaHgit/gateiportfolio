-- Restore EXECUTE on has_role to authenticated/anon so RLS policies that call it work.
-- Trigger functions (enforce_review_limit, auto_grant_admin_for_owner) stay locked down
-- since they only need to run as the table owner via the trigger.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
