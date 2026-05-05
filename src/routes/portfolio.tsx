import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Headphones, X } from "lucide-react";
import { FadeInOnScroll } from "@/components/FadeInOnScroll";
import { MediaVideo } from "@/components/MediaVideo";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — GATEI" },
      { name: "description", content: "Selected multimedia work by GATEI — photography, video, audio and graphics." },
    ],
  }),
  component: PortfolioPage,
});

type Item = {
  id: string;
  file_url: string;
  type: "image" | "video" | "audio";
  category: "audio" | "video" | "graphics" | "photography";
  title: string | null;
  description: string | null;
};

const CATEGORIES = ["all", "photography", "video", "audio", "graphics"] as const;
type Cat = (typeof CATEGORIES)[number];

function PortfolioPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [cat, setCat] = useState<Cat>("all");
  const [active, setActive] = useState<Item | null>(null);

  useEffect(() => {
    const load = () => {
      supabase
        .from("portfolio_items")
        .select("id,file_url,type,category,title,description")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .then(({ data }) => setItems((data as Item[]) ?? []));
    };
    load();
    const ch = supabase
      .channel("public-portfolio")
      .on("postgres_changes", { event: "*", schema: "public", table: "portfolio_items" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(
    () => (cat === "all" ? items : items.filter((i) => i.category === cat)),
    [items, cat]
  );

  return (
    <section className="container-narrow py-24">
      <p className="uppercase-tracked text-primary">Portfolio</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3">Selected work</h1>

      <div className="mt-10 flex flex-wrap gap-2 border-b border-border pb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`uppercase-tracked px-3 py-2 transition-colors ${
              cat === c ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground mt-16 text-sm">No items in this category yet.</p>
      ) : (
        <div className="mt-8 columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
          {filtered.map((it, idx) => (
            <FadeInOnScroll key={it.id} delay={Math.min(idx * 40, 300)} className="mb-3 break-inside-avoid">
              <button
                onClick={() => setActive(it)}
                className="group relative w-full overflow-hidden border border-border bg-card text-left block"
              >
                {it.type === "image" && (
                  <img
                    src={it.file_url}
                    alt={it.title ?? ""}
                    loading="lazy"
                    className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-700"
                  />
                )}
                {it.type === "video" && (
                  <div className="aspect-video">
                    <MediaVideo src={it.file_url} autoPreview className="w-full h-full" />
                  </div>
                )}
                {it.type === "audio" && (
                  <div className="aspect-square w-full flex flex-col items-center justify-center bg-secondary gap-2">
                    <Headphones size={36} className="text-primary" />
                    <span className="text-xs uppercase-tracked text-muted-foreground">{it.title ?? "Audio"}</span>
                  </div>
                )}
                {it.title && (
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-display text-lg text-white">{it.title}</span>
                  </div>
                )}
              </button>
            </FadeInOnScroll>
          ))}
        </div>
      )}

      {active && <Lightbox item={active} onClose={() => setActive(null)} />}
    </section>
  );
}

function Lightbox({ item, onClose }: { item: Item; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in-fade" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white" onClick={onClose} aria-label="Close"><X size={28} /></button>
      <div className="max-w-6xl w-full max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {item.type === "image" && <img src={item.file_url} alt={item.title ?? ""} className="max-h-[80vh] w-auto object-contain" />}
        {item.type === "video" && (
          <div className="w-full max-w-5xl aspect-video">
            <MediaVideo src={item.file_url} className="w-full h-full" />
          </div>
        )}
        {item.type === "audio" && (
          <div className="w-full max-w-2xl bg-card p-8 border border-border">
            <Headphones size={40} className="text-primary mb-4" />
            <h3 className="font-display text-2xl">{item.title ?? "Audio track"}</h3>
            <audio src={item.file_url} controls className="w-full mt-6" />
          </div>
        )}
        {(item.title || item.description) && (
          <div className="mt-4 text-center">
            {item.title && <h3 className="font-display text-2xl text-white">{item.title}</h3>}
            {item.description && <p className="text-sm text-white/70 mt-1 max-w-2xl">{item.description}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
