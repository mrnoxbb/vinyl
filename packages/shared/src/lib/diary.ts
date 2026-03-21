import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReviewKind } from "../types/review";

export interface DiaryEntry {
  id: string;
  userId: string;
  spotifyId: string;
  entityType: ReviewKind;
  title: string;
  artist: string;
  artworkUrl: string | null;
  listenedAt: string;
  note: string | null;
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

export async function fetchDiaryEntries(
  client: SupabaseClient,
  userId?: string
): Promise<DiaryEntry[]> {
  const ownerId = userId ?? (await requireCurrentUserId(client));
  const { data, error } = await client
    .from("diary_entries")
    .select("*")
    .eq("user_id", ownerId)
    .order("listened_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    spotifyId: row.spotify_id as string,
    entityType: row.entity_type as ReviewKind,
    title: row.title as string,
    artist: row.artist as string,
    artworkUrl: (row.artwork_url as string | null) ?? null,
    listenedAt: row.listened_at as string,
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string
  }));
}

export async function deleteDiaryEntry(
  client: SupabaseClient,
  entryId: string
): Promise<void> {
  const { error } = await client
    .from("diary_entries")
    .delete()
    .eq("id", entryId);
  if (error) throw error;
}

export async function createDiaryEntry(
  client: SupabaseClient,
  entry: Omit<DiaryEntry, "id" | "userId" | "createdAt">
): Promise<DiaryEntry> {
  const userId = await requireCurrentUserId(client);
  const { data, error } = await client
    .from("diary_entries")
    .insert({
      user_id: userId,
      spotify_id: entry.spotifyId,
      entity_type: entry.entityType,
      title: entry.title,
      artist: entry.artist,
      artwork_url: entry.artworkUrl,
      listened_at: entry.listenedAt,
      note: entry.note
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id as string,
    userId: data.user_id as string,
    spotifyId: data.spotify_id as string,
    entityType: data.entity_type as ReviewKind,
    title: data.title as string,
    artist: data.artist as string,
    artworkUrl: (data.artwork_url as string | null) ?? null,
    listenedAt: data.listened_at as string,
    note: (data.note as string | null) ?? null,
    createdAt: data.created_at as string
  };
}
