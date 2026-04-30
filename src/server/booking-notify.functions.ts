import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifyBooking } from "./booking-notify.server";

const BookingSchema = z.object({
  full_name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(3).max(50),
  service: z.string().trim().min(1).max(200),
  description: z.string().trim().min(10).max(5000),
  preferred_date: z.string().nullable().optional(),
});

// Public endpoint: writes the booking server-side and triggers Doc + email notify.
// Honeypot/timetrap is handled client-side; basic abuse via direct invocation is
// limited by RLS-level field length checks already in place.
export const submitBooking = createServerFn({ method: "POST" })
  .inputValidator((data) => BookingSchema.parse(data))
  .handler(async ({ data }) => {
    const payload = { ...data, preferred_date: data.preferred_date ?? null };
    const { error } = await supabaseAdmin.from("bookings").insert(payload);
    if (error) throw new Error(`Could not save booking: ${error.message}`);
    // Best-effort notify; do not fail the user submission if Docs/Gmail fail.
    try {
      await notifyBooking(payload);
    } catch (e) {
      console.error("[booking-notify] failed:", e);
    }
    return { ok: true };
  });
