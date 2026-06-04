import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { supabase as browserSupabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const attachAuthHeader = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await browserSupabase.auth.getSession();
  const token = data.session?.access_token;
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([attachAuthHeader, requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const { data, error } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Admin status lookup failed", {
          userId,
          code: error.code,
          message: error.message,
        });
        return { admin: false, error: "Unable to verify admin access right now." };
      }

      return { admin: !!data, error: null };
    } catch (error) {
      console.error("Unexpected admin status error", error);
      return { admin: false, error: "Unable to verify admin access right now." };
    }
  });
