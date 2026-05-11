import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Headphones, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

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
        <div className="mt-8 columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
          {filtered.map((it, idx) => (
            <FadeInOnScroll key={it.id} delay={Math.min(idx * 40, 300)} className="mb-3 break-inside-avoid">
              <button
                onClick={() => setActiveIdx(idx)}
                className="group relative w-full overflow-hidden border border-border bg-card text-left block media-rise"
              >
                {it.type === "image" && (
                  <img
                    src={it.file_url}
                    alt={it.title ?? ""}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto block group-hover:scale-[1.02] transition-transform duration-700"
                  />
                )}
                {it.type === "video" && (
                  // Natural aspect — letterbox if needed, never crop portrait clips
                  <div className="bg-black">
                    <MediaVideo src={it.file_url} autoPreview contain className="w-full" />
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

      {activeIdx !== null && filtered[activeIdx] && (
        <Lightbox
          items={filtered}
          index={activeIdx}
          onIndex={setActiveIdx}
          onClose={() => setActiveIdx(null)}
        />
      )}
    </section>
  );
}

function Lightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: Item[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const item = items[index];
  const touchStart = useRef<number | null>(null);

  const next = useCallback(() => onIndex((index + 1) % items.length), [index, items.length, onIndex]);
  const prev = useCallback(() => onIndex((index - 1 + items.length) % items.length), [index, items.length, onIndex]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, next, prev]);

  function onTouchStart(e: React.TouchEvent) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    touchStart.current = null;
  }

  // Cap dot count for very large galleries
  const maxDots = 12;
  const dotItems = items.length <= maxDots
    ? items.map((_, i) => i)
    : (() => {
        const half = Math.floor(maxDots / 2);
        let start = Math.max(0, index - half);
        const end = Math.min(items.length, start + maxDots);
        start = Math.max(0, end - maxDots);
        return Array.from({ length: end - start }, (_, k) => start + k);
      })();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in-fade"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button className="absolute top-4 right-4 text-white z-10" onClick={onClose} aria-label="Close"><X size={28} /></button>

      {items.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous"
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 backdrop-blur border border-white/30 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next"
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 backdrop-blur border border-white/30 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}

      <div
        key={item.id}
        className="max-w-6xl w-full max-h-[88vh] flex flex-col items-center animate-in-fade"
        onClick={(e) => e.stopPropagation()}
      >
        {item.type === "image" && (
          <img
            src={item.file_url}
            alt={item.title ?? ""}
            className="max-h-[78vh] max-w-full w-auto h-auto object-contain"
          />
        )}
        {item.type === "video" && (
          <div className="w-full max-w-5xl max-h-[78vh] flex items-center justify-center">
            <MediaVideo src={item.file_url} contain className="max-h-[78vh] w-full" />
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
          <div className="mt-4 text-center px-4">
            {item.title && <h3 className="font-display text-2xl text-white">{item.title}</h3>}
            {item.description && <p className="text-sm text-white/70 mt-1 max-w-2xl mx-auto">{item.description}</p>}
          </div>
        )}

        {items.length > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            {dotItems[0] > 0 && <span className="text-white/40 text-xs">…</span>}
            {dotItems.map((i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); onIndex(i); }}
                aria-label={`Go to item ${i + 1}`}
                className={`transition-all rounded-full ${i === index ? "w-2.5 h-2.5 bg-primary" : "w-2 h-2 bg-white/40 hover:bg-white/70"}`}
              />
            ))}
            {dotItems[dotItems.length - 1] < items.length - 1 && <span className="text-white/40 text-xs">…</span>}
            <span className="ml-3 text-white/60 text-xs tabular-nums">{index + 1}/{items.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}
