import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Animated,
  SafeAreaView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import {
  checkIfLiked,
  fetchCombinedReviews,
  fetchTrendingReviews,
  ReviewType,
  toggleLike,
  UnifiedReview,
} from '../../lib/reviews';
import { supabase } from '../../lib/supabase';

const FILLED_STAR = '\u2605';
const EMPTY_STAR = '\u2606';
const HEART = '\u2665';

const PAGE_SIZE = 20;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ScaleCard({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 220,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

function ReviewBadge({ type }: { type: ReviewType }) {
  if (type === 'track') return null;

  return (
    <View style={[styles.badge, type === 'album' ? styles.albumBadge : styles.artistBadge]}>
      <Text style={[styles.badgeText, type === 'album' ? styles.albumBadgeText : styles.artistBadgeText]}>
        {type === 'album' ? 'Album Review' : 'Artist Review'}
      </Text>
    </View>
  );
}

function TrendingCard({ item }: { item: UnifiedReview }) {
  const router = useRouter();

  return (
    <ScaleCard style={styles.trendingCard}>
      <Pressable onPress={() => router.push(`/user-profile?userId=${item.user_id}`)} style={styles.trendingAvatarWrap}>
        <Image source={{ uri: item.avatar_url }} style={styles.trendingAvatar} />
      </Pressable>
      <Image source={{ uri: item.artwork_url }} style={styles.trendingArtwork} />
      <View style={styles.trendingMeta}>
        <ReviewBadge type={item.review_type} />
        <Text style={styles.trendingTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trendingArtist} numberOfLines={1}>
          {item.artist}
        </Text>
        <Text style={styles.trendingStars}>
          {FILLED_STAR.repeat(item.rating)}
          {EMPTY_STAR.repeat(5 - item.rating)}
        </Text>
        <Text style={styles.trendingPreview} numberOfLines={2}>
          {item.body || 'No caption, just a strong opinion.'}
        </Text>
        <View style={styles.trendingFooter}>
          <Text style={styles.trendingReviewer} numberOfLines={1}>
            {item.display_name}
          </Text>
          <Text style={styles.trendingLikes}>
            {HEART} {item.like_count}
          </Text>
        </View>
      </View>
    </ScaleCard>
  );
}

function ReviewCard({ item, currentUserId }: { item: UnifiedReview; currentUserId: string }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.like_count ?? 0);
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!currentUserId) return;
    checkIfLiked(item.review_type, currentUserId, item.review_id).then(setLiked).catch(console.error);
  }, [currentUserId, item.review_id, item.review_type]);

  const bounceHeart = () => {
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.18,
        useNativeDriver: true,
        friction: 4,
        tension: 250,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 230,
      }),
    ]).start();
  };

  const handleLike = async () => {
    if (!currentUserId) return;
    bounceHeart();

    const nextLiked = await toggleLike(item.review_type, currentUserId, item.review_id, liked);
    setLiked(nextLiked);
    setLikeCount(prev => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
  };

  return (
    <ScaleCard style={styles.card}>
      <View style={styles.userRow}>
        <Pressable onPress={() => router.push(`/user-profile?userId=${item.user_id}`)}>
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        </Pressable>
        <View style={styles.userMeta}>
          <Pressable onPress={() => router.push(`/user-profile?userId=${item.user_id}`)}>
            <Text style={styles.userName}>{item.display_name}</Text>
          </Pressable>
          <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={styles.cardStars}>
          {FILLED_STAR.repeat(item.rating)}
          {EMPTY_STAR.repeat(5 - item.rating)}
        </Text>
      </View>

      <View style={styles.trackRow}>
        <Image source={{ uri: item.artwork_url }} style={styles.artwork} />
        <View style={styles.trackMeta}>
          <ReviewBadge type={item.review_type} />
          <Text style={styles.trackTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist}
          </Text>
        </View>
      </View>

      {item.body ? <Text style={styles.body}>{item.body}</Text> : null}

      <Pressable style={styles.likeRow} onPress={handleLike}>
        <Animated.Text
          style={[
            styles.heart,
            liked && styles.heartLiked,
            { transform: [{ scale: heartScale }] },
          ]}
        >
          {HEART}
        </Animated.Text>
        <Text style={[styles.likeCount, liked && styles.likeCountLiked]}>{likeCount}</Text>
      </Pressable>
    </ScaleCard>
  );
}

export default function DiscoverScreen() {
  const [reviews, setReviews] = useState<UnifiedReview[]>([]);
  const [trending, setTrending] = useState<UnifiedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  // Bug #8: use a ref so the channel is created exactly once across re-renders
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pageRef = useRef(0);
  const isFetchingRef = useRef(false);

  // Stable fetch for initial/refresh load
  const fetchFeed = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    pageRef.current = 0;

    try {
      setErrorMsg(null);
      const [feedItems, trendingItems] = await Promise.all([
        fetchCombinedReviews({ limitPerType: PAGE_SIZE }),
        fetchTrendingReviews(5),
      ]);

      setReviews(feedItems);
      setTrending(trendingItems);
      setHasMore(feedItems.length >= PAGE_SIZE);
    } catch {
      setErrorMsg('Could not load feed, pull to refresh');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    SecureStore.getItemAsync('vinyl_user_id').then(id => {
      setCurrentUserId(id ?? '');
    });

    fetchFeed();

    // Bug #8: guard against duplicate channel creation on re-render
    if (channelRef.current) return;

    channelRef.current = supabase
      .channel('discover-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, fetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'album_reviews' }, fetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_reviews' }, fetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, fetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'album_likes' }, fetchFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'artist_likes' }, fetchFeed)
      .subscribe();

    // Bug #5: cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchFeed]);

  // Bug #9: load next page and append
  const loadMore = async () => {
    if (loadingMore || !hasMore || isFetchingRef.current) return;
    setLoadingMore(true);
    isFetchingRef.current = true;

    try {
      const nextPage = pageRef.current + 1;
      const nextItems = await fetchCombinedReviews({
        limitPerType: PAGE_SIZE,
        offset: nextPage * PAGE_SIZE,
      });

      if (nextItems.length === 0) {
        setHasMore(false);
      } else {
        pageRef.current = nextPage;
        setReviews(prev => {
          // Deduplicate by id in case real-time added a review already in the list
          const existingIds = new Set(prev.map(r => r.id));
          const fresh = nextItems.filter(r => !existingIds.has(r.id));
          return [...prev, ...fresh];
        });
        setHasMore(nextItems.length >= PAGE_SIZE);
      }
    } catch {
      // Silently fail pagination — user can scroll again
    } finally {
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.glowTop} />
      <FlatList
        data={reviews}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.logo}>VINYL</Text>
              <Text style={styles.subtitle}>DISCOVER</Text>
              <Text style={styles.heroTitle}>Hear what everyone felt.</Text>
            </View>

            {errorMsg && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            )}

            {trending.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>TRENDING</Text>
                  <Text style={styles.sectionMeta}>Top liked this week</Text>
                </View>
                <FlatList
                  data={trending}
                  keyExtractor={item => `trending-${item.id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trendingList}
                  renderItem={({ item }) => <TrendingCard item={item} />}
                />
              </>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>GLOBAL FEED</Text>
              <Text style={styles.sectionMeta}>{reviews.length} reviews</Text>
            </View>
          </>
        }
        renderItem={({ item }) => <ReviewCard item={item} currentUserId={currentUserId} />}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator color="#ffffff40" size="small" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No reviews yet.</Text>
            <Text style={styles.emptySubtext}>Rate a track on the Home tab to be first.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  glowTop: {
    position: 'absolute',
    top: -110,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ffffff08',
  },
  centered: { flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 18 },
  logo: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 7 },
  subtitle: { color: '#ffffff40', fontSize: 11, marginTop: 14, letterSpacing: 1.6, fontWeight: '600' },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.45, marginTop: 12, maxWidth: 260 },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff0f',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorBannerText: { color: '#ffffff80', fontSize: 13, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 96 },
  sectionRow: {
    paddingTop: 4,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: '#ffffff40', fontSize: 11, letterSpacing: 1.6, fontWeight: '600' },
  sectionMeta: { color: '#ffffff30', fontSize: 12 },
  trendingList: { paddingBottom: 18, paddingRight: 4 },
  trendingCard: {
    width: 160,
    height: 200,
    backgroundColor: '#111111',
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
  },
  trendingAvatarWrap: { position: 'absolute', top: 10, right: 10, zIndex: 2 },
  trendingAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#141414' },
  trendingArtwork: { width: '100%', height: 96, backgroundColor: '#1a1a1a' },
  trendingMeta: { flex: 1, padding: 12 },
  trendingTitle: { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: -0.35, marginTop: 4 },
  trendingArtist: { color: '#ffffff60', fontSize: 12, marginTop: 2 },
  trendingStars: { color: '#F9CB42', fontSize: 12, letterSpacing: 0.5, marginTop: 6 },
  trendingPreview: { color: '#ffffff70', fontSize: 12, lineHeight: 18, marginTop: 8, flex: 1 },
  trendingFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  trendingReviewer: { color: '#ffffff45', fontSize: 11, flex: 1, marginRight: 8 },
  trendingLikes: { color: '#E24B4A', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#111111', borderRadius: 16, padding: 16, marginBottom: 12 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1d1d1d', marginRight: 12 },
  userMeta: { flex: 1 },
  userName: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: -0.3 },
  time: { color: '#ffffff40', fontSize: 12, marginTop: 3 },
  cardStars: { color: '#F9CB42', fontSize: 15, letterSpacing: 0.6 },
  trackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  artwork: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#1a1a1a', marginRight: 12 },
  trackMeta: { flex: 1 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 7 },
  albumBadge: { backgroundColor: '#9B59B640' },
  artistBadge: { backgroundColor: '#3498DB40' },
  badgeText: { fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  albumBadgeText: { color: '#9B59B6' },
  artistBadgeText: { color: '#3498DB' },
  trackTitle: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: -0.35 },
  trackArtist: { color: '#ffffff60', fontSize: 13, marginTop: 3 },
  body: { color: '#ffffff80', fontSize: 14, lineHeight: 22, marginBottom: 14 },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff0f',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heart: { fontSize: 16, color: '#ffffff35', marginRight: 6 },
  heartLiked: { color: '#E24B4A' },
  likeCount: { color: '#ffffff45', fontSize: 13, fontWeight: '600' },
  likeCountLiked: { color: '#E24B4A' },
  loadingMore: { paddingVertical: 20, alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 96, gap: 8 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptySubtext: { color: '#ffffff45', fontSize: 14 },
});
