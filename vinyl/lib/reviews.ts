import { supabase } from './supabase';

export type ReviewType = 'track' | 'album' | 'artist';
export type ReviewFilter = 'all' | ReviewType;

export type UnifiedReview = {
  id: string;
  review_id: string;
  user_id: string;
  title: string;
  artist: string;
  artwork_url: string;
  rating: number;
  body: string | null;
  created_at: string;
  display_name: string;
  avatar_url: string;
  like_count: number;
  review_type: ReviewType;
};

const likeTableByType: Record<ReviewType, 'likes' | 'album_likes' | 'artist_likes'> = {
  track: 'likes',
  album: 'album_likes',
  artist: 'artist_likes',
};

const reviewTableByType: Record<ReviewType, 'reviews' | 'album_reviews' | 'artist_reviews'> = {
  track: 'reviews',
  album: 'album_reviews',
  artist: 'artist_reviews',
};

function withUserFilter<T>(query: T, userId?: string) {
  if (!userId) return query;
  return (query as any).eq('user_id', userId);
}

async function fetchLikeCounts(
  table: 'likes' | 'album_likes' | 'artist_likes',
  ids: string[],
) {
  const counts = new Map<string, number>();
  if (!ids.length) return counts;

  const { data } = await supabase.from(table).select('review_id').in('review_id', ids);
  (data ?? []).forEach((row: any) => {
    counts.set(row.review_id, (counts.get(row.review_id) ?? 0) + 1);
  });

  return counts;
}

function shapeTrackReviews(rows: any[], likeCounts: Map<string, number>): UnifiedReview[] {
  return rows.map(row => ({
    id: `track-${row.id}`,
    review_id: row.id,
    user_id: row.user_id,
    title: row.title,
    artist: row.artist,
    artwork_url: row.artwork_url,
    rating: row.rating,
    body: row.body,
    created_at: row.created_at,
    display_name: row.users?.display_name ?? 'Unknown',
    avatar_url: row.users?.avatar_url ?? '',
    like_count: likeCounts.get(row.id) ?? 0,
    review_type: 'track' as const,
  }));
}

function shapeAlbumReviews(rows: any[], likeCounts: Map<string, number>): UnifiedReview[] {
  return rows.map(row => ({
    id: `album-${row.id}`,
    review_id: row.id,
    user_id: row.user_id,
    title: row.album_name,
    artist: row.artist_name,
    artwork_url: row.artwork_url,
    rating: row.rating,
    body: row.body,
    created_at: row.created_at,
    display_name: row.users?.display_name ?? 'Unknown',
    avatar_url: row.users?.avatar_url ?? '',
    like_count: likeCounts.get(row.id) ?? 0,
    review_type: 'album' as const,
  }));
}

function shapeArtistReviews(rows: any[], likeCounts: Map<string, number>): UnifiedReview[] {
  return rows.map(row => ({
    id: `artist-${row.id}`,
    review_id: row.id,
    user_id: row.user_id,
    title: row.artist_name,
    artist: 'Artist',
    artwork_url: row.artwork_url,
    rating: row.rating,
    body: row.body,
    created_at: row.created_at,
    display_name: row.users?.display_name ?? 'Unknown',
    avatar_url: row.users?.avatar_url ?? '',
    like_count: likeCounts.get(row.id) ?? 0,
    review_type: 'artist' as const,
  }));
}

export async function fetchCombinedReviews(options?: {
  userId?: string;
  limitPerType?: number;
  offset?: number;
}) {
  const userId = options?.userId;
  const limitPerType = options?.limitPerType ?? 50;
  const offset = options?.offset ?? 0;

  const trackQuery = withUserFilter(
    supabase
      .from('reviews')
      .select('id, user_id, title, artist, artwork_url, rating, body, created_at, users(display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitPerType - 1),
    userId,
  );

  const albumQuery = withUserFilter(
    supabase
      .from('album_reviews')
      .select('id, user_id, album_name, artist_name, artwork_url, rating, body, created_at, users(display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitPerType - 1),
    userId,
  );

  const artistQuery = withUserFilter(
    supabase
      .from('artist_reviews')
      .select('id, user_id, artist_name, artwork_url, rating, body, created_at, users(display_name, avatar_url)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitPerType - 1),
    userId,
  );

  const [trackRes, albumRes, artistRes] = await Promise.all([trackQuery, albumQuery, artistQuery]);

  const trackIds = (trackRes.data ?? []).map((row: any) => row.id);
  const albumIds = (albumRes.data ?? []).map((row: any) => row.id);
  const artistIds = (artistRes.data ?? []).map((row: any) => row.id);

  const [trackLikeCounts, albumLikeCounts, artistLikeCounts] = await Promise.all([
    fetchLikeCounts('likes', trackIds),
    fetchLikeCounts('album_likes', albumIds),
    fetchLikeCounts('artist_likes', artistIds),
  ]);

  return [
    ...shapeTrackReviews(trackRes.data ?? [], trackLikeCounts),
    ...shapeAlbumReviews(albumRes.data ?? [], albumLikeCounts),
    ...shapeArtistReviews(artistRes.data ?? [], artistLikeCounts),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function fetchTrendingReviews(limit = 5) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [trackLikes, albumLikes, artistLikes] = await Promise.all([
    supabase.from('likes').select('review_id').gt('created_at', since),
    supabase.from('album_likes').select('review_id').gt('created_at', since),
    supabase.from('artist_likes').select('review_id').gt('created_at', since),
  ]);

  const counts = new Map<string, { type: ReviewType; count: number; review_id: string }>();

  const addCount = (type: ReviewType, rows: any[] | null) => {
    (rows ?? []).forEach(row => {
      const key = `${type}-${row.review_id}`;
      const existing = counts.get(key);
      counts.set(key, {
        type,
        review_id: row.review_id,
        count: (existing?.count ?? 0) + 1,
      });
    });
  };

  addCount('track', trackLikes.data ?? null);
  addCount('album', albumLikes.data ?? null);
  addCount('artist', artistLikes.data ?? null);

  const topEntries = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  if (!topEntries.length) return [];

  const trackIds = topEntries.filter(e => e.type === 'track').map(e => e.review_id);
  const albumIds = topEntries.filter(e => e.type === 'album').map(e => e.review_id);
  const artistIds = topEntries.filter(e => e.type === 'artist').map(e => e.review_id);

  const [trackRes, albumRes, artistRes] = await Promise.all([
    trackIds.length
      ? supabase
          .from('reviews')
          .select('id, user_id, title, artist, artwork_url, rating, body, created_at, users(display_name, avatar_url)')
          .in('id', trackIds)
      : Promise.resolve({ data: [] as any[] }),
    albumIds.length
      ? supabase
          .from('album_reviews')
          .select('id, user_id, album_name, artist_name, artwork_url, rating, body, created_at, users(display_name, avatar_url)')
          .in('id', albumIds)
      : Promise.resolve({ data: [] as any[] }),
    artistIds.length
      ? supabase
          .from('artist_reviews')
          .select('id, user_id, artist_name, artwork_url, rating, body, created_at, users(display_name, avatar_url)')
          .in('id', artistIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const trackCountMap = new Map(
    trackIds.map(id => [id, topEntries.find(e => e.type === 'track' && e.review_id === id)?.count ?? 0]),
  );
  const albumCountMap = new Map(
    albumIds.map(id => [id, topEntries.find(e => e.type === 'album' && e.review_id === id)?.count ?? 0]),
  );
  const artistCountMap = new Map(
    artistIds.map(id => [id, topEntries.find(e => e.type === 'artist' && e.review_id === id)?.count ?? 0]),
  );

  const items = [
    ...shapeTrackReviews(trackRes.data ?? [], trackCountMap),
    ...shapeAlbumReviews(albumRes.data ?? [], albumCountMap),
    ...shapeArtistReviews(artistRes.data ?? [], artistCountMap),
  ];

  return items.sort((a, b) => {
    const aCount = topEntries.find(e => e.type === a.review_type && e.review_id === a.review_id)?.count ?? 0;
    const bCount = topEntries.find(e => e.type === b.review_type && e.review_id === b.review_id)?.count ?? 0;
    return bCount - aCount;
  });
}

export async function checkIfLiked(reviewType: ReviewType, currentUserId: string, reviewId: string) {
  const table = likeTableByType[reviewType];
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', currentUserId)
    .eq('review_id', reviewId)
    .maybeSingle();

  return !!data;
}

export async function toggleLike(
  reviewType: ReviewType,
  currentUserId: string,
  reviewId: string,
  liked: boolean,
) {
  const table = likeTableByType[reviewType];

  if (liked) {
    await supabase.from(table).delete().eq('user_id', currentUserId).eq('review_id', reviewId);
    return false;
  }

  await supabase.from(table).insert({ user_id: currentUserId, review_id: reviewId });
  return true;
}

// Bug #10: always filter by user_id so users can only delete their own reviews
export async function deleteReview(reviewType: ReviewType, reviewId: string, userId: string) {
  const table = reviewTableByType[reviewType];
  await supabase.from(table).delete().eq('id', reviewId).eq('user_id', userId);
}

// ---------------------------------------------------------------------------
// Duplicate-review helpers (Bug #2)
// ---------------------------------------------------------------------------

export async function findExistingTrackReview(
  userId: string,
  trackId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('track_id', trackId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function findExistingAlbumReview(
  userId: string,
  albumId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('album_reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('album_id', albumId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function findExistingArtistReview(
  userId: string,
  artistId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('artist_reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('artist_id', artistId)
    .maybeSingle();
  return data?.id ?? null;
}
