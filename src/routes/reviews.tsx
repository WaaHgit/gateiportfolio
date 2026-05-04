import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().email("Invalid email").max(320).optional().or(z.literal("")),
  message: z.string().trim().min(1, "Write a short message").max(280),
  rating: z.number().int().min(1).max(5),
});

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

  useEffect(() => {
    load();
  }, []);

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

      {/* Looping window of 3 */}
      <div className="mt-12 grid md:grid-cols-3 gap-4 min-h-[200px]">
        {windowReviews.length === 0 && (
          <p className="text-muted-foreground text-sm md:col-span-3">No reviews yet — be the first.</p>
        )}
        {windowReviews.map((r) => (
          <article
            key={r.id}
            className="border border-border bg-card p-6 animate-in-fade flex flex-col"
          >
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
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  async function signInGoogle() {
    const redirectTo = `${window.location.origin}/reviews`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) toast.error(error.message);
  }

  // Pull google profile if signed in
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const fullName = (meta.full_name as string) || (meta.name as string) || "";
      const picture = (meta.avatar_url as string) || (meta.picture as string) || null;
      if (fullName && !name) setName(fullName);
      if (u.email && !email) setEmail(u.email);
      if (picture) setAvatarUrl(picture);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = reviewSchema.safeParse({ name, email, message, rating });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    const { data: sess } = await supabase.auth.getSession();
    const isAuthed = !!sess.session;
    const { error } = await supabase.from("reviews").insert({
      name: parsed.data.name,
      email: isAuthed ? (parsed.data.email || null) : null,
      message: parsed.data.message,
      rating: parsed.data.rating,
      avatar_url: isAuthed ? avatarUrl : null,
      status: "pending",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("thank you for your feedback");
    setName("");
    setEmail("");
    setMessage("");
    setRating(5);
    onSubmitted();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-5 max-w-xl">
      <div className="flex items-center justify-between">
        <span className="uppercase-tracked text-muted-foreground text-xs">Rating</span>
        <Stars value={rating} onChange={setRating} />
      </div>
      <label className="block">
        <span className="uppercase-tracked text-xs text-muted-foreground">Name *</span>
        <input
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
        />
      </label>
      <label className="block">
        <span className="uppercase-tracked text-xs text-muted-foreground">
          Email (optional)
        </span>
        <input
          type="email"
          maxLength={320}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
        />
      </label>
      <label className="block">
        <span className="uppercase-tracked text-xs text-muted-foreground">Review (max 280 chars)</span>
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

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="uppercase-tracked bg-primary text-primary-foreground px-6 py-3 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Submit review"}
        </button>
        {avatarUrl ? (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <img src={avatarUrl} className="w-6 h-6 rounded-full" alt="" />
            Google photo attached
          </span>
        ) : (
          <button
            type="button"
            onClick={signInGoogle}
            className="uppercase-tracked text-xs border border-border px-4 py-2 hover:border-primary"
          >
            Sign in with Google (optional)
          </button>
        )}
      </div>
    </form>
  );
}
