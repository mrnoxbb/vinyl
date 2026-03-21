import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReviewKind } from "../types/review";

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

  if (error) {
    throw error;
  }
}
