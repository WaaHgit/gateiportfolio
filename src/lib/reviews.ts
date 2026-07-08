// Shared Reviews types and helpers — used by public site and admin dashboard.
import { supabase } from "@/integrations/supabase/client";

export type ReviewStatus = "pending" | "approved" | "rejected" | "archived";

export type Review = {
  id: string;
  client_name: string;
  review_text: string;
  rating: number;
  company: string | null;
  position: string | null;
  profile_image_url: string | null;
  status: ReviewStatus;
  submission_date: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
};

export type ReviewInsert = {
  client_name: string;
  review_text: string;
  rating: number;
  company?: string | null;
  position?: string | null;
  profile_image_url?: string | null;
};

export type ReviewPatch = Partial<
  Pick<
    Review,
    | "client_name"
    | "review_text"
    | "rating"
    | "company"
    | "position"
    | "profile_image_url"
    | "submission_date"
  >
>;

export const REVIEW_STATUSES: ReviewStatus[] = ["pending", "approved", "rejected", "archived"];

const REVIEW_COLUMNS =
  "id,client_name,review_text,rating,company,position,profile_image_url,status,submission_date,created_at,updated_at,approved_at,rejected_at,archived_at,deleted_at";

export async function fetchApprovedReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .eq("status", "approved")
    .is("deleted_at", null)
    .order("approved_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}

export async function fetchAllReviewsForAdmin(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_COLUMNS)
    .is("deleted_at", null)
    .order("submission_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}

export async function insertReview(payload: ReviewInsert) {
  // status is forced to 'pending' server-side by a trigger — never trust client input.
  const { error } = await supabase.from("reviews").insert({
    client_name: payload.client_name,
    review_text: payload.review_text,
    rating: payload.rating,
    company: payload.company ?? null,
    position: payload.position ?? null,
    profile_image_url: payload.profile_image_url ?? null,
  });
  if (error) throw error;
}

export async function updateReviewStatus(id: string, status: ReviewStatus) {
  // Timestamp for the new status is set by a DB trigger — we only send status.
  const { data, error } = await supabase
    .from("reviews")
    .update({ status })
    .eq("id", id)
    .is("deleted_at", null)
    .select(REVIEW_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Review) ?? null;
}

export async function editReview(id: string, patch: ReviewPatch) {
  const { data, error } = await supabase
    .from("reviews")
    .update(patch)
    .eq("id", id)
    .select(REVIEW_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Review) ?? null;
}

export async function softDeleteReview(id: string) {
  const { error } = await supabase
    .from("reviews")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
