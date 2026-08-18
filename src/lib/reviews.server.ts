// Server-only helpers for review emails (Gmail connector gateway).
const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const SITE_URL = "https://gateiportfolio.lovable.app";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function b64url(s: string) {
  return Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendMail(to: string, subject: string, html: string) {
  const lov = process.env['LOVABLE_API_KEY'];
  const gmailKey = process.env['GOOGLE_MAIL_API_KEY'];
  if (!lov || !gmailKey) {
    console.warn("[reviews] mail skipped — connector keys missing");
    return false;
  }
  const mime = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    ``,
    html,
  ].join("\r\n");

  try {
    const res = await fetch(`${GMAIL_GATEWAY}/users/me/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lov}`,
        "X-Connection-Api-Key": gmailKey,
      },
      body: JSON.stringify({ raw: b64url(mime) }),
    });
    if (!res.ok) {
      console.error("[reviews] gmail send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[reviews] gmail send error", err);
    return false;
  }
}

function shell(body: string) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#fff;color:#111;padding:24px;max-width:600px;margin:0 auto">${body}
<p style="color:#999;font-size:11px;margin-top:32px">GATEI · automated message</p></body></html>`;
}

export async function sendEditLinkEmail(opts: { to: string; name: string; token: string; firstTime: boolean }) {
  const url = `${SITE_URL}/reviews/edit?token=${encodeURIComponent(opts.token)}`;
  const intro = opts.firstTime
    ? "Thank you for your review — it has been received."
    : "Here is the secure link to edit your review.";
  return sendMail(
    opts.to,
    opts.firstTime ? "Thank you for your review — GATEI" : "Edit your GATEI review",
    shell(`<h2 style="font-family:Georgia,serif;font-weight:normal">Hi ${escapeHtml(opts.name)},</h2>
<p style="font-size:14px;line-height:1.6">${intro}</p>
<p style="font-size:14px;line-height:1.6">You can make <strong>one</strong> edit to your review using the secure link below. The link expires in 7 days.</p>
<p style="margin:28px 0"><a href="${url}" style="background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:4px;font-size:13px;letter-spacing:.06em;text-transform:uppercase">Edit my review</a></p>
<p style="font-size:12px;color:#666;word-break:break-all">${url}</p>`)
  );
}

export async function sendAdminNewReviewEmail(opts: { name: string; email: string; rating: number; text: string }) {
  return sendMail(
    "projectfilesav@gmail.com",
    `New review from ${opts.name} (${opts.rating}★)`,
    shell(`<h2 style="font-family:Georgia,serif;font-weight:normal">New review awaiting moderation</h2>
<table style="width:100%;font-size:14px;border-collapse:collapse">
<tr><td style="color:#666;padding:6px 0;width:100px">Name</td><td><strong>${escapeHtml(opts.name)}</strong></td></tr>
<tr><td style="color:#666;padding:6px 0">Email</td><td>${escapeHtml(opts.email)}</td></tr>
<tr><td style="color:#666;padding:6px 0">Rating</td><td>${opts.rating} / 5</td></tr>
</table>
<div style="margin-top:18px;padding:16px;background:#f6f6f6;border-radius:6px;white-space:pre-wrap;font-size:14px">${escapeHtml(opts.text)}</div>
<p style="margin:28px 0"><a href="${SITE_URL}/admin?tab=reviews" style="background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:4px;font-size:13px;letter-spacing:.06em;text-transform:uppercase">Open moderation</a></p>`)
  );
}
