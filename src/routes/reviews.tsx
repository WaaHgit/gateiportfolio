import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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

type Review = {
  id: string;
  name: string;
  message: string;
  rating: number;
  avatar_url: string | null;
  created_at: string;
};

const reviewSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(80),
  message: z.string().trim().min(1, "Write a short message").max(280),
  rating: z.number().int().min(1, "Pick a star rating").max(5),
});

const PENDING_KEY = "gatei_pending_review";

function ReviewsPage() {
  const [all, setAll] = useState<Review[]>([]);
  const [windowReviews, setWindowReviews] = useState<Review[]>([]);

  async function load() {
    const { data } = await supabase
      .from("reviews")
      .select("id,name,message,rating,avatar_url,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    const list = (data as Review[]) ?? [];
    setAll(list);
    setWindowReviews(list.slice(0, 3));
  }

  useEffect(() => { load(); }, []);

  // Loop window of 3 with fade
  useEffect(() => {
    if (all.length <= 3) return;
    let offset = 0;
    const id = setInterval(() => {
      offset = (offset + 1) % all.length;
      const next: Review[] = [];
      for (let i = 0; i < 3; i++) next.push(all[(offset + i) % all.length]);
      setWindowReviews(next);
    }, 5000);
    return () => clearInterval(id);
  }, [all]);

  return (
    <section className="container-narrow py-24">
      <p className="uppercase-tracked text-primary">Reviews</p>
      <h1 className="font-display text-5xl md:text-6xl mt-3">What clients say</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        A rotating selection of recent client reviews. Leave yours below.
      </p>

      <div className="mt-12 grid md:grid-cols-3 gap-4 min-h-[200px]">
        {windowReviews.length === 0 && (
          <p className="text-muted-foreground text-sm md:col-span-3">No reviews yet — be the first.</p>
        )}
        {windowReviews.map((r) => (
          <article key={r.id} className="border border-border bg-card p-6 animate-in-fade flex flex-col">
            <div className="flex items-center gap-3">
              {r.avatar_url ? (
                <img src={r.avatar_url} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary uppercase-tracked">
                  {r.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-display">{r.name}</p>
                <Stars value={r.rating} />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{r.message}</p>
          </article>
        ))}
      </div>

      <div className="mt-20 border-t border-border pt-12">
        <h2 className="font-display text-3xl">Leave a review</h2>
        <p className="text-sm text-muted-foreground mt-2">
          You'll be asked to sign in with Google before your review is sent — this keeps reviews authentic and prevents spam.
        </p>
        <ReviewForm onSubmitted={load} />
      </div>
    </section>
  );
}

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={onChange ? () => onChange(n) : undefined}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Star
            size={onChange ? 22 : 14}
            className={n <= value ? "fill-primary text-primary" : "text-muted-foreground"}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);

  // If user just returned from Google auth with a pending draft, submit it.
  useEffect(() => {
    (async () => {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;
      try {
        const draft = JSON.parse(raw) as { name: string; message: string; rating: number };
        sessionStorage.removeItem(PENDING_KEY);
        await submitToDb(draft, sess.session.user);
        onSubmitted();
      } catch {
        sessionStorage.removeItem(PENDING_KEY);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitToDb(
    payload: { name: string; message: string; rating: number },
    user: { id: string; user_metadata: Record<string, unknown> | undefined }
  ) {
    const { error } = await supabase.from("reviews").insert({
      author_id: user.id,
      name: payload.name,
      message: payload.message,
      rating: payload.rating,
      avatar_url: null,
      status: "pending",
    });
    if (error) {
      if (error.message?.includes("Review limit reached")) {
        toast.error("You've reached the limit of 2 reviews per account.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Thank you for your feedback");
    setName("");
    setMessage("");
    setRating(0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reviewSchema.safeParse({ name, message, rating });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);

    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      // Stash draft; redirect to Google. On return useEffect submits.
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(parsed.data));
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/reviews",
      });
      if (result.error) {
        toast.error("Sign-in failed. Please try again.");
        sessionStorage.removeItem(PENDING_KEY);
        setBusy(false);
        return;
      }
      // Browser redirects; nothing more to do.
      return;
    }

    await submitToDb(parsed.data, sess.session.user);
    setBusy(false);
    onSubmitted();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-5 max-w-xl">
      <div className="flex items-center justify-between">
        <span className="uppercase-tracked text-muted-foreground text-xs">Rating *</span>
        <Stars value={rating} onChange={setRating} />
      </div>
      <label className="block">
        <span className="uppercase-tracked text-xs text-muted-foreground">Full name *</span>
        <input
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
        />
      </label>
      <label className="block">
        <span className="uppercase-tracked text-xs text-muted-foreground">Your review * (max 280 chars)</span>
        <textarea
          required
          maxLength={280}
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-2 w-full bg-background border border-border focus:border-primary outline-none p-2"
        />
        <span className="text-xs text-muted-foreground">{message.length}/280</span>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="uppercase-tracked bg-primary text-primary-foreground px-6 py-3 disabled:opacity-50 self-start"
      >
        {busy ? "Continuing…" : "Submit review"}
      </button>
      <p className="text-xs text-muted-foreground">
        Each account is limited to 2 reviews total.
      </p>
    </form>
  );
}
