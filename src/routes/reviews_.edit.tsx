import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Star } from "lucide-react";
import { getReviewByToken, updateReviewByToken } from "@/lib/reviews.functions";

export const Route = createFileRoute("/reviews_/edit")({
  head: () => ({
    meta: [
      { title: "Edit your review — GATEI" },
      { name: "description", content: "Use your private link to make a one-time edit to the review you left for GATEI." },
      { property: "og:title", content: "Edit your review — GATEI" },
      { property: "og:description", content: "Make a one-time edit to your GATEI review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditReviewPage,
});

const schema = z.object({
  client_name: z.string().trim().min(1, "Full name is required").max(120),
  review_text: z.string().trim().min(10, "Please write at least 10 characters").max(1000),
  rating: z.number().int().min(1, "Please pick a star rating").max(5),
});

function EditReviewPage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "saved">("loading");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ client_name: "", review_text: "", rating: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
    if (!t) { setState("invalid"); setMessage("This edit link is not valid."); return; }
    void (async () => {
      try {
        const res = await getReviewByToken({ data: { token: t } });
        if (!res.ok) { setState("invalid"); setMessage(res.message); return; }
        setForm({ client_name: res.review.client_name, review_text: res.review.review_text, rating: res.review.rating });
        setState("ready");
      } catch {
        setState("invalid");
        setMessage("This edit link is not valid.");
      }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!token || busy) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Please check your input"); return; }
    setBusy(true);
    try {
      const res = await updateReviewByToken({ data: { token, ...parsed.data } });
      if (!res.ok) { setState("invalid"); setMessage(res.message); return; }
      setState("saved");
    } catch {
      toast.error("Could not save your changes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container-narrow py-24">
      <p className="uppercase-tracked text-primary">Reviews</p>
      <h1 className="font-display text-4xl md:text-5xl mt-3">Edit your review</h1>

      {state === "loading" && <p className="mt-8 text-sm text-muted-foreground">Checking your link…</p>}

      {state === "invalid" && (
        <div className="mt-8 max-w-xl border border-border bg-card p-8">
          <p className="text-sm">{message}</p>
          <Link to="/reviews" className="mt-6 inline-block uppercase-tracked text-xs border border-border px-4 py-2 hover:border-primary">
            Back to reviews
          </Link>
        </div>
      )}

      {state === "saved" && (
        <div className="mt-8 max-w-xl border border-border bg-card p-8 animate-in-fade">
          <h2 className="font-display text-2xl text-primary">Thank you for your feedback</h2>
          <p className="mt-3 text-sm text-muted-foreground">Your updated review has been received.</p>
          <Link to="/reviews" className="mt-6 inline-block uppercase-tracked text-xs border border-border px-4 py-2 hover:border-primary">
            Back to reviews
          </Link>
        </div>
      )}

      {state === "ready" && (
        <form onSubmit={save} className="mt-8 grid gap-5 max-w-xl" noValidate>
          <p className="text-sm text-muted-foreground">You can make one edit. After saving, this link stops working.</p>

          <div className="flex items-center justify-between">
            <span className="uppercase-tracked text-muted-foreground text-xs">Rating *</span>
            <div className="flex gap-0.5" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={n === form.rating}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setForm((f) => ({ ...f, rating: n }))}
                >
                  <Star size={22} className={n <= form.rating ? "fill-primary text-primary" : "text-muted-foreground"} />
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="uppercase-tracked text-xs text-muted-foreground">Full name *</span>
            <input
              required
              maxLength={120}
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
            />
          </label>

          <label className="block">
            <span className="uppercase-tracked text-xs text-muted-foreground">Your review *</span>
            <textarea
              required
              rows={5}
              maxLength={1000}
              value={form.review_text}
              onChange={(e) => setForm((f) => ({ ...f, review_text: e.target.value }))}
              className="mt-2 w-full bg-background border border-border focus:border-primary outline-none p-3"
            />
            <span className="text-xs text-muted-foreground">{form.review_text.length}/1000</span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="uppercase-tracked bg-primary text-primary-foreground px-6 py-3 disabled:opacity-50 self-start"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}
    </section>
  );
}
