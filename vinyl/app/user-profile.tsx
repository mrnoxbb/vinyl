import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { fetchCombinedReviews, ReviewFilter, UnifiedReview } from '../lib/reviews';
import { supabase } from '../lib/supabase';

const FILLED_STAR = '\u2605';
const EMPTY_STAR = '\u2606';
const LEFT_ARROW = '\u2190';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ScalePressable({
  children,
  onPress,
  style,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  disabled?: boolean;
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
      disabled={disabled}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

function ReviewBadge({ type }: { type: UnifiedReview['review_type'] }) {
  if (type === 'track') return null;

  return (
    <View style={[styles.badge, type === 'album' ? styles.albumBadge : styles.artistBadge]}>
      <Text style={[styles.badgeText, type === 'album' ? styles.albumBadgeText : styles.artistBadgeText]}>
        {type === 'album' ? 'Album Review' : 'Artist Review'}
      </Text>
    </View>
  );
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState('');
  const [user, setUser] = useState<any>(null);
  const [reviews, setReviews] = useState<UnifiedReview[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const swipeX = useSharedValue(0);

  useEffect(() => {
    load();
  }, [userId]);

  const load = async () => {
    const myId = await SecureStore.getItemAsync('vinyl_user_id');
    setCurrentUserId(myId ?? '');
    setErrorMsg(null);

    try {
      const [
        { data: userData },
        { count: followerCount },
        { count: followingCount },
        { data: followData },
        reviewData,
      ] = await Promise.all([
        supabase.from('users').select('id, display_name, avatar_url').eq('id', userId).single(),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        supabase.from('follows').select('id').eq('follower_id', myId).eq('following_id', userId).maybeSingle(),
        fetchCombinedReviews({ userId, limitPerType: 100 }),
      ]);

      setUser(userData);
      setReviews(reviewData);
      setFollowers(followerCount ?? 0);
      setFollowing(followingCount ?? 0);
      setIsFollowing(!!followData);
    } catch {
      setErrorMsg('Could not load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId || currentUserId === userId) return;
    setFollowLoading(true);

    if (isFollowing) {
      setIsFollowing(false);
      setFollowers(prev => Math.max(0, prev - 1));
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', userId);
    } else {
      setIsFollowing(true);
      setFollowers(prev => prev + 1);
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId });
    }

    setFollowLoading(false);
  };

  const goBack = () => {
    router.back();
  };

  const backGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([16, 999])
    .failOffsetY([-16, 16])
    .onUpdate(event => {
      swipeX.value = Math.max(0, event.translationX);
    })
    .onEnd(event => {
      if (event.translationX > 110 || event.velocityX > 850) {
        swipeX.value = withSpring(500, { damping: 18, stiffness: 160 });
        goBack();
      } else {
        swipeX.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const isOwnProfile = currentUserId === userId;
  const filteredReviews =
    filter === 'all' ? reviews : reviews.filter(review => review.review_type === filter);

  const ListHeader = () => (
    <View style={styles.profileSection}>
      {user?.avatar_url ? (
        <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]} />
      )}
      <Text style={styles.name}>{user?.display_name ?? 'Unknown'}</Text>
      <Text style={styles.profileMeta}>Shared through ratings, replays, and tiny notes.</Text>

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{reviews.length}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{followers}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{following}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </View>
      </View>

      {!isOwnProfile && (
        <ScalePressable
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={handleFollow}
          disabled={followLoading}
        >
          <Text style={[styles.followTxt, isFollowing && styles.followingTxt]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </ScalePressable>
      )}

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>REVIEWS</Text>
        <Text style={styles.sectionMeta}>{filteredReviews.length} shown</Text>
      </View>

      <View style={styles.segmentRow}>
        {(['all', 'track', 'album', 'artist'] as ReviewFilter[]).map(segment => (
          <Pressable
            key={segment}
            style={[styles.segmentBtn, filter === segment && styles.segmentBtnActive]}
            onPress={() => setFilter(segment)}
          >
            <Text style={[styles.segmentTxt, filter === segment && styles.segmentTxtActive]}>
              {segment === 'all'
                ? 'ALL'
                : segment === 'track'
                  ? 'TRACKS'
                  : segment === 'album'
                    ? 'ALBUMS'
                    : 'ARTISTS'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <GestureDetector gesture={backGesture}>
        <Reanimated.View style={[styles.container, swipeStyle]}>
          <View style={styles.backgroundGlow} />
          <View style={styles.navBar}>
            <ScalePressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backTxt}>{LEFT_ARROW} Back</Text>
            </ScalePressable>
          </View>

          <FlatList
            data={filteredReviews}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.content}
            ListHeaderComponent={ListHeader}
            renderItem={({ item }) => (
              <ScalePressable style={styles.reviewShell}>
                <View style={styles.reviewRow}>
                  <Image source={{ uri: item.artwork_url }} style={styles.artwork} />
                  <View style={styles.reviewInfo}>
                    <ReviewBadge type={item.review_type} />
                    <Text style={styles.reviewTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.reviewArtist} numberOfLines={1}>
                      {item.artist}
                    </Text>
                    <Text style={styles.reviewStars}>
                      {FILLED_STAR.repeat(item.rating)}
                      {EMPTY_STAR.repeat(5 - item.rating)}
                    </Text>
                    {item.body ? (
                      <Text style={styles.reviewBody} numberOfLines={2}>
                        {item.body}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.reviewTime}>{timeAgo(item.created_at)}</Text>
                </View>
              </ScalePressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTitle}>No reviews yet</Text>
                <Text style={styles.emptyText}>
                  {isOwnProfile
                    ? 'Rate something on the Home tab to get started.'
                    : 'This user has not posted any reviews yet.'}
                </Text>
              </View>
            }
          />
        </Reanimated.View>
      </GestureDetector>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  backgroundGlow: {
    position: 'absolute',
    top: -100,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ffffff08',
  },
  centered: { flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' },
  navBar: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff0f',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backTxt: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  content: { paddingBottom: 96 },
  profileSection: { alignItems: 'center', paddingTop: 8, paddingBottom: 8, paddingHorizontal: 20 },
  avatar: { width: 88, height: 88, borderRadius: 44, marginBottom: 14, backgroundColor: '#1f1f1f' },
  avatarFallback: { backgroundColor: '#1f1f1f' },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.45, marginBottom: 8 },
  profileMeta: { color: '#ffffff55', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  errorBanner: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#ffffff0f',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorBannerText: { color: '#ffffff80', fontSize: 13, textAlign: 'center' },
  statsRow: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 18 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: '#111111', borderRadius: 16, paddingVertical: 16 },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: -0.35 },
  statLabel: { color: '#ffffff45', fontSize: 11, letterSpacing: 1.4, fontWeight: '600', marginTop: 5 },
  followBtn: {
    minWidth: 148,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 999,
    marginBottom: 22,
    alignItems: 'center',
  },
  followingBtn: { backgroundColor: '#ffffff12' },
  followTxt: { color: '#000', fontWeight: '700', fontSize: 15, letterSpacing: -0.2 },
  followingTxt: { color: '#fff' },
  sectionRow: {
    marginTop: 4,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: '#ffffff40', fontSize: 11, letterSpacing: 1.6, fontWeight: '600' },
  sectionMeta: { color: '#ffffff30', fontSize: 12 },
  segmentRow: { width: '100%', paddingTop: 14, flexDirection: 'row', gap: 8 },
  segmentBtn: { flex: 1, backgroundColor: '#111111', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#141414' },
  segmentTxt: { color: '#ffffff50', fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  segmentTxtActive: { color: '#fff' },
  reviewShell: { marginHorizontal: 16, marginTop: 10 },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: '#111111',
    borderRadius: 16,
  },
  artwork: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#1a1a1a' },
  reviewInfo: { flex: 1, marginLeft: 12 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 7 },
  albumBadge: { backgroundColor: '#9B59B640' },
  artistBadge: { backgroundColor: '#3498DB40' },
  badgeText: { fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  albumBadgeText: { color: '#9B59B6' },
  artistBadgeText: { color: '#3498DB' },
  reviewTitle: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.35 },
  reviewArtist: { color: '#ffffff60', fontSize: 13, marginTop: 3 },
  reviewStars: { color: '#F9CB42', fontSize: 13, marginTop: 5, letterSpacing: 0.6 },
  reviewBody: { color: '#ffffff70', fontSize: 13, marginTop: 6, lineHeight: 20 },
  reviewTime: { color: '#ffffff35', fontSize: 11, marginLeft: 12, marginTop: 2 },
  emptyWrap: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.3 },
  emptyText: { color: '#ffffff40', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
