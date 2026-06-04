import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { submitBooking } from "@/lib/booking-notify.functions";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book GATEI" },
      { name: "description", content: "Book GATEI for your next multimedia production." },
    ],
  }),
  component: BookPage,
});

const SERVICES = [
  "Audio — Recording / Mixing / Mastering",
  "Audio — Live Sound Engineering",
  "Audio — Sound Design",
  "Video — Cinematography",
  "Video — Editing / Post-production",
  "Photography",
  "Graphic Design",
  "Creative Direction",
  "Full Production (Pre + Pro + Post)",
  "Other",
];

const schema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().email("A valid email is required").max(320),
  phone: z.string().trim().min(3, "Phone number is required").max(50),
  service: z.string().trim().min(1, "Pick a service").max(200),
  description: z.string().trim().min(10, "Project description is required (min 10 characters)").max(5000),
  preferred_date: z.string().min(1, "Preferred date is required"),
});

function BookPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [service, setService] = useState("");
  const [otherService, setOtherService] = useState("");
  const [mountedAt] = useState(() => Date.now());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    if ((form.get("website") as string)?.trim()) { setDone(true); return; }
    if (Date.now() - mountedAt < 2000) {
      toast.error("Please take a moment to review your details.");
      return;
    }

    const finalService = service === "Other" ? `Other — ${otherService.trim()}` : service;

    const raw = {
      full_name: (form.get("full_name") as string)?.trim(),
      email: (form.get("email") as string)?.trim(),
      phone: (form.get("phone") as string)?.trim(),
      service: finalService,
      description: (form.get("description") as string)?.trim(),
      preferred_date: (form.get("preferred_date") as string) || "",
    };

    if (service === "Other" && !otherService.trim()) {
      toast.error("Please describe the service you need");
      return;
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      await submitBooking({ data: { ...parsed.data, preferred_date: parsed.data.preferred_date } });
      setDone(true);
      toast.success("Booking received");
    } catch {
      toast.error("Couldn't submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <section className="container-narrow py-32 text-center">
        <p className="uppercase-tracked text-primary">Confirmed</p>
        <h1 className="font-display text-5xl md:text-6xl mt-3 text-balance">Thank you for booking.</h1>
        <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
          We will get back to you within 24 hours.
        </p>
      </section>
    );
  }

  return (
    <section className="container-narrow py-24">
      <p className="uppercase-tracked text-primary">Booking</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3">Book me</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        Share a few details and I'll respond within 24 hours.
      </p>

      <form onSubmit={onSubmit} className="mt-12 max-w-2xl space-y-6">
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>

        <Field label="Full name" name="full_name" required />
        <div className="grid sm:grid-cols-2 gap-6">
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone number" name="phone" type="tel" required />
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <label className="block">
            <span className="uppercase-tracked text-muted-foreground">Service needed *</span>
            <select
              name="service"
              required
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="mt-2 w-full bg-background border-b border-border focus:border-primary outline-none py-2 text-foreground"
            >
              <option value="" disabled>Select a service</option>
              {SERVICES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <Field label="Preferred date" name="preferred_date" type="date" required />
        </div>

        {service === "Other" && (
          <label className="block animate-in-fade">
            <span className="uppercase-tracked text-muted-foreground">Tell me what kind of service *</span>
            <input
              value={otherService}
              onChange={(e) => setOtherService(e.target.value)}
              placeholder="e.g. drone aerial coverage, podcast post-production…"
              className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
              required
            />
          </label>
        )}

        <TextareaField label="Project description" name="description" required rows={6} />

        <button
          type="submit"
          disabled={submitting}
          className="uppercase-tracked bg-primary text-primary-foreground px-8 py-3 disabled:opacity-50 hover:opacity-90"
        >
          {submitting ? "Sending…" : "Send booking"}
        </button>
      </form>
    </section>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="uppercase-tracked text-muted-foreground">{label}{required && " *"}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2 text-foreground"
      />
    </label>
  );
}

function TextareaField({ label, name, rows, required }: { label: string; name: string; rows: number; required?: boolean }) {
  return (
    <label className="block">
      <span className="uppercase-tracked text-muted-foreground">{label}{required && " *"}</span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        className="mt-2 w-full bg-transparent border border-border focus:border-primary outline-none p-3 text-foreground resize-y"
      />
    </label>
  );
}
