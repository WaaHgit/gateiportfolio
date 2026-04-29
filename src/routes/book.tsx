import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  full_name: z.string().trim().min(1, "Required").max(200),
  email: z.string().trim().email("Invalid email").max(320),
  phone: z.string().trim().min(3, "Required").max(50),
  service: z.string().min(1, "Pick a service"),
  description: z.string().trim().min(10, "Tell me a bit more").max(5000),
  preferred_date: z.string().optional().nullable(),
});

function BookPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const raw = {
      full_name: form.get("full_name") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      service: form.get("service") as string,
      description: form.get("description") as string,
      preferred_date: (form.get("preferred_date") as string) || null,
    };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("bookings").insert(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't submit — please try again.");
      return;
    }
    setDone(true);
    toast.success("Booking received");
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
        <Field label="Full name" name="full_name" required />
        <div className="grid sm:grid-cols-2 gap-6">
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone number" name="phone" type="tel" required />
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <SelectField label="Service needed" name="service" options={SERVICES} required />
          <Field label="Preferred date" name="preferred_date" type="date" />
        </div>
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

function SelectField({ label, name, options, required }: { label: string; name: string; options: string[]; required?: boolean }) {
  return (
    <label className="block">
      <span className="uppercase-tracked text-muted-foreground">{label}{required && " *"}</span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="mt-2 w-full bg-background border-b border-border focus:border-primary outline-none py-2 text-foreground"
      >
        <option value="" disabled>Select a service</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
