import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/auth";
import { toast } from "sonner";
import { Trash2, UploadCloud, LogOut, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — GATEI" }] }),
  component: AdminPage,
});

type Tab = "upload" | "portfolio" | "bookings" | "links";

function AdminPage() {
  const { admin, user, loading } = useIsAdmin();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("upload");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading) return <Center>Loading…</Center>;
  if (!user) return null;
  if (!admin) {
    return (
      <Center>
        <p className="uppercase-tracked text-primary">Restricted</p>
        <h1 className="font-display text-4xl mt-3">Not authorized</h1>
        <p className="text-muted-foreground mt-3 max-w-md text-sm">
          Your account ({user.email}) doesn't have admin access. The first admin must be assigned manually in the database — see setup instructions.
        </p>
        <button
          onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))}
          className="mt-6 uppercase-tracked border border-border px-4 py-2 hover:border-primary"
        >
          Sign out
        </button>
      </Center>
    );
  }

  return (
    <section className="container-narrow py-12">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
        <div>
          <p className="uppercase-tracked text-primary">Studio</p>
          <h1 className="font-display text-4xl mt-1">Admin</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{user.email}</span>
          <Link to="/" className="uppercase-tracked hover:text-primary">View site</Link>
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))}
            className="uppercase-tracked flex items-center gap-1 hover:text-primary"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-border">
        {(["upload", "portfolio", "bookings", "links"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`uppercase-tracked px-4 py-3 -mb-px border-b-2 ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "upload" && <UploadPanel />}
        {tab === "portfolio" && <PortfolioPanel />}
        {tab === "bookings" && <BookingsPanel />}
        {tab === "links" && <LinksPanel />}
      </div>
    </section>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="container-narrow py-32 text-center">{children}</div>;
}

/* ============== UPLOAD ============== */
function UploadPanel() {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ name: string; done: boolean }[]>([]);
  const [category, setCategory] = useState<"audio" | "video" | "graphics" | "photography">("photography");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function detectType(file: File): "image" | "video" | "audio" | null {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return null;
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setBusy(true);
    setProgress(arr.map((f) => ({ name: f.name, done: false })));
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      const type = detectType(file);
      if (!type) {
        toast.error(`${file.name}: unsupported file type`);
        continue;
      }
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${type}/${crypto.randomUUID()}.${ext}`;
      // Upload original — no compression, no transforms
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (upErr) {
        toast.error(`${file.name}: ${upErr.message}`);
        continue;
      }
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const { error: insErr } = await supabase.from("portfolio_items").insert({
        file_url: pub.publicUrl,
        storage_path: path,
        type,
        category,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        description: description || null,
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (insErr) {
        toast.error(`${file.name}: ${insErr.message}`);
      }
      setProgress((p) => p.map((row, idx) => (idx === i ? { ...row, done: true } : row)));
    }
    setBusy(false);
    toast.success("Upload complete");
    setTimeout(() => setProgress([]), 2500);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed ${drag ? "border-primary bg-card" : "border-border"} rounded-md p-16 text-center cursor-pointer transition-colors`}
      >
        <UploadCloud className="mx-auto text-primary" size={40} />
        <p className="mt-4 font-display text-2xl">Drop media here</p>
        <p className="text-sm text-muted-foreground mt-2">
          Images · Video · Audio — any size, original quality, no compression.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {progress.length > 0 && (
          <ul className="mt-8 space-y-2 text-left text-sm max-w-md mx-auto">
            {progress.map((p) => (
              <li key={p.name} className="flex items-center gap-2 text-muted-foreground">
                {p.done ? <span className="text-primary">✓</span> : <Loader2 className="animate-spin" size={14} />}
                <span className="truncate">{p.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="space-y-5 bg-card border border-border p-6">
        <h3 className="font-display text-xl">Defaults for upload</h3>
        <label className="block">
          <span className="uppercase-tracked text-muted-foreground">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as never)}
            className="mt-2 w-full bg-background border border-border focus:border-primary outline-none py-2 px-3"
          >
            <option value="photography">Photography</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="graphics">Graphics</option>
          </select>
        </label>
        <label className="block">
          <span className="uppercase-tracked text-muted-foreground">Title (optional)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2" />
        </label>
        <label className="block">
          <span className="uppercase-tracked text-muted-foreground">Description (optional)</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-2 w-full bg-background border border-border focus:border-primary outline-none p-2" />
        </label>
        <p className="text-xs text-muted-foreground">Defaults applied to every file in the next batch.</p>
        {busy && <p className="text-xs text-primary">Uploading…</p>}
      </aside>
    </div>
  );
}

/* ============== PORTFOLIO MANAGEMENT ============== */
function PortfolioPanel() {
  const [items, setItems] = useState<{ id: string; file_url: string; storage_path: string; type: string; category: string; title: string | null }[]>([]);
  async function load() {
    const { data } = await supabase
      .from("portfolio_items")
      .select("id,file_url,storage_path,type,category,title")
      .order("created_at", { ascending: false });
    setItems((data as never) ?? []);
  }
  useEffect(() => { load(); }, []);
  async function del(id: string, path: string) {
    if (!confirm("Delete this item?")) return;
    await supabase.storage.from("media").remove([path]);
    const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  }
  if (items.length === 0) return <p className="text-muted-foreground text-sm">No items yet.</p>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.id} className="relative group border border-border bg-card aspect-square overflow-hidden">
          {it.type === "image" && <img src={it.file_url} alt={it.title ?? ""} className="w-full h-full object-cover" />}
          {it.type === "video" && <video src={it.file_url} muted className="w-full h-full object-cover" />}
          {it.type === "audio" && <div className="w-full h-full flex items-center justify-center bg-secondary text-primary text-xs">AUDIO</div>}
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black to-transparent flex items-center justify-between">
            <span className="text-xs text-white truncate">{it.title ?? "—"}</span>
            <button onClick={() => del(it.id, it.storage_path)} className="text-white/80 hover:text-destructive p-1">
              <Trash2 size={14} />
            </button>
          </div>
          <span className="absolute top-2 left-2 uppercase-tracked text-[10px] bg-background/80 px-2 py-1 text-primary">{it.category}</span>
        </div>
      ))}
    </div>
  );
}

/* ============== BOOKINGS ============== */
function BookingsPanel() {
  const [rows, setRows] = useState<{ id: string; full_name: string; email: string; phone: string; service: string; description: string; preferred_date: string | null; status: string; created_at: string }[]>([]);
  async function load() {
    const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    setRows((data as never) ?? []);
  }
  useEffect(() => { load(); }, []);
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Updated"); load(); }
  }
  async function del(id: string) {
    if (!confirm("Delete booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  }
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">No bookings yet.</p>;
  return (
    <div className="space-y-4">
      {rows.map((b) => (
        <article key={b.id} className="border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display text-xl">{b.full_name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(b.created_at).toLocaleString()} · {b.service}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={b.status}
                onChange={(e) => setStatus(b.id, e.target.value)}
                className="text-xs bg-background border border-border px-2 py-1 uppercase-tracked"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="confirmed">Confirmed</option>
                <option value="declined">Declined</option>
                <option value="done">Done</option>
              </select>
              <button onClick={() => del(b.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 size={14} /></button>
            </div>
          </div>
          <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
            <a href={`mailto:${b.email}`} className="hover:text-primary truncate">{b.email}</a>
            <a href={`tel:${b.phone}`} className="hover:text-primary">{b.phone}</a>
            <span className="text-muted-foreground">{b.preferred_date ? `Preferred: ${b.preferred_date}` : "No preferred date"}</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap">{b.description}</p>
        </article>
      ))}
    </div>
  );
}

/* ============== SOCIAL LINKS ============== */
function LinksPanel() {
  const [rows, setRows] = useState<{ id: string; platform: string; label: string; url: string; is_visible: boolean }[]>([]);
  async function load() {
    const { data } = await supabase.from("social_links").select("id,platform,label,url,is_visible").order("sort_order");
    setRows((data as never) ?? []);
  }
  useEffect(() => { load(); }, []);
  async function save(id: string, patch: Partial<{ url: string; label: string; is_visible: boolean }>) {
    if (typeof patch.url === "string") {
      const v = patch.url.trim();
      if (v && !/^(https?:\/\/|mailto:|tel:|#)/i.test(v)) {
        toast.error("URL must start with http(s)://, mailto:, tel:, or # (use a phone number for WhatsApp)");
        return;
      }
    }
    const { error } = await supabase.from("social_links").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }
  return (
    <div className="space-y-3 max-w-3xl">
      <p className="text-sm text-muted-foreground">
        Tip: For WhatsApp, paste a phone number with country code (e.g. <code>+254712345678</code>) — the public site will format the wa.me link automatically.
      </p>
      {rows.map((r) => (
        <div key={r.id} className="grid sm:grid-cols-[140px_1fr_auto] gap-3 items-center border border-border bg-card p-3">
          <span className="uppercase-tracked text-primary">{r.platform}</span>
          <input
            defaultValue={r.url}
            onBlur={(e) => e.target.value !== r.url && save(r.id, { url: e.target.value })}
            className="bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm"
            placeholder="https://…"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              defaultChecked={r.is_visible}
              onChange={(e) => save(r.id, { is_visible: e.target.checked })}
            />
            Visible
          </label>
        </div>
      ))}
    </div>
  );
}
