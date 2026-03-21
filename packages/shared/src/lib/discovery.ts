import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReviewKind } from "../types/review";

export interface DiscoveryItem {
  spotifyId: string;
  kind: ReviewKind;
  title: string;
  artist: string;
  artworkUrl: string | null;
  reviewCount: number;
  averageRating: number | null;
}

function mapDiscoveryRow(row: Record<string, unknown>): DiscoveryItem {
  return {
    spotifyId: row.spotify_id as string,
    kind: row.review_type as ReviewKind,
    title: row.title as string,
    artist: row.artist as string,
    artworkUrl: (row.artwork_url as string | null) ?? null,
    reviewCount: Number(row.review_count ?? row.review_velocity ?? 0),
    averageRating:
      row.avg_rating === null || row.avg_rating === undefined
        ? null
        : Number(row.avg_rating)
  };
}

export async function fetchMostReviewedWeek(
  client: SupabaseClient,
  limit = 20
): Promise<DiscoveryItem[]> {
  const { data, error } = await client
    .from("mv_most_reviewed_week")
    .select("*")
    .order("review_count", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapDiscoveryRow(row as Record<string, unknown>));
}

export async function fetchHiddenGems(
  client: SupabaseClient,
  limit = 20
): Promise<DiscoveryItem[]> {
  const { data, error } = await client
    .from("mv_hidden_gems")
    .select("*")
    .order("avg_rating", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapDiscoveryRow(row as Record<string, unknown>));
}

export async function fetchHotRightNow(
  client: SupabaseClient,
  limit = 20
): Promise<DiscoveryItem[]> {
  const { data, error } = await client
    .from("mv_hot_right_now")
    .select("*")
    .order("review_velocity", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapDiscoveryRow(row as Record<string, unknown>));
}
