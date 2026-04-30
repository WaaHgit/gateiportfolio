import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { getAdminStatus } from "@/server/admin.functions";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, user: session?.user ?? null as User | null, loading };
}

export async function isAdmin(userId: string): Promise<boolean> {
  const result = await getAdminStatus({ data: undefined });
  if (result.error) {
    throw new Error(result.error);
  }
  return result.admin && !!userId;
}

export function useIsAdmin() {
  const { user, loading } = useSession();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setAdmin(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const checkAdmin = async (attempt = 0) => {
      try {
        const allowed = await isAdmin(user.id);
        if (cancelled) return;
        setAdmin(allowed);
        setError(null);
      } catch (err) {
        if (cancelled) return;

        if (attempt < 2) {
          setTimeout(() => {
            if (!cancelled) void checkAdmin(attempt + 1);
          }, 600 * (attempt + 1));
          return;
        }

        const message = err instanceof Error ? err.message : "Unable to verify admin access right now.";
        setAdmin(null);
        setError(message);
      }
    };

    setAdmin(null);
    setError(null);
    void checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [user, loading, retryKey]);

  return {
    admin,
    user,
    error,
    retry: () => setRetryKey((value) => value + 1),
    loading: loading || (!!user && admin === null && error === null),
  };
}
