import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/auth";
import { toast } from "sonner";
import { Trash2, UploadCloud, LogOut, Loader2, Star, CalendarCheck, BarChart3 } from "lucide-react";
import { confirmBookingAndAddToCalendar } from "@/server/calendar.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — GATEI" }] }),
  component: AdminPage,
});

type Tab = "upload" | "portfolio" | "reviews" | "bookings" | "insights" | "links";

function AdminPage() {
  const { admin, user, loading, error, retry } = useIsAdmin();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("upload");

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading) return <Center>Loading…</Center>;
  if (!user) return null;
  if (error) {
    return (
      <Center>
        <p className="uppercase-tracked text-primary">Admin check</p>
        <h1 className="font-display text-4xl mt-3">Connection issue</h1>
        <p className="text-muted-foreground mt-3 max-w-md text-sm">
          I couldn&apos;t verify your admin access just now. Please retry — your permissions may still be correct.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <button onClick={retry} className="uppercase-tracked border border-border px-4 py-2 hover:border-primary">Retry</button>
          <button onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))} className="uppercase-tracked border border-border px-4 py-2 hover:border-primary">Sign out</button>
        </div>
      </Center>
    );
  }
  if (!admin) {
    return (
      <Center>
        <p className="uppercase-tracked text-primary">Restricted</p>
        <h1 className="font-display text-4xl mt-3">Not authorized</h1>
        <p className="text-muted-foreground mt-3 max-w-md text-sm">
          Your account ({user.email}) doesn't have admin access.
        </p>
        <button onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))} className="mt-6 uppercase-tracked border border-border px-4 py-2 hover:border-primary">Sign out</button>
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
          <button onClick={() => supabase.auth.signOut().then(() => navigate({ to: "/auth" }))} className="uppercase-tracked flex items-center gap-1 hover:text-primary">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2 border-b border-border">
        {(["upload", "portfolio", "reviews", "bookings", "insights", "links"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`uppercase-tracked px-4 py-3 -mb-px border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "upload" && <UploadPanel />}
        {tab === "portfolio" && <PortfolioPanel />}
        {tab === "reviews" && <ReviewsPanel />}
        {tab === "bookings" && <BookingsPanel />}
        {tab === "insights" && <InsightsPanel />}
        {tab === "links" && <LinksPanel />}
      </div>
    </section>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="container-narrow py-32 text-center">{children}</div>;
}

/* ============== UPLOAD ============== */
type UploadCategory = "audio" | "video" | "graphics" | "photography";
type MediaKind = "image" | "video" | "audio";

type RecentItem = {
  id: string;
  file_url: string;
  storage_path: string;
  type: MediaKind;
  category: UploadCategory;
  title: string | null;
  description: string | null;
  status: "draft" | "published";
  mime_type: string | null;
};

type StagedItem = {
  id: string;
  file: File;
  previewUrl: string | null;
  type: MediaKind;
  category: UploadCategory;
  title: string;
  description: string;
  uploading: boolean;
};

function UploadPanel() {
  const [drag, setDrag] = useState(false);
  const [category, setCategory] = useState<UploadCategory>("photography");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [staged, setStaged] = useState<StagedItem[]>([]);
  const [editing, setEditing] = useState<RecentItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const replacingId = useRef<string | null>(null);
  const stagedRef = useRef<StagedItem[]>([]);

  function detectType(file: File): MediaKind | null {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return null;
  }

  function baseTitle(name: string) {
    return name.replace(/\.[^.]+$/, "");
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  async function loadRecent() {
    const { data } = await supabase
      .from("portfolio_items")
      .select("id,file_url,storage_path,type,category,title,description,status,mime_type")
      .order("created_at", { ascending: false })
      .limit(60);
    setRecent((data as RecentItem[]) ?? []);
  }
  useEffect(() => {
    loadRecent();
    const ch = supabase
      .channel("admin-portfolio-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "portfolio_items" }, () => loadRecent())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);

  useEffect(() => {
    return () => {
      stagedRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  function queueFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    const created: StagedItem[] = [];
    for (const file of arr) {
      const type = detectType(file);
      if (!type) {
        toast.error(`${file.name}: unsupported file type`);
        continue;
      }
      created.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        type,
        category,
        title: title || baseTitle(file.name),
        description,
        uploading: false,
      });
    }
    if (created.length === 0) return;
    setStaged((prev) => [...created, ...prev]);
    toast.success("Preview ready — add details, then save draft or upload");
  }

  function updateStaged(id: string, patch: Partial<Pick<StagedItem, "title" | "description" | "category">>) {
    setStaged((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeStaged(id: string) {
    setStaged((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }

  async function uploadStaged(item: StagedItem, status: "draft" | "published", showToast = true) {
    setStaged((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, uploading: true } : entry)));

    try {
      // Make sure we have an active session — uploads require admin auth.
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error("Your session expired. Please sign in again.");

      const ext = item.file.name.split(".").pop() ?? "bin";
      const path = `${item.type}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(path, item.file, {
        contentType: item.file.type || "application/octet-stream",
        cacheControl: "31536000",
        upsert: false,
      });
      if (uploadError) {
        console.error("Storage upload failed", uploadError);
        throw uploadError;
      }

      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const { error: insertError } = await supabase.from("portfolio_items").insert({
        file_url: pub.publicUrl,
        storage_path: path,
        type: item.type,
        category: item.category,
        title: item.title || baseTitle(item.file.name),
        description: item.description || null,
        mime_type: item.file.type,
        size_bytes: item.file.size,
        status,
      });
      if (insertError) {
        console.error("Portfolio insert failed", insertError);
        throw insertError;
      }

      removeStaged(item.id);
      await loadRecent();
      if (showToast) toast.success(status === "published" ? "Uploaded to the website" : "Saved as draft");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      console.error("Upload error:", error);
      toast.error(message);
      setStaged((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, uploading: false } : entry)));
      return false;
    }
  }

  async function uploadAll(status: "draft" | "published") {
    const items = staged.filter((item) => !item.uploading);
    if (items.length === 0) {
      toast.error("No queued media to upload");
      return;
    }

    let success = 0;
    let failed = 0;
    for (const item of items) {
      const ok = await uploadStaged(item, status, false);
      if (ok) success += 1;
      else failed += 1;
    }

    if (success > 0) {
      toast.success(
        status === "published"
          ? `${success} item${success > 1 ? "s" : ""} uploaded to the website`
          : `${success} item${success > 1 ? "s" : ""} saved as drafts`
      );
    }
    if (failed > 0) toast.error(`${failed} item${failed > 1 ? "s" : ""} failed to upload`);
  }

  async function setStatus(id: string, status: "draft" | "published") {
    const { error } = await supabase.from("portfolio_items").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(status === "published" ? "Published" : "Saved as draft"); loadRecent(); }
  }
  async function del(it: RecentItem) {
    if (!confirm("Delete this item permanently?")) return;
    await supabase.storage.from("media").remove([it.storage_path]);
    const { error } = await supabase.from("portfolio_items").delete().eq("id", it.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); loadRecent(); }
  }
  function startReplace(id: string) {
    replacingId.current = id;
    replaceRef.current?.click();
  }
  async function handleReplace(file: File) {
    const id = replacingId.current;
    if (!id) return;
    const type = detectType(file);
    if (!type) { toast.error("Unsupported file type"); return; }
    const target = recent.find((r) => r.id === id);
    if (!target) return;
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${type}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
    const { error } = await supabase.from("portfolio_items").update({
      file_url: pub.publicUrl, storage_path: path, type, mime_type: file.type, size_bytes: file.size,
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await supabase.storage.from("media").remove([target.storage_path]);
    toast.success("Replaced");
    replacingId.current = null;
    loadRecent();
  }

  return (
    <div className="space-y-10">
      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); queueFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed ${drag ? "border-primary bg-card" : "border-border"} rounded-md p-16 text-center cursor-pointer transition-colors`}
        >
          <UploadCloud className="mx-auto text-primary" size={40} />
          <p className="mt-4 font-display text-2xl">Drop media here</p>
          <p className="text-sm text-muted-foreground mt-2">
            Images · Video · Audio — any size, original quality, no compression.
          </p>
          <p className="text-xs text-muted-foreground mt-3">Nothing uploads until you press Save draft or Upload.</p>
          <input ref={inputRef} type="file" multiple accept="image/*,video/*,audio/*" className="hidden"
            onChange={(e) => {
              if (e.target.files) queueFiles(e.target.files);
              e.target.value = "";
            }} />
          <input ref={replaceRef} type="file" accept="image/*,video/*,audio/*" className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) void handleReplace(e.target.files[0]);
              e.target.value = "";
            }} />
        </div>

        <aside className="space-y-5 bg-card border border-border p-6">
          <h3 className="font-display text-xl">Defaults for upload</h3>
          <label className="block">
            <span className="uppercase-tracked text-muted-foreground">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as never)}
              className="mt-2 w-full bg-background border border-border focus:border-primary outline-none py-2 px-3">
              <option value="photography">Photography</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="graphics">Graphics</option>
            </select>
          </label>
          <label className="block">
            <span className="uppercase-tracked text-muted-foreground">Title (optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2" />
          </label>
          <label className="block">
            <span className="uppercase-tracked text-muted-foreground">Description (optional)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="mt-2 w-full bg-background border border-border focus:border-primary outline-none p-2" />
          </label>
          <p className="text-xs text-muted-foreground">These defaults fill new previews automatically. You can still edit each file before saving.</p>
        </aside>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 border-b border-border pb-2 mb-4 flex-wrap">
          <div>
            <h3 className="font-display text-xl">Ready to upload</h3>
            <p className="text-sm text-muted-foreground mt-1">Preview each file, adjust details, then save it as a draft or upload it live.</p>
          </div>
          {staged.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => uploadAll("draft")} className="uppercase-tracked text-xs border border-border px-3 py-2 hover:border-primary">Save all drafts</button>
              <button onClick={() => uploadAll("published")} className="uppercase-tracked text-xs bg-primary text-primary-foreground px-3 py-2">Upload all</button>
            </div>
          )}
        </div>
        {staged.length === 0 ? (
          <p className="text-sm text-muted-foreground">Drop files above and they will appear here instantly for preview and editing.</p>
        ) : (
          <div className="space-y-4">
            {staged.map((item) => (
              <article key={item.id} className="border border-border bg-card p-4 grid gap-4 lg:grid-cols-[260px_1fr]">
                <div className="overflow-hidden border border-border bg-secondary min-h-[200px] flex items-center justify-center">
                  {item.type === "image" && item.previewUrl && (
                    <img src={item.previewUrl} alt={item.title || item.file.name} className="w-full h-full object-cover" />
                  )}
                  {item.type === "video" && item.previewUrl && (
                    <video src={item.previewUrl} controls playsInline className="w-full h-full object-cover" />
                  )}
                  {item.type === "audio" && item.previewUrl && (
                    <div className="w-full px-4">
                      <p className="uppercase-tracked text-xs text-primary mb-3">Audio preview</p>
                      <audio src={item.previewUrl} controls className="w-full" />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-display text-xl truncate">{item.file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatBytes(item.file.size)} · {item.type}</p>
                    </div>
                    {item.uploading && <span className="inline-flex items-center gap-2 text-xs text-primary"><Loader2 size={14} className="animate-spin" /> Uploading…</span>}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="uppercase-tracked text-muted-foreground">Category</span>
                      <select
                        value={item.category}
                        onChange={(e) => updateStaged(item.id, { category: e.target.value as UploadCategory })}
                        className="mt-2 w-full bg-background border border-border focus:border-primary outline-none py-2 px-3"
                      >
                        <option value="photography">Photography</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                        <option value="graphics">Graphics</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="uppercase-tracked text-muted-foreground">Title</span>
                      <input
                        value={item.title}
                        onChange={(e) => updateStaged(item.id, { title: e.target.value })}
                        className="mt-2 w-full bg-transparent border-b border-border focus:border-primary outline-none py-2"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="uppercase-tracked text-muted-foreground">Description</span>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateStaged(item.id, { description: e.target.value })}
                      rows={4}
                      className="mt-2 w-full bg-background border border-border focus:border-primary outline-none p-3"
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => uploadStaged(item, "draft")}
                      disabled={item.uploading}
                      className="uppercase-tracked text-xs border border-border px-3 py-2 hover:border-primary disabled:opacity-50"
                    >
                      Save draft
                    </button>
                    <button
                      onClick={() => uploadStaged(item, "published")}
                      disabled={item.uploading}
                      className="uppercase-tracked text-xs bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50"
                    >
                      Upload
                    </button>
                    <button
                      onClick={() => removeStaged(item.id)}
                      disabled={item.uploading}
                      className="uppercase-tracked text-xs text-muted-foreground hover:text-destructive px-3 py-2 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
          <h3 className="font-display text-xl">Saved media</h3>
          <button onClick={loadRecent} className="uppercase-tracked text-xs text-muted-foreground hover:text-primary">Refresh</button>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Drop files above to get started.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {recent.map((it) => (
              <div key={it.id} className="border border-border bg-card flex flex-col">
                <div className="aspect-square w-full overflow-hidden bg-secondary flex items-center justify-center">
                  {it.type === "image" && <img src={it.file_url} alt={it.title ?? ""} className="w-full h-full object-cover" />}
                  {it.type === "video" && <video src={it.file_url} muted playsInline className="w-full h-full object-cover" />}
                  {it.type === "audio" && <span className="text-primary uppercase-tracked text-xs">AUDIO</span>}
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs truncate flex-1">{it.title ?? "—"}</span>
                    <span className={`text-[10px] uppercase-tracked px-2 py-0.5 ${it.status === "published" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      {it.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase-tracked">{it.category}</p>
                  {it.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{it.description}</p>}
                  <div className="flex items-center gap-1 flex-wrap">
                    {it.status === "draft" ? (
                      <button onClick={() => setStatus(it.id, "published")} className="text-[11px] uppercase-tracked bg-primary text-primary-foreground px-2 py-1">Publish</button>
                    ) : (
                      <button onClick={() => setStatus(it.id, "draft")} className="text-[11px] uppercase-tracked border border-border px-2 py-1 hover:border-primary">Unpublish</button>
                    )}
                    <button onClick={() => setEditing(it)} className="text-[11px] uppercase-tracked border border-border px-2 py-1 hover:border-primary">Edit</button>
                    <button onClick={() => startReplace(it.id)} className="text-[11px] uppercase-tracked border border-border px-2 py-1 hover:border-primary">Replace</button>
                    <button onClick={() => del(it)} className="text-[11px] uppercase-tracked text-muted-foreground hover:text-destructive p-1 ml-auto">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <EditMediaModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadRecent(); }}
        />
      )}
    </div>
  );
}

/* ============== PORTFOLIO MANAGEMENT ============== */
function PortfolioPanel() {
  const [items, setItems] = useState<{ id: string; file_url: string; storage_path: string; type: string; category: string; title: string | null; status: string }[]>([]);
  async function load() {
    const { data } = await supabase
      .from("portfolio_items")
      .select("id,file_url,storage_path,type,category,title,status")
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
          <span className={`absolute top-2 right-2 uppercase-tracked text-[10px] px-2 py-1 ${it.status === "published" ? "bg-primary text-primary-foreground" : "bg-background/80 text-muted-foreground"}`}>{it.status}</span>
        </div>
      ))}
    </div>
  );
}

/* ============== REVIEWS MODERATION ============== */
type ReviewRow = {
  id: string;
  name: string;
  email: string | null;
  message: string;
  rating: number;
  avatar_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function ReviewsPanel() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  async function load() {
    let q = supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows((data as ReviewRow[]) ?? []);
  }
  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(id: string) {
    const { error } = await supabase.from("reviews").update({ status: "approved" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Approved — now visible on website"); load(); }
  }
  async function reject(id: string) {
    const { error } = await supabase.from("reviews").update({ status: "rejected" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Rejected"); load(); }
  }
  async function toDraft(id: string) {
    const { error } = await supabase.from("reviews").update({ status: "pending" }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Moved back to drafts"); load(); }
  }
  async function del(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`uppercase-tracked text-xs px-3 py-2 ${filter === f ? "text-primary border-b-2 border-primary -mb-3" : "text-muted-foreground hover:text-foreground"}`}>
            {f}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews here.</p>
      ) : (
        rows.map((r) => (
          <article key={r.id} className="border border-border bg-card p-5">
            <div className="flex items-start gap-3 flex-wrap">
              {r.avatar_url ? (
                <img src={r.avatar_url} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary uppercase-tracked">{r.name.charAt(0)}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display">{r.name}</p>
                  <div className="flex">
                    {[1,2,3,4,5].map((n) => (
                      <Star key={n} size={12} className={n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"} />
                    ))}
                  </div>
                  <span className={`uppercase-tracked text-[10px] px-2 py-0.5 ${r.status === "approved" ? "bg-primary/20 text-primary" : r.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}>{r.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{r.email ?? "no email"} · {new Date(r.created_at).toLocaleString()}</p>
                <p className="mt-3 text-sm">{r.message}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {r.status !== "approved" && (
                <button onClick={() => approve(r.id)} className="uppercase-tracked text-xs bg-primary text-primary-foreground px-3 py-1.5">Save (publish)</button>
              )}
              {r.status === "approved" && (
                <button onClick={() => toDraft(r.id)} className="uppercase-tracked text-xs border border-border px-3 py-1.5 hover:border-primary">Move to drafts</button>
              )}
              {r.status !== "rejected" && (
                <button onClick={() => reject(r.id)} className="uppercase-tracked text-xs border border-border px-3 py-1.5 hover:border-destructive">Reject</button>
              )}
              <button onClick={() => del(r.id)} className="uppercase-tracked text-xs text-muted-foreground hover:text-destructive ml-auto">
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

/* ============== BOOKINGS ============== */
type BookingRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  service: string;
  description: string;
  preferred_date: string | null;
  status: string;
  created_at: string;
  agreement_confirmed: boolean;
  event_date: string | null;
  event_time: string | null;
  venue: string | null;
  latitude: number | null;
  longitude: number | null;
  calendar_event_id: string | null;
};

function BookingsPanel() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    setRows((data as BookingRow[]) ?? []);
  }
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Updated");
  }
  async function del(id: string) {
    if (!confirm("Delete booking?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Deleted");
  }
  async function patch(id: string, patch: Partial<BookingRow>) {
    const { error } = await supabase.from("bookings").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  }
  async function confirmAgreement(id: string) {
    setBusy(id);
    try {
      const res = await confirmBookingAndAddToCalendar({ data: { booking_id: id } });
      if (!res.ok) { toast.error(res.reason ?? "Could not confirm"); return; }
      if (res.calendar_added) toast.success("Confirmed and added to calendar ✅");
      else toast.success(`Confirmed. ${res.reason ?? ""}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) return <p className="text-muted-foreground text-sm">No bookings yet.</p>;
  return (
    <div className="space-y-4">
      {rows.map((b) => (
        <article key={b.id} className="border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-display text-xl">{b.full_name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{new Date(b.created_at).toLocaleString()} · {b.service}</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={b.status} onChange={(e) => setStatus(b.id, e.target.value)}
                className="text-xs bg-background border border-border px-2 py-1 uppercase-tracked">
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

          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="uppercase-tracked text-primary">Agreement & calendar</p>
              {b.calendar_event_id && (
                <span className="text-[11px] uppercase-tracked text-primary flex items-center gap-1">
                  <CalendarCheck size={12} /> on calendar
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <label className="block">
                <span className="uppercase-tracked text-muted-foreground text-[11px]">Event date</span>
                <input type="date" defaultValue={b.event_date ?? ""}
                  onBlur={(e) => patch(b.id, { event_date: e.target.value || null })}
                  className="mt-1 w-full bg-background border border-border px-2 py-1.5 text-sm" />
              </label>
              <label className="block">
                <span className="uppercase-tracked text-muted-foreground text-[11px]">Event time</span>
                <input type="time" defaultValue={b.event_time ?? ""}
                  onBlur={(e) => patch(b.id, { event_time: e.target.value || null })}
                  className="mt-1 w-full bg-background border border-border px-2 py-1.5 text-sm" />
              </label>
              <label className="block sm:col-span-2">
                <span className="uppercase-tracked text-muted-foreground text-[11px]">Venue</span>
                <input type="text" defaultValue={b.venue ?? ""}
                  placeholder="Studio / location name"
                  onBlur={(e) => patch(b.id, { venue: e.target.value || null })}
                  className="mt-1 w-full bg-background border border-border px-2 py-1.5 text-sm" />
              </label>
              <label className="block">
                <span className="uppercase-tracked text-muted-foreground text-[11px]">Latitude</span>
                <input type="number" step="any" defaultValue={b.latitude ?? ""}
                  onBlur={(e) => patch(b.id, { latitude: e.target.value === "" ? null : Number(e.target.value) })}
                  className="mt-1 w-full bg-background border border-border px-2 py-1.5 text-sm" />
              </label>
              <label className="block">
                <span className="uppercase-tracked text-muted-foreground text-[11px]">Longitude</span>
                <input type="number" step="any" defaultValue={b.longitude ?? ""}
                  onBlur={(e) => patch(b.id, { longitude: e.target.value === "" ? null : Number(e.target.value) })}
                  className="mt-1 w-full bg-background border border-border px-2 py-1.5 text-sm" />
              </label>
            </div>

            <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={b.agreement_confirmed}
                disabled={busy === b.id || b.agreement_confirmed}
                onChange={() => confirmAgreement(b.id)}
                className="mt-1 w-4 h-4 accent-[oklch(0.82_0.14_75)]"
              />
              <span className="text-sm">
                <span className="font-medium">Agreement reached — add to calendar</span>
                <span className="block text-xs text-muted-foreground mt-1">
                  Tick after you've spoken with the client. Fills in the event on <code>projectfilesav@gmail.com</code> calendar automatically.
                  {!b.agreement_confirmed && " (Add an event date first.)"}
                </span>
                {busy === b.id && <span className="block text-xs text-primary mt-1 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Working…</span>}
              </span>
            </label>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ============== INSIGHTS ============== */
type EventRow = { id: string; kind: string; path: string | null; platform: string | null; created_at: string };
type Bucket = "day" | "month" | "year";

function InsightsPanel() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [bookings, setBookings] = useState<{ id: string; created_at: string; status: string }[]>([]);
  const [bucket, setBucket] = useState<Bucket>("day");
  const [days, setDays] = useState(30);

  async function load() {
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString();
    const [{ data: e }, { data: b }] = await Promise.all([
      supabase.from("page_events").select("id,kind,path,platform,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
      supabase.from("bookings").select("id,created_at,status").gte("created_at", since).order("created_at", { ascending: false }),
    ]);
    setEvents((e as EventRow[]) ?? []);
    setBookings((b as never) ?? []);
  }
  useEffect(() => { load(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {
    const views = events.filter((x) => x.kind === "page_view").length;
    const clicks = events.filter((x) => x.kind === "link_click").length;
    const byPlatform: Record<string, number> = {};
    for (const e of events) if (e.kind === "link_click" && e.platform) byPlatform[e.platform] = (byPlatform[e.platform] ?? 0) + 1;
    const byPath: Record<string, number> = {};
    for (const e of events) if (e.kind === "page_view" && e.path) byPath[e.path] = (byPath[e.path] ?? 0) + 1;
    return { views, clicks, byPlatform, byPath, bookings: bookings.length };
  }, [events, bookings]);

  const series = useMemo(() => {
    const map: Record<string, { views: number; clicks: number; bookings: number }> = {};
    function key(d: Date) {
      if (bucket === "year") return `${d.getFullYear()}`;
      if (bucket === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    for (const e of events) {
      const k = key(new Date(e.created_at));
      map[k] ??= { views: 0, clicks: 0, bookings: 0 };
      if (e.kind === "page_view") map[k].views++;
      else if (e.kind === "link_click") map[k].clicks++;
    }
    for (const b of bookings) {
      const k = key(new Date(b.created_at));
      map[k] ??= { views: 0, clicks: 0, bookings: 0 };
      map[k].bookings++;
    }
    return Object.entries(map).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 30);
  }, [events, bookings, bucket]);

  const max = Math.max(1, ...series.map(([, v]) => v.views + v.clicks + v.bookings));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="uppercase-tracked text-primary flex items-center gap-2"><BarChart3 size={14} /> Live insights</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="bg-background border border-border px-2 py-1 uppercase-tracked">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <div className="flex border border-border">
            {(["day", "month", "year"] as Bucket[]).map((b) => (
              <button key={b} onClick={() => setBucket(b)}
                className={`px-3 py-1 uppercase-tracked ${bucket === b ? "bg-primary text-primary-foreground" : "hover:text-primary"}`}>
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Page views" value={totals.views} />
        <Stat label="Link clicks" value={totals.clicks} />
        <Stat label="Bookings" value={totals.bookings} />
        <Stat label="Total events" value={events.length} />
      </div>

      <div>
        <h3 className="font-display text-xl mb-3">Activity over time</h3>
        {series.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet for this range.</p>
        ) : (
          <div className="space-y-2">
            {series.map(([label, v]) => {
              const total = v.views + v.clicks + v.bookings;
              return (
                <div key={label} className="grid grid-cols-[100px_1fr_auto] gap-3 items-center text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex h-5 bg-secondary overflow-hidden">
                    <div className="bg-primary/80" style={{ width: `${(v.views / max) * 100}%` }} title={`${v.views} views`} />
                    <div className="bg-chart-2" style={{ width: `${(v.clicks / max) * 100}%` }} title={`${v.clicks} clicks`} />
                    <div className="bg-chart-3" style={{ width: `${(v.bookings / max) * 100}%` }} title={`${v.bookings} bookings`} />
                  </div>
                  <span className="tabular-nums">{total}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex gap-4 mt-3 text-[11px] uppercase-tracked text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary/80 inline-block" /> Views</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-chart-2 inline-block" /> Clicks</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-chart-3 inline-block" /> Bookings</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-display text-xl mb-3">Clicks by platform</h3>
          {Object.keys(totals.byPlatform).length === 0 ? (
            <p className="text-sm text-muted-foreground">No link clicks yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {Object.entries(totals.byPlatform).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                <li key={k} className="flex items-center justify-between border-b border-border pb-1">
                  <span className="uppercase-tracked text-muted-foreground">{k}</span>
                  <span className="tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="font-display text-xl mb-3">Top pages</h3>
          {Object.keys(totals.byPath).length === 0 ? (
            <p className="text-sm text-muted-foreground">No page views yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {Object.entries(totals.byPath).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => (
                <li key={k} className="flex items-center justify-between border-b border-border pb-1">
                  <span className="truncate">{k}</span>
                  <span className="tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-card p-4">
      <p className="uppercase-tracked text-muted-foreground text-[11px]">{label}</p>
      <p className="font-display text-3xl mt-2 tabular-nums">{value}</p>
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
          <input defaultValue={r.url}
            onBlur={(e) => e.target.value !== r.url && save(r.id, { url: e.target.value })}
            className="bg-transparent border-b border-border focus:border-primary outline-none py-2 text-sm"
            placeholder="https://…" />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" defaultChecked={r.is_visible}
              onChange={(e) => save(r.id, { is_visible: e.target.checked })} />
            Visible
          </label>
        </div>
      ))}
    </div>
  );
}
