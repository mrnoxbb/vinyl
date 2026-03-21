import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReviewKind } from "../types/review";

export async function followUser(client: SupabaseClient, targetUserId: string): Promise<void> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await client
    .from("follows")
    .insert({ follower_id: user.id, following_id: targetUserId });
  if (error) throw error;
}

export async function unfollowUser(client: SupabaseClient, targetUserId: string): Promise<void> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await client
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId);
  if (error) throw error;
}

export async function isFollowing(
  client: SupabaseClient,
  followerId: string,
  followingId: string
): Promise<boolean> {
  const { data } = await client
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return data !== null;
}

export async function getFollowCounts(
  client: SupabaseClient,
  userId: string
): Promise<{ followers: number; following: number }> {
  const [f1, f2] = await Promise.all([
    client.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    client.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  return { followers: f1.count ?? 0, following: f2.count ?? 0 };
}

export interface NotificationRecord {
  id: string;
  recipientId: string;
  type: string;
  actorId: string | null;
  reviewType: ReviewKind | null;
  reviewId: string | null;
  read: boolean;
  createdAt: string;
}

async function requireCurrentUserId(client: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error("An authenticated user is required for this action.");
  }

  return user.id;
}

export async function fetchNotifications(
  client: SupabaseClient,
  limit = 20
): Promise<NotificationRecord[]> {
  const userId = await requireCurrentUserId(client);
  const { data, error } = await client
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    recipientId: row.recipient_id as string,
    type: row.type as string,
    actorId: (row.actor_id as string | null) ?? null,
    reviewType: (row.review_type as ReviewKind | null) ?? null,
    reviewId: (row.review_id as string | null) ?? null,
    read: Boolean(row.read),
    createdAt: row.created_at as string
  }));
}

export async function markNotificationRead(
  client: SupabaseClient,
  notificationId: string
): Promise<void> {
  const { error } = await client
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllNotificationsRead(client: SupabaseClient): Promise<void> {
  const userId = await requireCurrentUserId(client);
  const { error } = await client
    .from("notifications")
    .update({ read: true })
    .eq("recipient_id", userId)
    .eq("read", false);

  if (error) throw error;
}

export async function fetchUnreadCount(client: SupabaseClient): Promise<number> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return 0;

  const { count, error } = await client
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("read", false);

  if (error) return 0;
  return count ?? 0;
}
