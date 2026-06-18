import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/auth";
import { toast } from "sonner";
import { Trash2, UploadCloud, LogOut, Loader2, Star, CalendarCheck, BarChart3, Eye, MousePointerClick, CalendarDays, Activity } from "lucide-react";
import { confirmBookingAndAddToCalendar } from "@/lib/calendar.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — GATEI" }] }),
  component: AdminPage,
});

type Tab = "upload" | "portfolio" | "reviews" | "bookings" | "insights" | "links" | "about";

function AdminPage() {
  const { admin, user, loading, error, retry } = useIsAdmin();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "upload";
    const t = new URLSearchParams(window.location.search).get("tab");
    return (["upload","portfolio","reviews","bookings","insights","links","about"] as Tab[]).includes(t as Tab) ? (t as Tab) : "upload";
  });

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
        {(["upload", "portfolio", "about", "reviews", "bookings", "insights", "links"] as Tab[]).map((t) => (
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
        {tab === "about" && <AboutPanel />}
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
  const stagedSectionRef = useRef<HTMLDivElement>(null);

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
    // Mobile fix: ensure user sees the preview right after picking files
    requestAnimationFrame(() => {
      stagedSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

      <div ref={stagedSectionRef}>
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
              <article key={item.id} className="border border-border bg-card p-4 grid gap-4 md:grid-cols-[260px_1fr]">
                <div className="overflow-hidden border border-border bg-black min-h-[200px] flex items-center justify-center">
                  {item.type === "image" && item.previewUrl && (
                    <img src={item.previewUrl} alt={item.title || item.file.name} className="max-h-[260px] w-auto max-w-full object-contain" />
                  )}
                  {item.type === "video" && item.previewUrl && (
                    <video src={item.previewUrl} controls playsInline className="max-h-[260px] w-full object-contain bg-black" />
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
                <div className="aspect-square w-full overflow-hidden bg-black flex items-center justify-center">
                  {it.type === "image" && <img src={it.file_url} alt={it.title ?? ""} loading="lazy" className="max-w-full max-h-full object-contain" />}
                  {it.type === "video" && <video src={it.file_url} muted playsInline preload="metadata" className="max-w-full max-h-full object-contain" />}
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


function EditMediaModal({ item, onClose, onSaved }: { item: RecentItem; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(item.title ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [category, setCategory] = useState<UploadCategory>(item.category);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!newFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(newFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [newFile]);

  function detectType(file: File): MediaKind | null {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";
    if (file.type.startsWith("audio/")) return "audio";
    return null;
  }

  async function save() {
    setSaving(true);
    try {
      const patch: {
        title: string | null; description: string | null; category: UploadCategory;
        file_url?: string; storage_path?: string; type?: MediaKind; mime_type?: string; size_bytes?: number;
      } = {
        title: title || null,
        description: description || null,
        category,
      };
      if (newFile) {
        const type = detectType(newFile);
        if (!type) throw new Error("Unsupported file type");
        const ext = newFile.name.split(".").pop() ?? "bin";
        const path = `${type}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("media").upload(path, newFile, {
          contentType: newFile.type || "application/octet-stream",
          cacheControl: "31536000",
          upsert: false,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
        patch.file_url = pub.publicUrl;
        patch.storage_path = path;
        patch.type = type;
        patch.mime_type = newFile.type;
        patch.size_bytes = newFile.size;
      }
      const { error } = await supabase.from("portfolio_items").update(patch).eq("id", item.id);
      if (error) throw error;
      if (newFile && item.storage_path) {
        await supabase.storage.from("media").remove([item.storage_path]);
      }
      toast.success("Saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const showType = newFile ? detectType(newFile) : item.type;
  const showUrl = newFile ? previewUrl : item.file_url;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border max-w-2xl w-full max-h-[90vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-2xl">Edit media</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="bg-secondary border border-border min-h-[200px] flex items-center justify-center mb-4">
          {showType === "image" && showUrl && <img src={showUrl} alt="" className="max-h-[40vh] object-contain" />}
          {showType === "video" && showUrl && <video src={showUrl} controls className="max-h-[40vh]" />}
          {showType === "audio" && showUrl && <audio src={showUrl} controls className="w-full px-4" />}
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="uppercase-tracked text-muted-foreground text-xs">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full bg-background border border-border focus:border-primary outline-none py-2 px-3" />
          </label>
          <label className="block">
            <span className="uppercase-tracked text-muted-foreground text-xs">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full bg-background border border-border focus:border-primary outline-none p-2" />
          </label>
          <label className="block">
            <span className="uppercase-tracked text-muted-foreground text-xs">Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as UploadCategory)} className="mt-1 w-full bg-background border border-border focus:border-primary outline-none py-2 px-3">
              <option value="photography">Photography</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="graphics">Graphics</option>
            </select>
          </label>
          <div>
            <button onClick={() => fileRef.current?.click()} className="uppercase-tracked text-xs border border-border px-3 py-2 hover:border-primary">
              {newFile ? `New file: ${newFile.name}` : "Swap file (optional)"}
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setNewFile(f); e.target.value = ""; }} />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={save} disabled={saving} className="uppercase-tracked text-xs bg-primary text-primary-foreground px-4 py-2 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={onClose} disabled={saving} className="uppercase-tracked text-xs border border-border px-4 py-2 hover:border-primary disabled:opacity-50">Cancel</button>
          </div>
        </div>
      </div>
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
  message: string;
  rating: number;
  avatar_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function ReviewsPanel() {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: allData, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(`Could not load reviews: ${error.message}`);
      setRows([]);
      setLoading(false);
      return;
    }
    const all = (allData as ReviewRow[]) ?? [];
    setCounts({
      all: all.length,
      pending: all.filter((r) => r.status === "pending").length,
      approved: all.filter((r) => r.status === "approved").length,
      rejected: all.filter((r) => r.status === "rejected").length,
    });
    setRows(all);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Realtime: new submissions appear instantly
  useEffect(() => {
    const ch = supabase
      .channel("admin-reviews")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRows = filter === "all" ? rows : rows.filter((r) => r.status === filter);

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
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`uppercase-tracked text-xs px-3 py-2 ${filter === f ? "text-primary border-b-2 border-primary -mb-3" : "text-muted-foreground hover:text-foreground"}`}>
            {f} <span className="ml-1 opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews here.</p>
      ) : (
        filteredRows.map((r) => (
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
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</p>
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
type BookingStatus = "pending" | "confirmed" | "declined" | "done";
type BookingFilter = "all" | "pending" | "confirmed" | "upcoming" | "done" | "declined";

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
  internal_notes: string | null;
  calendar_event_id: string | null;
};

function isUpcoming(b: BookingRow) {
  if (b.status !== "confirmed" || !b.event_date) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(b.event_date) >= today;
}

function BookingsPanel() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [filter, setFilter] = useState<BookingFilter>("pending");
  const [confirming, setConfirming] = useState<BookingRow | null>(null);
  const [editing, setEditing] = useState<BookingRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const focusedId = useRef<string | null>(null);

  async function load() {
    const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    setRows((data as BookingRow[]) ?? []);
  }
  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-bookings-watch")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Deep-link: /admin?id=X scrolls to and highlights that booking
  useEffect(() => {
    if (typeof window === "undefined" || rows.length === 0 || focusedId.current) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;
    const target = rows.find((r) => r.id === id);
    if (!target) return;
    focusedId.current = id;
    setFilter("all");
    requestAnimationFrame(() => {
      document.getElementById(`booking-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "upcoming") return rows.filter(isUpcoming);
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  async function patch(id: string, p: Partial<BookingRow>) {
    const { error } = await supabase.from("bookings").update(p).eq("id", id);
    if (error) toast.error(error.message);
    else load();
  }

  async function decline(id: string) {
    if (!confirm("Decline this booking? You can move it back to Pending later.")) return;
    await patch(id, { status: "declined" });
    toast.success("Booking declined");
  }

  async function moveBack(id: string, to: BookingStatus) {
    await patch(id, { status: to });
    toast.success(`Moved to ${to}`);
  }

  async function markDone(id: string) {
    await patch(id, { status: "done" });
    toast.success("Marked as done");
  }

  async function reschedule(id: string) {
    if (!confirm("Move this booking back to Pending? All details are preserved.")) return;
    await patch(id, { status: "pending", agreement_confirmed: false });
    toast.success("Sent back to Pending — all details preserved");
  }

  async function del(id: string) {
    if (!confirm("Delete booking permanently?")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="space-y-5">
      <BookingAnalytics rows={rows} active={filter} onPick={setFilter} />

      <div className="flex flex-wrap gap-1 border-b border-border">
        {(["all", "pending", "confirmed", "upcoming", "done", "declined"] as BookingFilter[]).map((f) => {
          const count =
            f === "all" ? rows.length :
            f === "upcoming" ? rows.filter(isUpcoming).length :
            rows.filter((r) => r.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`uppercase-tracked text-xs px-3 py-2 -mb-px border-b-2 transition-colors ${filter === f ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {f} <span className="ml-1 tabular-nums opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="text-muted-foreground text-sm py-8 text-center">No bookings in this view.</p>}

      {filtered.map((b) => {
        const upcoming = isUpcoming(b);
        return (
          <article key={b.id} id={`booking-${b.id}`}
            className={`border bg-card p-5 transition-colors ${focusedId.current === b.id ? "border-primary" : "border-border"}`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-xl truncate">{b.full_name}</h3>
                  <StatusBadge status={(b.status as BookingStatus) ?? "pending"} upcoming={upcoming} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{new Date(b.created_at).toLocaleString()} · {b.service}</p>
              </div>
              <button onClick={() => del(b.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Delete">
                <Trash2 size={14} />
              </button>
            </div>

            <div className="mt-3 grid sm:grid-cols-3 gap-3 text-sm">
              <a href={`mailto:${b.email}`} className="hover:text-primary truncate">{b.email}</a>
              <a href={`tel:${b.phone}`} className="hover:text-primary">{b.phone}</a>
              <span className="text-muted-foreground">{b.preferred_date ? `Preferred: ${b.preferred_date}` : "No preferred date"}</span>
            </div>

            <p className="mt-3 text-sm whitespace-pre-wrap">{b.description}</p>

            {(b.event_date || b.venue || b.internal_notes) && (
              <div className="mt-4 grid sm:grid-cols-3 gap-3 text-xs bg-secondary/40 border border-border p-3">
                <div><span className="uppercase-tracked text-muted-foreground block">Event</span>{b.event_date ?? "—"} {b.event_time ? `· ${b.event_time}` : ""}</div>
                <div><span className="uppercase-tracked text-muted-foreground block">Venue</span>{b.venue ?? "—"}</div>
                <div className="sm:col-span-3"><span className="uppercase-tracked text-muted-foreground block">Notes</span>{b.internal_notes ?? "—"}</div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {b.status === "pending" && (
                <>
                  <button onClick={() => setConfirming(b)} disabled={busy === b.id}
                    className="uppercase-tracked text-xs bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50">Confirm</button>
                  <button onClick={() => decline(b.id)}
                    className="uppercase-tracked text-xs border border-border px-3 py-2 hover:border-destructive">Decline</button>
                </>
              )}
              {b.status === "confirmed" && (
                <>
                  <button onClick={() => markDone(b.id)}
                    className="uppercase-tracked text-xs bg-primary text-primary-foreground px-3 py-2">Mark done</button>
                  <button onClick={() => reschedule(b.id)}
                    className="uppercase-tracked text-xs border border-border px-3 py-2 hover:border-primary">Reschedule</button>
                  <button onClick={() => setEditing(b)}
                    className="uppercase-tracked text-xs border border-border px-3 py-2 hover:border-primary">Edit details</button>
                  {b.calendar_event_id && (
                    <span className="text-[11px] uppercase-tracked text-primary flex items-center gap-1 self-center ml-1">
                      <CalendarCheck size={12} /> on calendar
                    </span>
                  )}
                </>
              )}
              {b.status === "declined" && (
                <button onClick={() => moveBack(b.id, "pending")}
                  className="uppercase-tracked text-xs border border-border px-3 py-2 hover:border-primary">Move back to Pending</button>
              )}
              {b.status === "done" && (
                <button onClick={() => moveBack(b.id, "confirmed")}
                  className="uppercase-tracked text-xs border border-border px-3 py-2 hover:border-primary">Reopen</button>
              )}
            </div>
          </article>
        );
      })}

      {confirming && (
        <ConfirmBookingModal booking={confirming}
          onClose={() => setConfirming(null)}
          onDone={() => { setConfirming(null); load(); }}
          setBusy={setBusy} />
      )}
      {editing && (
        <ConfirmBookingModal booking={editing} editMode
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); load(); }}
          setBusy={setBusy} />
      )}
    </div>
  );
}

function StatusBadge({ status, upcoming }: { status: BookingStatus; upcoming: boolean }) {
  const map: Record<string, string> = {
    pending: "bg-secondary text-foreground",
    confirmed: "bg-primary/20 text-primary",
    declined: "bg-destructive/20 text-destructive",
    done: "bg-muted text-muted-foreground",
  };
  return (
    <span className="flex items-center gap-1">
      <span className={`uppercase-tracked text-[10px] px-2 py-0.5 ${map[status] ?? "bg-secondary"}`}>{status}</span>
      {upcoming && <span className="uppercase-tracked text-[10px] px-2 py-0.5 bg-primary text-primary-foreground">upcoming</span>}
    </span>
  );
}

function ConfirmBookingModal({
  booking, editMode, onClose, onDone, setBusy,
}: {
  booking: BookingRow;
  editMode?: boolean;
  onClose: () => void;
  onDone: () => void;
  setBusy: (id: string | null) => void;
}) {
  const [eventDate, setEventDate] = useState(booking.event_date ?? "");
  const [eventTime, setEventTime] = useState(booking.event_time ?? "10:00");
  const [venue, setVenue] = useState(booking.venue ?? "");
  const [fullName, setFullName] = useState(booking.full_name);
  const [email, setEmail] = useState(booking.email);
  const [phone, setPhone] = useState(booking.phone);
  const [internalNotes, setInternalNotes] = useState(booking.internal_notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!eventDate) { toast.error("Event date is required"); return; }
    setSaving(true); setBusy(booking.id);
    try {
      const { error: upErr } = await supabase.from("bookings").update({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        event_date: eventDate,
        event_time: eventTime || null,
        venue: venue.trim() || null,
        internal_notes: internalNotes.trim() || null,
      }).eq("id", booking.id);
      if (upErr) throw upErr;

      if (!editMode) {
        const { data: conflicts } = await supabase
          .from("bookings")
          .select("id,full_name")
          .eq("event_date", eventDate)
          .eq("status", "confirmed")
          .neq("id", booking.id);
        if (conflicts && conflicts.length > 0) {
          const ok = confirm(`⚠️ ${eventDate} is already confirmed for ${conflicts.map((c) => c.full_name).join(", ")}. Continue anyway?`);
          if (!ok) { setSaving(false); setBusy(null); return; }
        }
      }

      const res = await confirmBookingAndAddToCalendar({ data: { booking_id: booking.id } });
      if (!res.ok) { toast.error(res.reason ?? "Could not confirm"); return; }
      if (res.calendar_added) toast.success(editMode ? "Updated and synced to Google Calendar ✅" : "Confirmed and added to Google Calendar ✅");
      else toast.success(`Saved. ${res.reason ?? ""}`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false); setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in-fade" onClick={onClose}>
      <div className="bg-card border border-border max-w-2xl w-full max-h-[92vh] overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-2xl">{editMode ? "Edit booking" : "Confirm booking"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <p className="text-xs text-muted-foreground mb-5">{editMode ? "Update details and push the change to Google Calendar." : "Set the event details, then we'll add it to projectfilesav@gmail.com calendar automatically."}</p>

        <div className="grid sm:grid-cols-2 gap-3">
          <Labeled label="Event date *">
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary outline-none px-2 py-2" />
          </Labeled>
          <Labeled label="Event time">
            <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary outline-none px-2 py-2" />
          </Labeled>
          <Labeled label="Venue" full>
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)}
              placeholder="Studio / location"
              className="w-full bg-background border border-border focus:border-primary outline-none px-2 py-2" />
          </Labeled>
          <Labeled label="Client name">
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary outline-none px-2 py-2" />
          </Labeled>
          <Labeled label="Client email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary outline-none px-2 py-2" />
          </Labeled>
          <Labeled label="Client phone" full>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-background border border-border focus:border-primary outline-none px-2 py-2" />
          </Labeled>
          <Labeled label="Notes (optional, internal only)" full>
            <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={3}
              placeholder="Private notes — also added to the calendar event description"
              className="w-full bg-background border border-border focus:border-primary outline-none p-2" />
          </Labeled>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={save} disabled={saving}
            className="uppercase-tracked text-xs bg-primary text-primary-foreground px-4 py-2 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={12} className="animate-spin" />}
            {editMode ? "Save & sync calendar" : "Confirm & add to calendar"}
          </button>
          <button onClick={onClose} disabled={saving}
            className="uppercase-tracked text-xs border border-border px-4 py-2 hover:border-primary disabled:opacity-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Labeled({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="uppercase-tracked text-muted-foreground text-[11px] block mb-1">{label}</span>
      {children}
    </label>
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
        <Stat label="Page views" value={totals.views} icon={<Eye size={16} />} />
        <Stat label="Link clicks" value={totals.clicks} icon={<MousePointerClick size={16} />} />
        <Stat label="Bookings" value={totals.bookings} icon={<CalendarDays size={16} />} />
        <Stat label="Total events" value={events.length} icon={<Activity size={16} />} />
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

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="border border-border bg-card p-5 hover:border-primary/50 transition-colors group">
      <div className="flex items-center justify-between text-muted-foreground group-hover:text-primary transition-colors">
        <p className="uppercase-tracked text-[11px]">{label}</p>
        {icon}
      </div>
      <p className="font-display text-4xl mt-3 tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

/* ============== ABOUT PHOTOS ============== */
function AboutPanel() {
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);
  const [busy, setBusy] = useState<1 | 2 | null>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);

  async function load() {
    const { data } = await supabase
      .from("app_settings")
      .select("key,value")
      .in("key", ["public_about_photo_1", "public_about_photo_2"]);
    const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
    setPhoto1(map.get("public_about_photo_1") || null);
    setPhoto2(map.get("public_about_photo_2") || null);
  }
  useEffect(() => { load(); }, []);

  async function upload(slot: 1 | 2, file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Image only"); return; }
    setBusy(slot);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `about/photo-${slot}-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        contentType: file.type, cacheControl: "31536000", upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path);
      const key = `public_about_photo_${slot}`;
      const { error } = await supabase.from("app_settings").upsert({ key, value: pub.publicUrl, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success("About photo updated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function clearSlot(slot: 1 | 2) {
    if (!confirm("Remove this photo from the About page?")) return;
    const key = `public_about_photo_${slot}`;
    const { error } = await supabase.from("app_settings").delete().eq("key", key);
    if (error) toast.error(error.message); else { toast.success("Removed"); load(); }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-muted-foreground">Upload the two photos that appear in cinematic reveal on the About page. JPEG/PNG/WebP — original quality.</p>
      <div className="grid md:grid-cols-2 gap-6">
        {([1, 2] as const).map((slot) => {
          const url = slot === 1 ? photo1 : photo2;
          const inputRef = slot === 1 ? ref1 : ref2;
          return (
            <div key={slot} className="border border-border bg-card p-4 space-y-3">
              <p className="uppercase-tracked text-primary text-xs">Photo {slot}</p>
              <div className="aspect-[4/5] bg-secondary border border-border overflow-hidden flex items-center justify-center">
                {url ? <img src={url} alt={`About ${slot}`} className="w-full h-full object-cover" /> : <span className="text-xs text-muted-foreground">No photo</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => inputRef.current?.click()} disabled={busy === slot}
                  className="uppercase-tracked text-xs bg-primary text-primary-foreground px-3 py-2 disabled:opacity-50">
                  {busy === slot ? "Uploading…" : url ? "Replace" : "Upload"}
                </button>
                {url && (
                  <button onClick={() => clearSlot(slot)} className="uppercase-tracked text-xs border border-border px-3 py-2 hover:border-destructive">Remove</button>
                )}
                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(slot, f); e.target.value = ""; }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============== BOOKING ANALYTICS ============== */
function BookingAnalytics({ rows, active, onPick }: { rows: BookingRow[]; active: BookingFilter; onPick: (f: BookingFilter) => void }) {
  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    confirmed: rows.filter((r) => r.status === "confirmed").length,
    upcoming: rows.filter(isUpcoming).length,
    done: rows.filter((r) => r.status === "done").length,
    declined: rows.filter((r) => r.status === "declined").length,
  }), [rows]);

  const cards: { key: BookingFilter; label: string; value: number }[] = [
    { key: "all", label: "Total", value: stats.total },
    { key: "pending", label: "Pending", value: stats.pending },
    { key: "confirmed", label: "Confirmed", value: stats.confirmed },
    { key: "upcoming", label: "Upcoming", value: stats.upcoming },
    { key: "done", label: "Done", value: stats.done },
    { key: "declined", label: "Declined", value: stats.declined },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-2">
      {cards.map((c) => (
        <button key={c.key} onClick={() => onPick(c.key)}
          className={`text-left border bg-card p-4 transition-colors ${active === c.key ? "border-primary" : "border-border hover:border-primary/50"}`}>
          <p className="uppercase-tracked text-[10px] text-muted-foreground">{c.label}</p>
          <p className="font-display text-3xl mt-2 tabular-nums">{c.value}</p>
        </button>
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
