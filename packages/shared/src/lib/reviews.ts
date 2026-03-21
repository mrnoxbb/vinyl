import type { SupabaseClient } from "@supabase/supabase-js";

import type { Review, ReviewKind, ReviewMutation, ReviewTarget } from "../types/review";
import type { UserLevel } from "../types/user";

type UnifiedReviewRow = {
  id: string;
  user_id: string;
  review_type: ReviewKind;
  spotify_id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  rating: number;
  body: string | null;
  has_spoiler: boolean | null;
  helpful_votes: number | null;
  created_at: string;
  updated_at: string | null;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  level?: UserLevel | null;
};

type StoredReviewRow = {
  id: string;
  user_id: string;
  track_id?: string | null;
  album_id?: string | null;
  artist_id?: string | null;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  album_name?: string | null;
  artist_name?: string | null;
  artwork_url?: string | null;
  rating: number;
  body?: string | null;
  has_spoiler?: boolean | null;
  helpful_votes?: number | null;
  created_at: string;
  updated_at?: string | null;
};

const reviewTables: Record<ReviewKind, "reviews" | "album_reviews" | "artist_reviews"> = {
  track: "reviews",
  album: "album_reviews",
  artist: "artist_reviews"
};

const likeTables: Record<ReviewKind, "review_likes" | "album_likes" | "artist_likes"> = {
  track: "review_likes",
  album: "album_likes",
  artist: "artist_likes"
};

function mapUnifiedReview(row: UnifiedReviewRow): Review {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.review_type,
    spotifyId: row.spotify_id,
    rating: row.rating,
    body: row.body,
    hasSpoiler: row.has_spoiler ?? false,
    helpfulVotes: row.helpful_votes ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    target: {
      kind: row.review_type,
      spotifyId: row.spotify_id,
      title: row.title,
      artist: row.artist,
      artworkUrl: row.artwork_url
    },
    user: row.username
      ? {
          id: row.user_id,
          username: row.username,
          displayName: row.display_name ?? row.username,
          avatarUrl: row.avatar_url ?? null,
          level: row.level ?? "Listener"
        }
      : undefined
  };
}

function mapStoredReview(kind: ReviewKind, row: StoredReviewRow): Review {
  const spotifyId =
    kind === "track"
      ? row.track_id
      : kind === "album"
        ? row.album_id
        : row.artist_id;

  const title =
    kind === "track"
      ? row.title
      : kind === "album"
        ? row.album_name
        : row.artist_name;

  const artist =
    kind === "track"
      ? row.artist
      : kind === "album"
        ? row.artist_name
        : row.artist_name;

  return {
    id: row.id,
    userId: row.user_id,
    kind,
    spotifyId: spotifyId ?? "",
    rating: row.rating,
    body: row.body ?? null,
    hasSpoiler: row.has_spoiler ?? false,
    helpfulVotes: row.helpful_votes ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? null,
    target: {
      kind,
      spotifyId: spotifyId ?? "",
      title: title ?? "",
      artist: artist ?? "",
      artworkUrl: row.artwork_url ?? null,
      album: row.album ?? null
    }
  };
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

function buildInsertPayload(userId: string, target: ReviewTarget, input: ReviewMutation) {
  const basePayload = {
    user_id: userId,
    rating: input.rating,
    body: input.body ?? null,
    has_spoiler: input.hasSpoiler ?? false,
    artwork_url: target.artworkUrl ?? null
  };

  switch (target.kind) {
    case "track":
      return {
        table: reviewTables.track,
        payload: {
          ...basePayload,
          track_id: target.spotifyId,
          title: target.title,
          artist: target.artist,
          album: target.album ?? null
        }
      };
    case "album":
      return {
        table: reviewTables.album,
        payload: {
          ...basePayload,
          album_id: target.spotifyId,
          album_name: target.title,
          artist_name: target.artist
        }
      };
    case "artist":
      return {
        table: reviewTables.artist,
        payload: {
          ...basePayload,
          artist_id: target.spotifyId,
          artist_name: target.title
        }
      };
  }
}

export async function fetchGlobalFeed(
  client: SupabaseClient,
  limit = 20
): Promise<Review[]> {
  const { data, error } = await client
    .from("unified_reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapUnifiedReview(row as UnifiedReviewRow));
}

export async function fetchFollowingFeed(
  client: SupabaseClient,
  currentUserId: string,
  limit = 20
): Promise<Review[]> {
  const { data: follows, error: followsError } = await client
    .from("follows")
    .select("following_id")
    .eq("follower_id", currentUserId);

  if (followsError) {
    throw followsError;
  }

  const followingIds = (follows ?? []).map((row) => row.following_id as string);

  if (followingIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("unified_reviews")
    .select("*")
    .in("user_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapUnifiedReview(row as UnifiedReviewRow));
}

export async function submitReview(
  client: SupabaseClient,
  target: ReviewTarget,
  input: ReviewMutation
): Promise<Review> {
  const userId = await requireCurrentUserId(client);
  const { table, payload } = buildInsertPayload(userId, target, input);
  const { data, error } = await client.from(table).insert(payload).select("*").single();

  if (error) {
    throw error;
  }

  return mapStoredReview(target.kind, data as StoredReviewRow);
}

export async function updateReview(
  client: SupabaseClient,
  reviewId: string,
  target: ReviewTarget,
  input: Partial<ReviewMutation>
): Promise<Review> {
  const updatePayload: Record<string, unknown> = {};

  if (typeof input.rating === "number") {
    updatePayload.rating = input.rating;
  }
  if (input.body !== undefined) {
    updatePayload.body = input.body;
  }
  if (input.hasSpoiler !== undefined) {
    updatePayload.has_spoiler = input.hasSpoiler;
  }
  if (target.artworkUrl !== undefined) {
    updatePayload.artwork_url = target.artworkUrl;
  }

  if (target.kind === "track") {
    updatePayload.title = target.title;
    updatePayload.artist = target.artist;
    updatePayload.album = target.album ?? null;
  }
  if (target.kind === "album") {
    updatePayload.album_name = target.title;
    updatePayload.artist_name = target.artist;
  }
  if (target.kind === "artist") {
    updatePayload.artist_name = target.title;
  }

  const { data, error } = await client
    .from(reviewTables[target.kind])
    .update(updatePayload)
    .eq("id", reviewId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapStoredReview(target.kind, data as StoredReviewRow);
}

export async function deleteReview(
  client: SupabaseClient,
  reviewId: string,
  target: ReviewTarget
): Promise<void> {
  const { error } = await client.from(reviewTables[target.kind]).delete().eq("id", reviewId);

  if (error) {
    throw error;
  }
}

export async function likeReview(
  client: SupabaseClient,
  reviewId: string,
  target: ReviewTarget
): Promise<void> {
  const userId = await requireCurrentUserId(client);
  const { error } = await client.from(likeTables[target.kind]).insert({
    review_id: reviewId,
    user_id: userId
  });

  if (error) {
    throw error;
  }
}

export async function unlikeReview(
  client: SupabaseClient,
  reviewId: string,
  target: ReviewTarget
): Promise<void> {
  const userId = await requireCurrentUserId(client);
  const { error } = await client
    .from(likeTables[target.kind])
    .delete()
    .eq("review_id", reviewId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function fetchUserReviews(
  client: SupabaseClient,
  userId: string,
  kind?: ReviewKind
): Promise<Review[]> {
  const kinds: ReviewKind[] = kind ? [kind] : ["track", "album", "artist"];
  const results: Review[] = [];

  for (const k of kinds) {
    const { data, error } = await client
      .from(reviewTables[k])
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    for (const row of data ?? []) {
      results.push(mapStoredReview(k, row as StoredReviewRow));
    }
  }

  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function fetchItemReviews(
  client: SupabaseClient,
  spotifyId: string,
  entityType: ReviewKind
): Promise<Review[]> {
  const idCol = entityType === "track" ? "track_id" : entityType === "album" ? "album_id" : "artist_id";

  const { data, error } = await client
    .from(reviewTables[entityType])
    .select("*, users!inner(username, display_name, avatar_url, level)")
    .eq(idCol, spotifyId)
    .order("helpful_votes", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as StoredReviewRow & {
      users?: { username?: string; display_name?: string; avatar_url?: string; level?: UserLevel };
    };
    const review = mapStoredReview(entityType, r);
    if (r.users) {
      review.user = {
        id: r.user_id,
        username: r.users.username ?? r.user_id,
        displayName: r.users.display_name ?? r.users.username ?? r.user_id,
        avatarUrl: r.users.avatar_url ?? null,
        level: r.users.level ?? "Listener"
      };
    }
    return review;
  });
}

export async function fetchItemStats(
  client: SupabaseClient,
  spotifyId: string,
  entityType: ReviewKind
): Promise<{ avgRating: number; reviewCount: number; distribution: Record<string, number> }> {
  const idCol = entityType === "track" ? "track_id" : entityType === "album" ? "album_id" : "artist_id";

  const { data, error } = await client
    .from(reviewTables[entityType])
    .select("rating")
    .eq(idCol, spotifyId);

  if (error) throw error;

  const ratings = (data ?? []).map((r) => Number((r as { rating: number }).rating));
  const reviewCount = ratings.length;
  const avgRating = reviewCount > 0 ? ratings.reduce((s, r) => s + r, 0) / reviewCount : 0;

  const steps = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
  const distribution: Record<string, number> = {};
  for (const s of steps) distribution[s.toFixed(1)] = 0;
  for (const r of ratings) {
    const key = r.toFixed(1);
    if (key in distribution) distribution[key]++;
  }

  return { avgRating: Math.round(avgRating * 10) / 10, reviewCount, distribution };
}

export async function voteHelpful(
  client: SupabaseClient,
  reviewId: string,
  reviewType: ReviewKind
): Promise<void> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await client
    .from("helpful_votes")
    .insert({ user_id: user.id, review_type: reviewType, review_id: reviewId });
  if (error) throw error;
}

export async function unvoteHelpful(
  client: SupabaseClient,
  reviewId: string,
  reviewType: ReviewKind
): Promise<void> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await client
    .from("helpful_votes")
    .delete()
    .eq("user_id", user.id)
    .eq("review_type", reviewType)
    .eq("review_id", reviewId);
  if (error) throw error;
}

export async function getUserHelpfulVotes(
  client: SupabaseClient,
  userId: string,
  reviewIds: string[]
): Promise<string[]> {
  if (reviewIds.length === 0) return [];
  const { data } = await client
    .from("helpful_votes")
    .select("review_id")
    .eq("user_id", userId)
    .in("review_id", reviewIds);
  return (data ?? []).map((r) => r.review_id as string);
}

export async function getUserReviewForItem(
  client: SupabaseClient,
  userId: string,
  spotifyId: string,
  kind: ReviewKind
): Promise<Review | null> {
  const idCol = kind === "track" ? "track_id" : kind === "album" ? "album_id" : "artist_id";

  const { data, error } = await client
    .from(reviewTables[kind])
    .select("*")
    .eq("user_id", userId)
    .eq(idCol, spotifyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapStoredReview(kind, data as StoredReviewRow);
}
