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

export async function fetchUserLists(
  client: SupabaseClient,
  userId: string,
  includePrivate = false
): Promise<UserList[]> {
  let query = client
    .from("lists")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!includePrivate) {
    query = query.eq("is_public", true);
  }

  const { data, error } = await query;
  if (error) throw error;

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

export interface ListDetail extends UserList {
  items: ListItem[];
  ownerUsername: string;
}

export async function fetchListDetail(
  client: SupabaseClient,
  listId: string
): Promise<ListDetail | null> {
  const { data: listData, error: listError } = await client
    .from("lists")
    .select("*")
    .eq("id", listId)
    .single();
  if (listError || !listData) return null;

  const { data: itemsData } = await client
    .from("list_items")
    .select("*")
    .eq("list_id", listId)
    .order("position", { ascending: true });

  const { data: userData } = await client
    .from("users")
    .select("username")
    .eq("id", listData.user_id as string)
    .single();

  return {
    id: listData.id as string,
    userId: listData.user_id as string,
    title: listData.title as string,
    description: (listData.description as string | null) ?? null,
    isPublic: Boolean(listData.is_public),
    createdAt: listData.created_at as string,
    updatedAt: listData.updated_at as string,
    ownerUsername: (userData?.username as string) ?? '',
    items: (itemsData ?? []).map((row) => ({
      id: row.id as string,
      listId: row.list_id as string,
      spotifyId: row.spotify_id as string,
      entityType: row.entity_type as ReviewKind,
      title: row.title as string,
      artist: row.artist as string,
      artworkUrl: (row.artwork_url as string | null) ?? null,
      position: Number(row.position),
      note: (row.note as string | null) ?? null,
    })),
  };
}

export async function updateList(
  client: SupabaseClient,
  listId: string,
  input: { title?: string; description?: string | null; isPublic?: boolean }
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.isPublic !== undefined) updates.is_public = input.isPublic;
  const { error } = await client.from("lists").update(updates).eq("id", listId);
  if (error) throw error;
}

export async function deleteList(
  client: SupabaseClient,
  listId: string
): Promise<void> {
  const { error } = await client.from("lists").delete().eq("id", listId);
  if (error) throw error;
}

export async function removeListItem(
  client: SupabaseClient,
  listItemId: string
): Promise<void> {
  const { error } = await client.from("list_items").delete().eq("id", listItemId);
  if (error) throw error;
}

export async function reorderListItems(
  client: SupabaseClient,
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, i) =>
    client.from("list_items").update({ position: i + 1 }).eq("id", id)
  );
  await Promise.all(updates);
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
