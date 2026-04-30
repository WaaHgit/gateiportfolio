// Server-only helpers for booking notifications (Google Docs + Gmail).
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DOCS_GATEWAY = "https://connector-gateway.lovable.dev/google_docs/v1";
const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const NOTIFY_TO = "projectfilesav@gmail.com";
const DOC_TITLE = "GATEI — Bookings Log";

function authHeaders() {
  const lov = process.env.LOVABLE_API_KEY;
  const docsKey = process.env.GOOGLE_DOCS_API_KEY;
  const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lov) throw new Error("LOVABLE_API_KEY missing");
  if (!docsKey) throw new Error("GOOGLE_DOCS_API_KEY missing");
  if (!gmailKey) throw new Error("GOOGLE_MAIL_API_KEY missing");
  return { lov, docsKey, gmailKey };
}

async function getOrCreateMasterDocId(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "bookings_doc_id")
    .maybeSingle();
  if (data?.value) return data.value;

  const { lov, docsKey } = authHeaders();
  const res = await fetch(`${DOCS_GATEWAY}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lov}`,
      "X-Connection-Api-Key": docsKey,
    },
    body: JSON.stringify({ title: DOC_TITLE }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Docs create failed [${res.status}]: ${JSON.stringify(body)}`);
  const id = body.documentId as string;
  await supabaseAdmin.from("app_settings").upsert({ key: "bookings_doc_id", value: id });
  return id;
}

export type BookingPayload = {
  full_name: string;
  email: string;
  phone: string;
  service: string;
  description: string;
  preferred_date: string | null;
};

function buildEntry(b: BookingPayload): string {
  const ts = new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" });
  return [
    `\n────────────────────────────────────────\n`,
    `📌 NEW BOOKING — ${ts}\n`,
    `Name:        ${b.full_name}\n`,
    `Email:       ${b.email}\n`,
    `Phone:       ${b.phone}\n`,
    `Service:     ${b.service}\n`,
    `Pref. date:  ${b.preferred_date ?? "—"}\n`,
    `\nMessage:\n${b.description}\n`,
  ].join("");
}

async function appendToDoc(docId: string, text: string) {
  const { lov, docsKey } = authHeaders();
  // Get end index
  const meta = await fetch(`${DOCS_GATEWAY}/documents/${docId}`, {
    headers: { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": docsKey },
  });
  const metaJson = await meta.json();
  if (!meta.ok) throw new Error(`Docs read failed [${meta.status}]: ${JSON.stringify(metaJson)}`);
  const content = metaJson.body?.content ?? [];
  const last = content[content.length - 1];
  const endIndex = Math.max(1, (last?.endIndex ?? 2) - 1);

  const res = await fetch(`${DOCS_GATEWAY}/documents/${docId}:batchUpdate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lov}`,
      "X-Connection-Api-Key": docsKey,
    },
    body: JSON.stringify({
      requests: [{ insertText: { location: { index: endIndex }, text } }],
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Docs append failed [${res.status}]: ${JSON.stringify(j)}`);
}

function b64url(s: string) {
  return Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendNotificationEmail(b: BookingPayload, docId: string) {
  const { lov, gmailKey } = authHeaders();
  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  const replySubject = encodeURIComponent(`Re: Your GATEI booking — ${b.service}`);
  const replyBody = encodeURIComponent(
    `Hi ${b.full_name},\n\nThanks for reaching out to GATEI regarding "${b.service}".\n\n` +
      `\n\n— GATEI\n\n----\nYour message:\n${b.description}`
  );
  const replyLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(b.email)}&su=${replySubject}&body=${replyBody}`;

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#fff;color:#111;padding:24px;max-width:640px;margin:0 auto">
<h2 style="margin:0 0 4px;font-family:Georgia,serif;font-weight:normal">New booking — ${escapeHtml(b.service)}</h2>
<p style="color:#666;margin:0 0 24px;font-size:13px">${new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
  <tr><td style="padding:6px 0;color:#666;width:120px">Name</td><td><strong>${escapeHtml(b.full_name)}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#666">Email</td><td><a href="mailto:${escapeHtml(b.email)}">${escapeHtml(b.email)}</a></td></tr>
  <tr><td style="padding:6px 0;color:#666">Phone</td><td><a href="tel:${escapeHtml(b.phone)}">${escapeHtml(b.phone)}</a></td></tr>
  <tr><td style="padding:6px 0;color:#666">Pref. date</td><td>${escapeHtml(b.preferred_date ?? "—")}</td></tr>
</table>
<div style="margin-top:20px;padding:16px;background:#f6f6f6;border-radius:6px;white-space:pre-wrap;font-size:14px">${escapeHtml(b.description)}</div>
<div style="margin-top:28px;display:flex;gap:12px;flex-wrap:wrap">
  <a href="${replyLink}" style="background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;display:inline-block;font-size:13px;letter-spacing:.06em;text-transform:uppercase">Reply to client</a>
  <a href="${docUrl}" style="background:#fff;color:#111;border:1px solid #111;text-decoration:none;padding:12px 20px;border-radius:4px;display:inline-block;font-size:13px;letter-spacing:.06em;text-transform:uppercase">Open bookings doc</a>
</div>
<p style="color:#999;font-size:11px;margin-top:32px">GATEI bookings · automated notification</p>
</body></html>`;

  const mime = [
    `To: ${NOTIFY_TO}`,
    `Reply-To: ${b.email}`,
    `Subject: =?UTF-8?B?${Buffer.from(`📌 New booking — ${b.full_name} (${b.service})`).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    html,
  ].join("\r\n");

  const res = await fetch(`${GMAIL_GATEWAY}/users/me/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lov}`,
      "X-Connection-Api-Key": gmailKey,
    },
    body: JSON.stringify({ raw: b64url(mime) }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Gmail send failed [${res.status}]: ${JSON.stringify(j)}`);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export async function notifyBooking(b: BookingPayload) {
  const docId = await getOrCreateMasterDocId();
  await appendToDoc(docId, buildEntry(b));
  await sendNotificationEmail(b, docId);
}
