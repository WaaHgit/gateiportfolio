// Shared Reviews types and client-side helpers.
// Public submission + token-based editing go through server functions
// (src/lib/reviews.functions.ts); this module holds types and admin reads/writes.
import { supabase } from "@/integrations/supabase/client";

export type ReviewStatus = "pending" | "live" | "archived";

export type Review = {
  id: string;
  email: string;
  client_name: string;
  rating: number;
  review_text: string;
  status: ReviewStatus;
  edit_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  archived_at: string | null;
};

export type PublicReview = Pick<
  Review,
  "id" | "client_name" | "rating" | "review_text" | "is_edited" | "approved_at" | "created_at"
>;

export const REVIEW_STATUSES: ReviewStatus[] = ["pending", "live", "archived"];

const ADMIN_COLUMNS =
  "id,email,client_name,rating,review_text,status,edit_count,is_edited,created_at,updated_at,approved_at,archived_at";

const PUBLIC_COLUMNS = "id,client_name,rating,review_text,is_edited,approved_at,created_at";

export function statusLabel(s: ReviewStatus) {
  return s === "live" ? "Live" : s === "pending" ? "Pending" : "Archived";
}

export async function fetchLiveReviews(): Promise<PublicReview[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(PUBLIC_COLUMNS)
    .eq("status", "live")
    .order("approved_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PublicReview[];
}

export async function fetchAllReviewsForAdmin(): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(ADMIN_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}

export async function updateReviewStatus(id: string, status: ReviewStatus): Promise<Review | null> {
  const { data, error } = await supabase
    .from("reviews")
    .update({ status })
    .eq("id", id)
    .select(ADMIN_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Review) ?? null;
}

export type ReviewPatch = Partial<Pick<Review, "client_name" | "review_text" | "rating">>;

export async function editReview(id: string, patch: ReviewPatch): Promise<Review | null> {
  const { data, error } = await supabase
    .from("reviews")
    .update(patch)
    .eq("id", id)
    .select(ADMIN_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Review) ?? null;
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}
