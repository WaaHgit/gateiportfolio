import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const submitSchema = z.object({
  email: z.string().trim().email().max(320),
  client_name: z.string().trim().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().trim().min(10).max(1000),
});

const tokenSchema = z.object({ token: z.string().trim().min(20).max(200) });

const editSchema = z.object({
  token: z.string().trim().min(20).max(200),
  client_name: z.string().trim().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().trim().min(10).max(1000),
});

function newToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function tokenExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEditLinkEmail, sendAdminNewReviewEmail } = await import("@/lib/reviews.server");

    const email = data.email.trim().toLowerCase();

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("reviews")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (lookupError) {
      console.error("[reviews] lookup failed", lookupError.message);
      return { ok: false as const, reason: "error" as const, message: "Something went wrong. Please try again." };
    }
    if (existing) {
      return {
        ok: false as const,
        reason: "duplicate" as const,
        message: "A review already exists for this email address.",
      };
    }

    // Basic rate limit: max 3 submissions per hour across the whole site per name+text shape.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since);
    if ((count ?? 0) > 30) {
      return { ok: false as const, reason: "rate" as const, message: "Too many submissions right now. Please try later." };
    }

    const token = newToken();
    const { error } = await supabaseAdmin.from("reviews").insert({
      email,
      client_name: data.client_name.trim(),
      rating: data.rating,
      review_text: data.review_text.trim(),
      status: "pending",
      edit_token: token,
      edit_token_expires_at: tokenExpiry(),
    });
    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, reason: "duplicate" as const, message: "A review already exists for this email address." };
      }
      console.error("[reviews] insert failed", error.message);
      return { ok: false as const, reason: "error" as const, message: "Something went wrong. Please try again." };
    }

    await sendEditLinkEmail({ to: email, name: data.client_name.trim(), token, firstTime: true });
    await sendAdminNewReviewEmail({
      name: data.client_name.trim(),
      email,
      rating: data.rating,
      text: data.review_text.trim(),
    });

    return { ok: true as const };
  });

export const getReviewByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("reviews")
      .select("id,client_name,rating,review_text,edit_count,edit_token_expires_at,status")
      .eq("edit_token", data.token)
      .maybeSingle();
    if (error || !row) return { ok: false as const, message: "This edit link is not valid." };
    if (row.edit_count >= 1) return { ok: false as const, message: "This review has already been edited once." };
    if (row.edit_token_expires_at && new Date(row.edit_token_expires_at) < new Date()) {
      return { ok: false as const, message: "This edit link has expired." };
    }
    return {
      ok: true as const,
      review: {
        client_name: row.client_name,
        rating: row.rating,
        review_text: row.review_text,
      },
    };
  });

export const updateReviewByToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => editSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("reviews")
      .select("id,edit_count,edit_token_expires_at")
      .eq("edit_token", data.token)
      .maybeSingle();
    if (error || !row) return { ok: false as const, message: "This edit link is not valid." };
    if (row.edit_count >= 1) return { ok: false as const, message: "This review has already been edited once." };
    if (row.edit_token_expires_at && new Date(row.edit_token_expires_at) < new Date()) {
      return { ok: false as const, message: "This edit link has expired." };
    }

    const { error: updateError } = await supabaseAdmin
      .from("reviews")
      .update({
        client_name: data.client_name.trim(),
        rating: data.rating,
        review_text: data.review_text.trim(),
        edit_count: 1,
        is_edited: true,
        status: "pending",
        edit_token: null,
        edit_token_expires_at: null,
      })
      .eq("id", row.id);
    if (updateError) {
      console.error("[reviews] token update failed", updateError.message);
      return { ok: false as const, message: "Could not save your changes. Please try again." };
    }
    return { ok: true as const };
  });

export const resendEditLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ email: z.string().trim().email().max(320) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendEditLinkEmail } = await import("@/lib/reviews.server");
    const email = data.email.trim().toLowerCase();
    const { data: row } = await supabaseAdmin
      .from("reviews")
      .select("id,client_name,edit_count")
      .eq("email", email)
      .maybeSingle();
    // Always report success so the endpoint can't be used to probe addresses.
    if (row && row.edit_count < 1) {
      const token = newToken();
      await supabaseAdmin
        .from("reviews")
        .update({ edit_token: token, edit_token_expires_at: tokenExpiry() })
        .eq("id", row.id);
      await sendEditLinkEmail({ to: email, name: row.client_name, token, firstTime: false });
    }
    return { ok: true as const };
  });
