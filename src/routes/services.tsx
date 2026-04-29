import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — GATEI" },
      { name: "description", content: "Pre-production, production (audio & video), and post — full multimedia production by GATEI." },
    ],
  }),
  component: ServicesPage,
});

const GROUPS = [
  {
    label: "Pre-Production",
    items: [
      "Concept development & creative direction",
      "Scriptwriting & content structuring",
      "Casting",
      "Crew & equipment sourcing",
    ],
  },
  {
    label: "Production · Audio",
    items: [
      "Recording (studio & on-location)",
      "Editing, processing, enhancement",
      "Mixing & mastering",
      "Live sound engineering",
      "Equipment consulting",
      "Sound design & storytelling",
    ],
  },
  {
    label: "Production · Video",
    items: [
      "Videography & cinematography",
      "Camera operation",
      "Editing & post-production",
      "Equipment setup",
    ],
  },
  {
    label: "Additional",
    items: ["Directing", "Graphic Design"],
  },
];

function ServicesPage() {
  return (
    <section className="container-narrow py-24">
      <p className="uppercase-tracked text-primary">Services</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3 text-balance">
        Full-spectrum multimedia production.
      </h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Engaged as a director, producer or specialist — at any phase of the pipeline.
      </p>

      <div className="mt-16 space-y-16">
        {GROUPS.map((g) => (
          <div key={g.label} className="grid md:grid-cols-[260px_1fr] gap-8 border-t border-border pt-8">
            <div>
              <h2 className="font-display text-3xl">{g.label}</h2>
            </div>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {g.items.map((it) => (
                <li key={it} className="flex gap-3 text-sm">
                  <span className="text-primary mt-[2px]">—</span>
                  <span className="text-muted-foreground">{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-20 flex flex-wrap gap-4">
        <Link to="/book" className="uppercase-tracked bg-primary text-primary-foreground px-6 py-3">Book a project</Link>
        <Link to="/portfolio" className="uppercase-tracked border border-border px-6 py-3 hover:border-primary hover:text-primary">See work</Link>
      </div>
    </section>
  );
}
