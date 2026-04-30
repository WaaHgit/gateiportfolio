import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Music2, Youtube, Globe, Mail, MessageCircle } from "lucide-react";

type Link = { platform: string; label: string; url: string; is_visible: boolean };

const SAFE_PROTOCOLS = /^(https?:\/\/|mailto:|tel:|#)/i;
function safeHref(url: string | null | undefined): string {
  if (!url) return "#";
  return SAFE_PROTOCOLS.test(url) ? url : "#";
}

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  portfolio: Globe,
  email: Mail,
  whatsapp: MessageCircle,
};

export function SocialIcons({ size = 20 }: { size?: number }) {
  const [links, setLinks] = useState<Link[]>([]);
  useEffect(() => {
    supabase
      .from("social_links")
      .select("platform,label,url,is_visible")
      .eq("is_visible", true)
      .order("sort_order")
      .then(({ data }) => setLinks((data as Link[]) ?? []));
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
        return (
          <li key={l.platform}>
            <a
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              aria-label={l.label}
              title={l.label}
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
