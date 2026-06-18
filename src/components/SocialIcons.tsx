import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Instagram, Music2, Youtube, Globe, Mail, MessageCircle,
  Linkedin, Facebook,
} from "lucide-react";
import { track } from "@/lib/track";

export type SocialLink = { platform: string; label: string; url: string; is_visible: boolean };

let visibleLinksPromise: Promise<SocialLink[]> | null = null;

export function getVisibleSocialLinks(): Promise<SocialLink[]> {
  if (!visibleLinksPromise) {
    visibleLinksPromise = Promise.resolve(
      supabase
        .from("social_links")
        .select("platform,label,url,is_visible")
        .eq("is_visible", true)
        .order("sort_order")
    )
      .then(({ data }) => (data as SocialLink[]) ?? [])
      .catch(() => []);
  }

  return visibleLinksPromise;
}

const SAFE_PROTOCOLS = /^(https?:\/\/|mailto:|tel:|#)/i;
function safeHref(url: string | null | undefined): string {
  if (!url) return "#";
  return SAFE_PROTOCOLS.test(url) ? url : "#";
}

// Inline X (Twitter) and Spotify glyphs (lucide doesn't ship them)
const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.797l-5.32-6.59L4.8 22H1.54l8.02-9.16L1 2h6.91l4.78 5.99L18.244 2zm-1.19 18h1.86L7.05 4H5.07l11.984 16z" />
  </svg>
);
const SpotifyIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.32a.75.75 0 0 1-1.03.25c-2.83-1.73-6.4-2.12-10.6-1.16a.75.75 0 1 1-.34-1.46c4.6-1.05 8.55-.6 11.72 1.34.36.22.47.69.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.24-1.99-8.18-2.57-12.01-1.4a.94.94 0 1 1-.55-1.79c4.39-1.34 9.83-.69 13.55 1.59.44.27.58.85.3 1.29zm.13-3.4C15.27 8.49 8.99 8.27 5.39 9.36a1.12 1.12 0 1 1-.65-2.15c4.13-1.25 11.06-1 15.36 1.55a1.12 1.12 0 1 1-1.16 1.92z" />
  </svg>
);

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  portfolio: Globe,
  email: Mail,
  whatsapp: MessageCircle,
  linkedin: Linkedin,
  facebook: Facebook,
  x: XIcon,
  spotify: SpotifyIcon,
};

export function SocialIcons({ size = 20 }: { size?: number }) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  useEffect(() => {
    getVisibleSocialLinks().then(setLinks);
  }, []);
  return (
    <ul className="flex flex-wrap gap-3">
      {links.map((l) => {
        const Icon = ICONS[l.platform] ?? Globe;
        const isWhats = l.platform === "whatsapp";
        const rawHref = isWhats && l.url && !l.url.startsWith("http") && !l.url.startsWith("#")
          ? `https://wa.me/${l.url.replace(/[^\d]/g, "")}`
          : l.url;
        const href = safeHref(rawHref);
        const isExternal = href.startsWith("http");
        return (
          <li key={l.platform}>
            <a
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer external" : undefined}
              aria-label={l.label}
              title={l.label}
              onClick={() => void track({ kind: "link_click", platform: l.platform, label: l.label })}
              className="flex items-center justify-center w-10 h-10 border border-border hover:border-primary hover:text-primary transition-colors"
            >
              <Icon size={size} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
