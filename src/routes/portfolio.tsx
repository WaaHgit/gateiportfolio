import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Headphones, X } from "lucide-react";

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
    supabase
      .from("portfolio_items")
      .select("id,file_url,type,category,title,description")
      .order("sort_order")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data as Item[]) ?? []));
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
        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-2">
          {filtered.map((it) => (
            <button
              key={it.id}
              onClick={() => setActive(it)}
              className="group relative aspect-square overflow-hidden border border-border bg-card text-left"
            >
              {it.type === "image" && (
                <img src={it.file_url} alt={it.title ?? ""} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              )}
              {it.type === "video" && (
                <video src={it.file_url} muted playsInline loop autoPlay className="w-full h-full object-cover" />
              )}
              {it.type === "audio" && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-secondary gap-2">
                  <Headphones size={36} className="text-primary" />
                  <span className="text-xs uppercase-tracked text-muted-foreground">{it.title ?? "Audio"}</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="font-display text-lg text-white">{it.title ?? ""}</span>
              </div>
            </button>
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
        {item.type === "video" && <video src={item.file_url} controls autoPlay className="max-h-[80vh] w-auto" />}
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
