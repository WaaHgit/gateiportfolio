import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { supabase as browserSupabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CAL_GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const TARGET_CALENDAR = "projectfilesav@gmail.com";

const attachAuthHeader = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await browserSupabase.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});

const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !data) throw new Error("Admin only");
    return next({ context });
  });

const InputSchema = z.object({ booking_id: z.string().uuid() });

export const confirmBookingAndAddToCalendar = createServerFn({ method: "POST" })
  .middleware([attachAuthHeader, requireAdmin])
  .inputValidator((d) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (bErr || !booking) throw new Error("Booking not found");

    if (!booking.event_date) {
      return { ok: false, calendar_added: false, reason: "Set an event date before confirming." };
    }

    // Mark agreement confirmed regardless
    await supabaseAdmin
      .from("bookings")
      .update({ agreement_confirmed: true, status: "confirmed" })
      .eq("id", booking.id);

    // Try to push to Google Calendar — gracefully no-op if not connected
    const lov = process.env.LOVABLE_API_KEY;
    const calKey = process.env.GOOGLE_CALENDAR_API_KEY;
    if (!lov || !calKey) {
      return {
        ok: true,
        calendar_added: false,
        reason: "Google Calendar isn't connected yet. Connect it in Connectors → Google Calendar.",
      };
    }

    try {
      const time = (booking.event_time as string | null) ?? "10:00:00";
      const startLocal = `${booking.event_date}T${time.length === 5 ? time + ":00" : time}`;
      const startDate = new Date(`${startLocal}+03:00`); // Africa/Nairobi
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const description =
        `Client: ${booking.full_name}\n` +
        `Email: ${booking.email}\n` +
        `Phone: ${booking.phone}\n` +
        `Service: ${booking.service}\n\n` +
        `Brief from client:\n${booking.description ?? ""}\n\n` +
        (booking.internal_notes ? `Admin notes:\n${booking.internal_notes}\n` : "");

      const body: Record<string, unknown> = {
        summary: `${booking.service} — ${booking.full_name}`,
        description,
        location: booking.venue ?? undefined,
        start: { dateTime: startDate.toISOString(), timeZone: "Africa/Nairobi" },
        end: { dateTime: endDate.toISOString(), timeZone: "Africa/Nairobi" },
        attendees: booking.email ? [{ email: booking.email }] : undefined,
      };

      const path = booking.calendar_event_id
        ? `${CAL_GATEWAY}/calendars/${encodeURIComponent(TARGET_CALENDAR)}/events/${booking.calendar_event_id}`
        : `${CAL_GATEWAY}/calendars/${encodeURIComponent(TARGET_CALENDAR)}/events`;
      const method = booking.calendar_event_id ? "PUT" : "POST";

      const res = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lov}`,
          "X-Connection-Api-Key": calKey,
        },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) {
        console.error("Calendar API error", res.status, j);
        return {
          ok: true,
          calendar_added: false,
          reason: `Calendar error (${res.status}). The booking is confirmed; you can retry once the connection is fixed.`,
        };
      }

      await supabaseAdmin
        .from("bookings")
        .update({ calendar_event_id: j.id })
        .eq("id", booking.id);

      return { ok: true, calendar_added: true, htmlLink: j.htmlLink ?? null };
    } catch (e) {
      console.error("Calendar push failed", e);
      return {
        ok: true,
        calendar_added: false,
        reason: "Calendar push failed; booking is still confirmed.",
      };
    }
  });
