import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Headphones } from "lucide-react";

export const Route = createFileRoute("/audio")({
  head: () => ({
    meta: [
      { title: "Audio — GATEI" },
      { name: "description", content: "Listen to selected audio work — recording, mixing and sound design by GATEI." },
    ],
  }),
  component: AudioPage,
});

type Track = { id: string; file_url: string; title: string | null; description: string | null };

function AudioPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  useEffect(() => {
    supabase
      .from("portfolio_items")
      .select("id,file_url,title,description")
      .eq("type", "audio")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTracks((data as Track[]) ?? []));
  }, []);
  return (
    <section className="container-narrow py-24">
      <p className="uppercase-tracked text-primary">Audio</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3">Listening room</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        A selection of tracks, scores and sound design pieces — uncompressed, exactly as delivered.
      </p>

      {tracks.length === 0 ? (
        <p className="text-muted-foreground mt-16 text-sm">No tracks uploaded yet.</p>
      ) : (
        <div className="mt-12 space-y-4">
          {tracks.map((t) => (
            <article key={t.id} className="border border-border bg-card p-6 flex flex-col md:flex-row md:items-center gap-6 hover:border-primary transition-colors">
              <div className="flex items-center gap-4 md:w-72 flex-shrink-0">
                <div className="w-12 h-12 flex items-center justify-center border border-border text-primary">
                  <Headphones size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-xl truncate">{t.title ?? "Untitled track"}</h3>
                  {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                </div>
              </div>
              <audio src={t.file_url} controls className="w-full" />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
