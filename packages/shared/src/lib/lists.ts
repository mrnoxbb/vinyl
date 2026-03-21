import type { SupabaseClient } from "@supabase/supabase-js";

import type { ReviewKind } from "../types/review";

export interface UserList {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListItem {
  id: string;
  listId: string;
  spotifyId: string;
  entityType: ReviewKind;
  title: string;
  artist: string;
  artworkUrl: string | null;
  position: number;
  note: string | null;
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

export async function fetchPublicLists(
  client: SupabaseClient,
  limit = 20
): Promise<UserList[]> {
  const { data, error } = await client
    .from("lists")
    .select("*")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }));
}

export async function createList(
  client: SupabaseClient,
  input: {
    title: string;
    description?: string | null;
    isPublic?: boolean;
  }
): Promise<UserList> {
  const userId = await requireCurrentUserId(client);
  const { data, error } = await client
    .from("lists")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      is_public: input.isPublic ?? true
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id as string,
    userId: data.user_id as string,
    title: data.title as string,
    description: (data.description as string | null) ?? null,
    isPublic: Boolean(data.is_public),
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string
  };
}

export async function addListItem(
  client: SupabaseClient,
  listId: string,
  item: Omit<ListItem, "id" | "listId">
): Promise<ListItem> {
  const { data, error } = await client
    .from("list_items")
    .insert({
      list_id: listId,
      spotify_id: item.spotifyId,
      entity_type: item.entityType,
      title: item.title,
      artist: item.artist,
      artwork_url: item.artworkUrl,
      position: item.position,
      note: item.note
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id as string,
    listId: data.list_id as string,
    spotifyId: data.spotify_id as string,
    entityType: data.entity_type as ReviewKind,
    title: data.title as string,
    artist: data.artist as string,
    artworkUrl: (data.artwork_url as string | null) ?? null,
    position: Number(data.position),
    note: (data.note as string | null) ?? null
  };
}
