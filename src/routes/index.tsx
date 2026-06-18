import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SocialIcons } from "@/components/SocialIcons";
import { MediaVideo } from "@/components/MediaVideo";
import { ArrowRight, Camera, Headphones, Film, Palette } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GATEI — Multimedia Creative Director & Production Specialist" },
      { name: "description", content: "Cinematic audio, video, photography and design by GATEI." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Hero />
      <AboutTeaser />
      <ServicesGrid />
      <FeaturedPortfolio />
      <ConnectStrip />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-spot" aria-hidden />
      <div className="container-narrow pt-24 pb-32 md:pt-36 md:pb-44 relative">
        <h1 className="font-display text-[3.2rem] sm:text-7xl md:text-8xl leading-[0.95] text-balance animate-in-rise">
          GATEI
        </h1>
        <p className="mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground animate-in-rise">
          Multimedia Creative Director & Production Specialist —
          shaping sound, image and story from concept to final cut.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 animate-in-rise">
          <Link to="/book" className="uppercase-tracked bg-primary text-primary-foreground px-6 py-3 inline-flex items-center gap-2 hover:opacity-90">
            Book Me <ArrowRight size={16} />
          </Link>
          <Link to="/portfolio" className="uppercase-tracked border border-border px-6 py-3 hover:border-primary hover:text-primary">
            View Work
          </Link>
        </div>
      </div>
      <div className="hairline" />
    </section>
  );
}

function AboutTeaser() {
  return (
    <section className="container-narrow py-24">
      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div>
          <p className="uppercase-tracked text-primary">About</p>
          <h2 className="font-display text-4xl md:text-5xl mt-3 text-balance">
            A studio of one — built for productions of every scale.
          </h2>
        </div>
        <div className="text-muted-foreground leading-relaxed space-y-4">
          <p>
            GATEI is a multimedia creative working across audio engineering,
            cinematography, photography and visual design. From the first
            scribbled concept to the last frame of post, every project is
            handled with intention and craft.
          </p>
          <Link to="/about" className="story-link text-primary uppercase-tracked inline-flex items-center gap-2">
            Read more <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  { icon: Headphones, title: "Audio", text: "Recording, mixing, mastering, sound design, live engineering." },
  { icon: Film, title: "Video", text: "Cinematography, camera ops, editing, post-production." },
  { icon: Camera, title: "Photography", text: "Editorial, portrait, event and brand photography." },
  { icon: Palette, title: "Design & Direction", text: "Creative direction, scriptwriting, casting, graphic design." },
];

function ServicesGrid() {
  return (
    <section className="border-t border-border">
      <div className="container-narrow py-24">
        <div className="flex justify-between items-end mb-12">
          <div>
            <p className="uppercase-tracked text-primary">Services</p>
            <h2 className="font-display text-4xl md:text-5xl mt-3">What I do</h2>
          </div>
          <Link to="/services" className="hidden md:inline uppercase-tracked text-muted-foreground hover:text-primary">
            All services →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
          {SERVICES.map((s) => (
            <div key={s.title} className="bg-background p-8 hover:bg-card transition-colors group">
              <s.icon className="text-primary mb-6 group-hover:scale-110 transition-transform" size={28} />
              <h3 className="font-display text-2xl mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedPortfolio() {
  const [items, setItems] = useState<{ id: string; file_url: string; type: string; title: string | null }[]>([]);
  useEffect(() => {
    supabase
      .from("portfolio_items")
      .select("id,file_url,type,title")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setItems((data as never) ?? []));
  }, []);
  return (
    <section className="border-t border-border">
      <div className="container-narrow py-24">
        <div className="flex justify-between items-end mb-12">
          <div>
            <p className="uppercase-tracked text-primary">Selected Work</p>
            <h2 className="font-display text-4xl md:text-5xl mt-3">Recent frames</h2>
          </div>
          <Link to="/portfolio" className="uppercase-tracked text-muted-foreground hover:text-primary">
            Full portfolio →
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No work uploaded yet — visit the admin panel to add media.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {items.map((it) => (
              <div key={it.id} className="aspect-square bg-card overflow-hidden border border-border">
                {it.type === "image" && (
                  <img src={it.file_url} alt={it.title ?? ""} loading="lazy" decoding="async" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                )}
                {it.type === "video" && (
                  <MediaVideo src={it.file_url} className="h-full [&_video]:h-full [&_video]:object-cover" />
                )}
                {it.type === "audio" && (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <Headphones size={40} className="text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ConnectStrip() {
  return (
    <section className="border-t border-border">
      <div className="container-narrow py-24 text-center">
        <p className="uppercase-tracked text-primary">Connect</p>
        <h2 className="font-display text-4xl md:text-5xl mt-3">Connect with me</h2>
        <div className="mt-8 flex justify-center"><SocialIcons /></div>
      </div>
    </section>
  );
}
