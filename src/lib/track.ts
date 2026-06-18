import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "gatei_session_id";

function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

type Payload = {
  kind: "page_view" | "link_click";
  path?: string | null;
  platform?: string | null;
  label?: string | null;
};

export async function track(p: Payload) {
  if (typeof window === "undefined") return;
  if (p.kind === "page_view" && "requestIdleCallback" in window) {
    window.requestIdleCallback(() => void sendTrack(p), { timeout: 2500 });
    return;
  }

  await sendTrack(p);
}

async function sendTrack(p: Payload) {
  try {
    await supabase.from("page_events").insert({
      kind: p.kind,
      path: (p.path ?? window.location.pathname).slice(0, 500),
      platform: p.platform ?? null,
      label: p.label ?? null,
      referrer: document.referrer ? document.referrer.slice(0, 500) : null,
      session_id: sessionId(),
      user_agent: navigator.userAgent.slice(0, 400),
    });
  } catch {
    // silent
  }
}
