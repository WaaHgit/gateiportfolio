import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { getVisibleSocialLinks } from "@/components/SocialIcons";

export function WhatsAppFab() {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    getVisibleSocialLinks().then((links) => {
      const data = links.find((link) => link.platform === "whatsapp");
      if (!data?.url || data.url === "#") return;
      const href = data.url.startsWith("http")
        ? data.url
        : `https://wa.me/${data.url.replace(/[^\d]/g, "")}`;
      if (!/^https?:\/\//i.test(href)) return;
      setUrl(href);
    });
  }, []);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-glow hover:scale-110 transition-transform"
    >
      <MessageCircle size={24} />
    </a>
  );
}
