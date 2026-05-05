import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — GATEI" },
      { name: "description", content: "About GATEI — multimedia creative director and production specialist." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("key,value")
      .in("key", ["public_about_photo_1", "public_about_photo_2"])
      .then(({ data }) => {
        const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
        setPhoto1(map.get("public_about_photo_1") || null);
        setPhoto2(map.get("public_about_photo_2") || null);
      });
    const t = setTimeout(() => setReveal(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="container-narrow py-24 overflow-hidden">
      <p className="uppercase-tracked text-primary">About</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3 text-balance">
        MULTIMEDIA POWERHOUSE
      </h1>

      {/* Cinematic two-photo reveal */}
      <div className="mt-16 grid md:grid-cols-12 gap-6 md:gap-8 items-end">
        <figure
          className={`md:col-span-7 relative aspect-[4/5] overflow-hidden bg-card border border-border transition-all ease-out`}
          style={{
            transitionDuration: "2200ms",
            opacity: reveal && photo1 ? 1 : 0,
            transform: reveal ? "translateY(0) scale(1)" : "translateY(40px) scale(1.04)",
          }}
        >
          {photo1 ? (
            <img
              src={photo1}
              alt="GATEI portrait"
              className="w-full h-full object-cover"
              style={{
                transition: "transform 12s ease-out",
                transform: reveal ? "scale(1.05)" : "scale(1)",
              }}
            />
          ) : (
            <div className="w-full h-full bg-spot" aria-hidden />
          )}
        </figure>

        <figure
          className={`md:col-span-5 relative aspect-[3/4] overflow-hidden bg-card border border-border md:translate-y-12 transition-all ease-out`}
          style={{
            transitionDuration: "2600ms",
            transitionDelay: "600ms",
            opacity: reveal && photo2 ? 1 : 0,
            transform: reveal
              ? "translateY(3rem) scale(1)"
              : "translateY(60px) scale(1.04)",
          }}
        >
          {photo2 ? (
            <img
              src={photo2}
              alt="GATEI at work"
              className="w-full h-full object-cover"
              style={{
                transition: "transform 14s ease-out",
                transform: reveal ? "scale(1.06)" : "scale(1)",
              }}
            />
          ) : (
            <div className="w-full h-full bg-spot" aria-hidden />
          )}
        </figure>
      </div>

      <div className="mt-24 grid md:grid-cols-[1fr_2fr] gap-12">
        <div className="hairline self-start mt-3 hidden md:block" aria-hidden />
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>
            GATEI is a multimedia creative director and production specialist
            with a hand in every phase of a production — concept and
            scripting, casting and crew, recording and shooting, editing and
            mastering.
          </p>
          <p>
            With deep experience across audio engineering, cinematography and
            visual design, GATEI delivers consistency from first sketch to
            final delivery — whether the canvas is a brand film, a record, a
            live event or a print campaign.
          </p>
          <p>
            Available for commissions, collaborations and consulting.
          </p>
        </div>
      </div>
    </section>
  );
}
