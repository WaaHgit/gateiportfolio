import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — GATEI Admin" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) navigate({ to: "/admin" });
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else navigate({ to: "/admin" });
  }

  async function signInGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/admin",
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/admin" });
  }

  return (
    <section className="container-narrow py-24 max-w-md">
      <p className="uppercase-tracked text-primary">Admin</p>
      <h1 className="font-display text-4xl mt-3">Sign in</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Restricted access. Only authorized accounts can manage content.
      </p>
      <form onSubmit={signIn} className="mt-10 space-y-5">
        <label className="block">
          <span className="uppercase-tracked text-muted-foreground">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
          />
        </label>
        <label className="block">
          <span className="uppercase-tracked text-muted-foreground">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full uppercase-tracked bg-primary text-primary-foreground py-3 disabled:opacity-50"
        >
          {busy ? "…" : "Sign in"}
        </button>
      </form>

      <div className="my-8 flex items-center gap-4">
        <div className="flex-1 hairline" />
        <span className="text-xs uppercase-tracked text-muted-foreground">or</span>
        <div className="flex-1 hairline" />
      </div>

      <button
        onClick={signInGoogle}
        disabled={busy}
        className="w-full uppercase-tracked border border-border hover:border-primary py-3 disabled:opacity-50"
      >
        Continue with Google
      </button>

      <p className="text-xs text-muted-foreground mt-8">
        Sign-ups are disabled. The first admin must be created manually — see setup notes.
      </p>
    </section>
  );
}
