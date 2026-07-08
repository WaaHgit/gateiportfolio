import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { fetchApprovedReviews, insertReview, type Review } from "@/lib/reviews";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — GATEI" },
      { name: "description", content: "Read what clients say about GATEI and leave your own review." },
      { property: "og:title", content: "Reviews — GATEI" },
      { property: "og:description", content: "Client reviews and ratings for GATEI multimedia." },
    ],
  }),
  component: ReviewsPage,
});

const reviewSchema = z.object({
  client_name: z.string().trim().min(1, "Full name is required").max(120),
  review_text: z.string().trim().min(10, "Please write at least 10 characters").max(2000),
  rating: z.number().int().min(1, "Please pick a star rating").max(5),
  company: z.string().trim().max(120).optional(),
  position: z.string().trim().max(120).optional(),
});

function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchApprovedReviews();
      setReviews(list);
    } catch {
      setReviews([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="container-narrow py-24">
      <p className="uppercase-tracked text-primary">Reviews</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3">What clients say</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Feedback from the people I've worked with — leave yours below.
      </p>

      <div className="mt-12">
        <ReviewsCarousel reviews={reviews} />
      </div>

      <div className="mt-20 border-t border-border pt-12">
        <h2 className="font-display text-3xl">Leave a review</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Your review will appear here once it's approved.
        </p>
        <ReviewForm onSubmitted={load} />
      </div>
    </section>
  );
}

/* ------------------------------- CAROUSEL ------------------------------- */

function ReviewsCarousel({ reviews }: { reviews: Review[] | null }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = reviews ?? [];
  const count = items.length;

  useEffect(() => { if (index >= count && count > 0) setIndex(0); }, [count, index]);

  const next = useCallback(() => setIndex((i) => (count === 0 ? 0 : (i + 1) % count)), [count]);
  const prev = useCallback(() => setIndex((i) => (count === 0 ? 0 : (i - 1 + count) % count)), [count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(next, 4500);
    return () => window.clearInterval(id);
  }, [paused, count, next]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
  }

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) next(); else prev();
  }

  if (reviews === null) {
    return <p className="text-sm text-muted-foreground">Loading reviews…</p>;
  }
  if (count === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet — be the first to leave one below.</p>;
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Client reviews"
    >
      <div className="overflow-hidden border border-border bg-card">
        <div
          className="flex transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
          aria-live="polite"
        >
          {items.map((r, i) => (
            <article
              key={r.id}
              className="min-w-full p-6 md:p-10"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={i !== index}
            >
              <div className="flex items-center gap-4">
                {r.profile_image_url ? (
                  <img src={r.profile_image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-primary uppercase-tracked">
                    {r.client_name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-display text-lg truncate">{r.client_name}</p>
                  {(r.position || r.company) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[r.position, r.company].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <Stars value={r.rating} />
                </div>
              </div>
              <p className="mt-6 text-base md:text-lg leading-relaxed whitespace-pre-line">{r.review_text}</p>
            </article>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous review"
            className="absolute top-1/2 -translate-y-1/2 -left-2 md:-left-4 w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center hover:border-primary hover:text-primary"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next review"
            className="absolute top-1/2 -translate-y-1/2 -right-2 md:-right-4 w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center hover:border-primary hover:text-primary"
          >
            <ChevronRight size={18} />
          </button>

          <div className="mt-4 flex justify-center gap-2" role="tablist" aria-label="Select review">
            {items.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to review ${i + 1}`}
                aria-selected={i === index}
                role="tab"
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-2 bg-border hover:bg-muted-foreground"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* --------------------------------- FORM --------------------------------- */

function Stars({ value, onChange, size = 14 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label={onChange ? "Rating" : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={onChange ? () => onChange(n) : undefined}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={onChange ? `${n} star${n > 1 ? "s" : ""}` : undefined}
          role={onChange ? "radio" : undefined}
          aria-checked={onChange ? n === value : undefined}
          tabIndex={onChange ? 0 : -1}
        >
          <Star size={size} className={n <= value ? "fill-primary text-primary" : "text-muted-foreground"} />
        </button>
      ))}
    </div>
  );
}

type FormState = {
  client_name: string;
  review_text: string;
  rating: number;
  company: string;
  position: string;
};

const INITIAL: FormState = { client_name: "", review_text: "", rating: 0, company: "", position: "" };

function ReviewForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const lastSubmitRef = useRef<string | null>(null);

  const charCount = form.review_text.length;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    // Honeypot — silent success if a bot filled the hidden field.
    if (honeypot.current?.value) { setDone(true); return; }

    const parsed = reviewSchema.safeParse({
      client_name: form.client_name,
      review_text: form.review_text,
      rating: form.rating,
      company: form.company || undefined,
      position: form.position || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check your input");
      return;
    }

    // Prevent double-submit / retried network races
    const key = JSON.stringify(parsed.data);
    if (lastSubmitRef.current === key) return;
    lastSubmitRef.current = key;

    setBusy(true);
    try {
      await insertReview({
        client_name: parsed.data.client_name,
        review_text: parsed.data.review_text,
        rating: parsed.data.rating,
        company: parsed.data.company ?? null,
        position: parsed.data.position ?? null,
      });
      setDone(true);
      setForm(INITIAL);
      onSubmitted();
    } catch (err) {
      lastSubmitRef.current = null;
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6 max-w-xl border border-border bg-card p-8 animate-in-fade">
        <h3 className="font-display text-2xl text-primary">Thank you</h3>
        <p className="mt-3 text-sm text-muted-foreground">
          Your review is being reviewed and will appear once approved.
        </p>
        <button
          type="button"
          onClick={() => { setDone(false); lastSubmitRef.current = null; }}
          className="mt-6 uppercase-tracked text-xs border border-border px-4 py-2 hover:border-primary"
        >
          Leave another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-5 max-w-xl" noValidate>
      {/* honeypot — hidden from real users */}
      <input
        ref={honeypot}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="flex items-center justify-between">
        <span className="uppercase-tracked text-muted-foreground text-xs">Rating *</span>
        <Stars value={form.rating} onChange={(n) => update("rating", n)} size={22} />
      </div>

      <label className="block">
        <span className="uppercase-tracked text-xs text-muted-foreground">Full name *</span>
        <input
          required
          maxLength={120}
          value={form.client_name}
          onChange={(e) => update("client_name", e.target.value)}
          className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
        />
      </label>

      <div className="grid sm:grid-cols-2 gap-5">
        <label className="block">
          <span className="uppercase-tracked text-xs text-muted-foreground">Company</span>
          <input
            maxLength={120}
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
            className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
          />
        </label>
        <label className="block">
          <span className="uppercase-tracked text-xs text-muted-foreground">Role</span>
          <input
            maxLength={120}
            value={form.position}
            onChange={(e) => update("position", e.target.value)}
            className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
          />
        </label>
      </div>

      <label className="block">
        <span className="uppercase-tracked text-xs text-muted-foreground">
          Your review * <span className="opacity-60">(min 10, max 2000)</span>
        </span>
        <textarea
          required
          maxLength={2000}
          minLength={10}
          rows={5}
          value={form.review_text}
          onChange={(e) => update("review_text", e.target.value)}
          className="mt-2 w-full bg-background border border-border focus:border-primary outline-none p-3"
        />
        <span className="text-xs text-muted-foreground">{charCount}/2000</span>
      </label>

      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className="uppercase-tracked bg-primary text-primary-foreground px-6 py-3 disabled:opacity-50 self-start"
      >
        {busy ? "Sending…" : "Submit review"}
      </button>
    </form>
  );
}
