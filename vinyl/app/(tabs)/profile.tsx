import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
  SafeAreaView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { deleteReview, fetchCombinedReviews, ReviewFilter, UnifiedReview } from '../../lib/reviews';
import { getUserPlaylists, getValidAccessToken, UserPlaylist } from '../../lib/spotify';
import { supabase } from '../../lib/supabase';

const FILLED_STAR = '\u2605';
const EMPTY_STAR = '\u2606';
const HEART = '\u2665';

type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string;
};

type ProfileSegment = ReviewFilter | 'playlists';

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
  onLongPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
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
      onLongPress={onLongPress}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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

function ReviewRow({
  item,
  onDelete,
}: {
  item: UnifiedReview;
  onDelete: (review: UnifiedReview) => void;
}) {
  return (
    <ReanimatedSwipeable
      friction={1.8}
      rightThreshold={36}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable style={styles.deleteAction} onPress={() => onDelete(item)}>
          <Text style={styles.deleteActionText}>Delete</Text>
        </Pressable>
      )}
    >
      <ScalePressable style={styles.reviewShell} onLongPress={() => onDelete(item)}>
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
          <View style={styles.reviewMeta}>
            <Text style={styles.reviewLikes}>
              {HEART} {item.like_count}
            </Text>
            <Text style={styles.reviewTime}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>
      </ScalePressable>
    </ReanimatedSwipeable>
  );
}

function PlaylistRow({
  item,
  onPress,
}: {
  item: UserPlaylist;
  onPress: () => void;
}) {
  return (
    <ScalePressable style={styles.reviewShell} onPress={onPress}>
      <View style={styles.reviewRow}>
        {item.artwork ? (
          <Image source={{ uri: item.artwork }} style={styles.artwork} />
        ) : (
          <View style={[styles.artwork, styles.playlistPlaceholder]} />
        )}
        <View style={styles.reviewInfo}>
          <Text style={styles.reviewTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.reviewArtist} numberOfLines={1}>
            {item.owner}
          </Text>
          <Text style={styles.trackCount}>{item.track_count} tracks</Text>
        </View>
        <Text style={styles.chevron}>Open</Text>
      </View>
    </ScalePressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [reviews, setReviews] = useState<UnifiedReview[]>([]);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [filter, setFilter] = useState<ProfileSegment>('all');
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Keep userId in a ref so handleDeleteReview can access it without stale closure
  const userIdRef = useRef<string>('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const userId = await SecureStore.getItemAsync('vinyl_user_id');
    if (!userId) {
      router.replace('/');
      return;
    }
    userIdRef.current = userId;

    const token = await getValidAccessToken();
    setErrorMsg(null);

    try {
      const [
        { data: userData },
        { count: followerCount },
        { count: followingCount },
        reviewData,
        playlistData,
      ] = await Promise.all([
        supabase.from('users').select('id, display_name, avatar_url').eq('id', userId).single(),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        fetchCombinedReviews({ userId, limitPerType: 100 }),
        token ? getUserPlaylists(token) : Promise.resolve([]),
      ]);

      if (userData) setUser(userData);
      setReviews(reviewData);
      setPlaylists(playlistData);
      setFollowers(followerCount ?? 0);
      setFollowing(followingCount ?? 0);
    } catch {
      setErrorMsg('Could not load profile, pull to refresh');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('vinyl_user_id');
          await SecureStore.deleteItemAsync('vinyl_access_token');
          await SecureStore.deleteItemAsync('vinyl_token_expires_at');
          router.replace('/');
        },
      },
    ]);
  };

  // Bug #10: pass userId so only the owner can delete
  const handleDeleteReview = async (review: UnifiedReview) => {
    Alert.alert('Delete review', 'Remove this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReview(review.review_type, review.review_id, userIdRef.current);
            setReviews(prev => prev.filter(item => item.id !== review.id));
          } catch {
            Alert.alert('Could not delete review. Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const filteredReviews =
    filter === 'all' || filter === 'playlists'
      ? reviews
      : reviews.filter(review => review.review_type === filter);
  const showingPlaylists = filter === 'playlists';
  const listData: Array<UnifiedReview | UserPlaylist> = showingPlaylists ? playlists : filteredReviews;

  const ListHeader = () => (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>VINYL</Text>
          <Text style={styles.subtitle}>PROFILE</Text>
        </View>
        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutTxt}>Sign out</Text>
        </Pressable>
      </View>

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
        </View>
      )}

      <View style={styles.profileCard}>
        {user?.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}
        <Text style={styles.name}>{user?.display_name ?? 'You'}</Text>
        <Text style={styles.profileMeta}>Your listening diary in one place.</Text>

        <View style={styles.statsRow}>
          <StatBox value={reviews.length} label="Reviews" />
          <StatBox value={followers} label="Followers" />
          <StatBox value={following} label="Following" />
        </View>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>{showingPlaylists ? 'YOUR PLAYLISTS' : 'YOUR REVIEWS'}</Text>
        <Text style={styles.sectionMeta}>
          {showingPlaylists ? `${playlists.length} playlists` : `${filteredReviews.length} shown`}
        </Text>
      </View>

      <View style={styles.segmentRow}>
        {(['all', 'track', 'album', 'artist', 'playlists'] as ProfileSegment[]).map(segment => (
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
                    : segment === 'artist'
                      ? 'ARTISTS'
                      : 'PLAYLISTS'}
            </Text>
          </Pressable>
        ))}
      </View>
    </>
  );

  return (
    // Bug: removed redundant GestureHandlerRootView — already wrapped in app/_layout.tsx
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundGlow} />
      <FlatList<UnifiedReview | UserPlaylist>
        style={styles.container}
        data={listData}
        keyExtractor={item =>
          showingPlaylists
            ? `playlist-${(item as unknown as UserPlaylist).id}`
            : (item as UnifiedReview).id
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) =>
          showingPlaylists ? (
            <PlaylistRow
              item={item as unknown as UserPlaylist}
              onPress={() =>
                router.push({
                  pathname: '/playlist',
                  params: {
                    playlistId: (item as unknown as UserPlaylist).id,
                    name: (item as unknown as UserPlaylist).name,
                    owner: (item as unknown as UserPlaylist).owner,
                    artwork: (item as unknown as UserPlaylist).artwork,
                  },
                })
              }
            />
          ) : (
            <ReviewRow item={item as UnifiedReview} onDelete={handleDeleteReview} />
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {showingPlaylists ? 'No playlists found' : 'No reviews yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {showingPlaylists
                ? 'Reconnect Spotify if your library is private.'
                : 'Rate something on the Home tab to get started.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  backgroundGlow: {
    position: 'absolute',
    top: -80,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ffffff08',
  },
  centered: { flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 96 },
  header: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 7 },
  subtitle: { color: '#ffffff40', fontSize: 11, marginTop: 12, letterSpacing: 1.6, fontWeight: '600' },
  signOutBtn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#ffffff0f', borderRadius: 999 },
  signOutTxt: { color: '#ffffff70', fontSize: 13, fontWeight: '600' },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff0f',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorBannerText: { color: '#ffffff80', fontSize: 13, textAlign: 'center' },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    backgroundColor: '#111111',
    borderRadius: 20,
    marginBottom: 22,
  },
  avatar: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#1f1f1f', marginBottom: 14 },
  avatarPlaceholder: { backgroundColor: '#1f1f1f' },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.45, marginBottom: 8 },
  profileMeta: { color: '#ffffff55', fontSize: 14, marginBottom: 22 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 12 },
  statBox: { flex: 1, alignItems: 'center', backgroundColor: '#ffffff0a', borderRadius: 16, paddingVertical: 16 },
  statValue: { color: '#fff', fontSize: 21, fontWeight: '700', letterSpacing: -0.35 },
  statLabel: { color: '#ffffff45', fontSize: 11, marginTop: 5, letterSpacing: 1.4, fontWeight: '600' },
  sectionRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: '#ffffff40', fontSize: 11, letterSpacing: 1.6, fontWeight: '600' },
  sectionMeta: { color: '#ffffff30', fontSize: 12 },
  segmentRow: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', gap: 8 },
  segmentBtn: { flex: 1, backgroundColor: '#111111', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#141414' },
  segmentTxt: { color: '#ffffff50', fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  segmentTxtActive: { color: '#fff' },
  reviewShell: { marginHorizontal: 16, marginBottom: 10 },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: '#111111',
    borderRadius: 16,
  },
  artwork: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#1a1a1a' },
  playlistPlaceholder: { backgroundColor: '#141414' },
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
  reviewMeta: { alignItems: 'flex-end', marginLeft: 12 },
  reviewLikes: { color: '#E24B4A', fontSize: 13, fontWeight: '600' },
  reviewTime: { color: '#ffffff35', fontSize: 11, marginTop: 6 },
  trackCount: { color: '#ffffff45', fontSize: 12, marginTop: 6 },
  chevron: { color: '#ffffff40', fontSize: 12, fontWeight: '700', marginLeft: 12, alignSelf: 'center' },
  deleteAction: {
    width: 92,
    marginBottom: 10,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: '#E24B4A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptySubtext: { color: '#ffffff40', fontSize: 13 },
});
