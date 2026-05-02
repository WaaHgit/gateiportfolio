import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { track } from "@/lib/track";

export function PageViewTracker() {
  const loc = useLocation();
  useEffect(() => {
    void track({ kind: "page_view", path: loc.pathname });
  }, [loc.pathname]);
  return null;
}
