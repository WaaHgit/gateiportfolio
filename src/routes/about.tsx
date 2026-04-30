import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <section className="container-narrow py-24">
      <p className="uppercase-tracked text-primary">About</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3 text-balance">
        MULTIMEDIA POWERHOUSE
      </h1>
      <div className="mt-12 grid md:grid-cols-[1fr_2fr] gap-12">
        <div className="aspect-[3/4] bg-card border border-border bg-spot" aria-hidden />
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
