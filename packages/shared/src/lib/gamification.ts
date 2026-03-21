import type { SupabaseClient } from "@supabase/supabase-js";

import type { User, UserLevel } from "../types/user";

export interface Badge {
  id: string;
  userId: string;
  badgeType: string;
  awardedAt: string;
}

export const LEVEL_THRESHOLDS: Record<UserLevel, number> = {
  Listener: 0,
  Critic: 10,
  Connoisseur: 50,
  Legend: 200
};

export async function fetchBadges(
  client: SupabaseClient,
  userId: string
): Promise<Badge[]> {
  const { data, error } = await client
    .from("badges")
    .select("*")
    .eq("user_id", userId)
    .order("awarded_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    badgeType: row.badge_type as string,
    awardedAt: row.awarded_at as string
  }));
}

export async function fetchLeaderboard(
  client: SupabaseClient,
  limit = 10
): Promise<User[]> {
  const { data, error } = await client
    .from("users")
    .select("*")
    .order("review_streak", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    username: row.username as string,
    email: (row.email as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? (row.username as string),
    avatarUrl: (row.avatar_url as string | null) ?? null,
    spotifyId: (row.spotify_id as string | null) ?? null,
    level: (row.level as UserLevel | null) ?? "Listener",
    reviewStreak: Number(row.review_streak ?? 0),
    lastReviewDate: (row.last_review_date as string | null) ?? null,
    isCriticVerified: Boolean(row.is_critic_verified),
    createdAt: (row.created_at as string | null) ?? null
  }));
}
