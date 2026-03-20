import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  buildRecentAlbums,
  getLikedTracks,
  getRecentArtists,
  getRecentlyPlayed,
  getValidAccessToken,
  LikedTrack,
  RecentAlbum,
  RecentArtist,
  RecentTrack,
} from '../../lib/spotify';
import { supabase } from '../../lib/supabase';

const FILLED_STAR = '\u2605';
const EMPTY_STAR = '\u2606';

type ReviewDraft = {
  rating: number;
  body: string;
};

type ReviewKind = 'track' | 'album' | 'artist';
type HomeSection = 'tracks' | 'albums' | 'artists' | 'liked';

type ReviewTarget = {
  id: string;
  title: string;
  subtitle: string;
  artwork: string;
  kind: ReviewKind;
  album?: string;
};

async function fetchCurrentTrack(accessToken: string) {
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 204 || res.status === 404) return null;
    const data = await res.json();
    if (!data || !data.item) return null;
    return {
      id: data.item.id,
      title: data.item.name,
      artist: data.item.artists.map((a: any) => a.name).join(', '),
      album: data.item.album.name,
      artwork: data.item.album.images[0]?.url,
      isPlaying: data.is_playing,
    };
  } catch {
    return null;
  }
}

function ScalePressable({
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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const anims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  const handlePress = (star: number) => {
    onChange(star);
    Animated.sequence([
      Animated.spring(anims[star - 1], {
        toValue: 1.24,
        useNativeDriver: true,
        friction: 4,
        tension: 260,
      }),
      Animated.spring(anims[star - 1], {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 240,
      }),
    ]).start();
  };

  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map(star => (
        <Pressable key={star} onPress={() => handlePress(star)} hitSlop={10}>
          <Animated.Text
            style={[
              styles.star,
              star <= value && styles.starFilled,
              { transform: [{ scale: anims[star - 1] }] },
            ]}
          >
            {FILLED_STAR}
          </Animated.Text>
        </Pressable>
      ))}
    </View>
  );
}

function TrackRow({
  item,
  review,
  onPress,
}: {
  item: RecentTrack | LikedTrack;
  review?: ReviewDraft;
  onPress: () => void;
}) {
  return (
    <ScalePressable onPress={onPress} style={styles.trackShell}>
      <View style={styles.track}>
        <Image source={{ uri: item.artwork }} style={styles.artwork} />
        <View style={styles.info}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {item.artist}
          </Text>
          {review ? (
            <Text style={styles.reviewedStars}>
              {FILLED_STAR.repeat(review.rating)}
              {EMPTY_STAR.repeat(5 - review.rating)}
            </Text>
          ) : (
            <Text style={styles.trackAlbum} numberOfLines={1}>
              {item.album}
            </Text>
          )}
        </View>
        <View style={[styles.rateBtn, review && styles.rateBtnDone]}>
          <Text style={[styles.rateTxt, review && styles.rateTxtDone]}>{review ? 'Rated' : 'Rate'}</Text>
        </View>
      </View>
    </ScalePressable>
  );
}

function CollectionRow({
  title,
  subtitle,
  artwork,
  review,
  onPress,
}: {
  title: string;
  subtitle: string;
  artwork: string;
  review?: ReviewDraft;
  onPress: () => void;
}) {
  return (
    <ScalePressable onPress={onPress} style={styles.trackShell}>
      <View style={styles.track}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.artwork} />
        ) : (
          <View style={[styles.artwork, styles.placeholderArt]} />
        )}
        <View style={styles.info}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {subtitle}
          </Text>
          {review ? (
            <Text style={styles.reviewedStars}>
              {FILLED_STAR.repeat(review.rating)}
              {EMPTY_STAR.repeat(5 - review.rating)}
            </Text>
          ) : (
            <Text style={styles.trackAlbum}>Ready for a full review</Text>
          )}
        </View>
        <View style={[styles.rateBtn, review && styles.rateBtnDone]}>
          <Text style={[styles.rateTxt, review && styles.rateTxtDone]}>{review ? 'Rated' : 'Review'}</Text>
        </View>
      </View>
    </ScalePressable>
  );
}

export default function HomeScreen() {
  const [tracks, setTracks] = useState<RecentTrack[]>([]);
  const [albums, setAlbums] = useState<RecentAlbum[]>([]);
  const [artists, setArtists] = useState<RecentArtist[]>([]);
  const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);
  const [activeSection, setActiveSection] = useState<HomeSection>('tracks');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ReviewTarget | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [trackReviews, setTrackReviews] = useState<Record<string, ReviewDraft>>({});
  const [albumReviews, setAlbumReviews] = useState<Record<string, ReviewDraft>>({});
  const [artistReviews, setArtistReviews] = useState<Record<string, ReviewDraft>>({});
  const [submitting, setSubmitting] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const modalDragY = useSharedValue(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const setup = async () => {
      interval = await loadAll();
    };

    setup().catch(console.error);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  useEffect(() => {
    if (selectedItem) {
      modalDragY.value = 0;
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 70,
        friction: 11,
      }).start();
    } else {
      modalAnim.setValue(0);
      modalDragY.value = 0;
    }
  }, [modalAnim, modalDragY, selectedItem]);

  const loadAll = async () => {
    const token = await getValidAccessToken();
    if (!token) {
      setLoading(false);
      return null;
    }

    try {
      const [recent, liked] = await Promise.all([getRecentlyPlayed(token), getLikedTracks(token)]);
      const seenTracks = new Set();
      const uniqueTracks = recent.filter(track => {
        if (seenTracks.has(track.id)) return false;
        seenTracks.add(track.id);
        return true;
      });

      setTracks(uniqueTracks);
      setAlbums(buildRecentAlbums(recent));
      setLikedTracks(liked);
      setArtists(await getRecentArtists(token, recent));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }

    const pollNowPlaying = async () => {
      const tok = await getValidAccessToken();
      if (tok) setNowPlaying(await fetchCurrentTrack(tok));
    };

    pollNowPlaying();
    const interval = setInterval(pollNowPlaying, 10000);
    return interval;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const token = await getValidAccessToken();

    if (token) {
      try {
        const [recent, liked] = await Promise.all([getRecentlyPlayed(token), getLikedTracks(token)]);
        const seenTracks = new Set();
        const uniqueTracks = recent.filter(track => {
          if (seenTracks.has(track.id)) return false;
          seenTracks.add(track.id);
          return true;
        });

        setTracks(uniqueTracks);
        setAlbums(buildRecentAlbums(recent));
        setLikedTracks(liked);
        setArtists(await getRecentArtists(token, recent));
        setNowPlaying(await fetchCurrentTrack(token));
      } catch (e) {
        console.error(e);
      }
    }

    setRefreshing(false);
  };

  const openTrackReview = (track: any) => {
    setSelectedItem({
      id: track.id,
      title: track.title,
      subtitle: track.artist,
      artwork: track.artwork,
      kind: 'track',
      album: track.album,
    });
    setRating(trackReviews[track.id]?.rating ?? 0);
    setBody(trackReviews[track.id]?.body ?? '');
  };

  const openAlbumReview = (album: RecentAlbum) => {
    setSelectedItem({
      id: album.id,
      title: album.title,
      subtitle: album.artist,
      artwork: album.artwork,
      kind: 'album',
    });
    setRating(albumReviews[album.id]?.rating ?? 0);
    setBody(albumReviews[album.id]?.body ?? '');
  };

  const openArtistReview = (artist: RecentArtist) => {
    setSelectedItem({
      id: artist.id,
      title: artist.name,
      subtitle: 'Artist Review',
      artwork: artist.artwork,
      kind: 'artist',
    });
    setRating(artistReviews[artist.id]?.rating ?? 0);
    setBody(artistReviews[artist.id]?.body ?? '');
  };

  const handleSubmit = async () => {
    if (!rating) {
      Alert.alert('Pick a star rating first');
      return;
    }
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      const userId = await SecureStore.getItemAsync('vinyl_user_id');

      if (selectedItem.kind === 'track') {
        const { error } = await supabase.from('reviews').insert({
          user_id: userId,
          track_id: selectedItem.id,
          title: selectedItem.title,
          artist: selectedItem.subtitle,
          album: selectedItem.album ?? '',
          artwork_url: selectedItem.artwork,
          rating,
          body: body || null,
        });
        if (error) throw error;
        setTrackReviews(prev => ({ ...prev, [selectedItem.id]: { rating, body } }));
      }

      if (selectedItem.kind === 'album') {
        const { error } = await supabase.from('album_reviews').insert({
          user_id: userId,
          album_id: selectedItem.id,
          album_name: selectedItem.title,
          artist_name: selectedItem.subtitle,
          artwork_url: selectedItem.artwork,
          rating,
          body: body || null,
        });
        if (error) throw error;
        setAlbumReviews(prev => ({ ...prev, [selectedItem.id]: { rating, body } }));
      }

      if (selectedItem.kind === 'artist') {
        const { error } = await supabase.from('artist_reviews').insert({
          user_id: userId,
          artist_id: selectedItem.id,
          artist_name: selectedItem.title,
          artwork_url: selectedItem.artwork,
          rating,
          body: body || null,
        });
        if (error) throw error;
        setArtistReviews(prev => ({ ...prev, [selectedItem.id]: { rating, body } }));
      }

      setSelectedItem(null);
      setRating(0);
      setBody('');
    } catch (e) {
      console.error(e);
      Alert.alert('Failed to save review');
    } finally {
      setSubmitting(false);
    }
  };

  const dismissModal = () => {
    setSelectedItem(null);
  };

  const modalPan = Gesture.Pan()
    .activeOffsetY([12, 999])
    .failOffsetX([-18, 18])
    .onUpdate(event => {
      modalDragY.value = Math.max(0, event.translationY);
    })
    .onEnd(event => {
      if (event.translationY > 140 || event.velocityY > 900) {
        modalDragY.value = withSpring(800, { damping: 20, stiffness: 140 });
        runOnJS(dismissModal)();
      } else {
        modalDragY.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const modalDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalDragY.value }],
  }));

  const data =
    activeSection === 'tracks'
      ? tracks
      : activeSection === 'albums'
        ? albums
        : activeSection === 'artists'
          ? artists
          : likedTracks;

  const renderActiveRow = ({ item }: { item: RecentTrack | RecentAlbum | RecentArtist | LikedTrack }) => {
    if (activeSection === 'tracks' || activeSection === 'liked') {
      const track = item as RecentTrack | LikedTrack;
      return <TrackRow item={track} review={trackReviews[track.id]} onPress={() => openTrackReview(track)} />;
    }

    if (activeSection === 'albums') {
      const album = item as RecentAlbum;
      return (
        <CollectionRow
          title={album.title}
          subtitle={album.artist}
          artwork={album.artwork}
          review={albumReviews[album.id]}
          onPress={() => openAlbumReview(album)}
        />
      );
    }

    const artist = item as RecentArtist;
    return (
      <CollectionRow
        title={artist.name}
        subtitle="Artist"
        artwork={artist.artwork}
        review={artistReviews[artist.id]}
        onPress={() => openArtistReview(artist)}
      />
    );
  };

  const modalLabel =
    selectedItem?.kind === 'track'
      ? 'TRACK REVIEW'
      : selectedItem?.kind === 'album'
        ? 'ALBUM REVIEW'
        : 'ARTIST REVIEW';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbBottom} />

      <FlatList
        data={loading ? [] : data}
        keyExtractor={item => `${activeSection}-${item.id}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff40" />
        }
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <Text style={styles.logo}>VINYL</Text>
              <Text style={styles.subtitle}>RECENTLY PLAYED</Text>
              <Text style={styles.heroTitle}>Soundtrack your day.</Text>
              <Text style={styles.heroText}>
                Move between tracks, albums, artists, and liked songs and leave a review wherever the feeling lands.
              </Text>
            </View>

            {nowPlaying && (
              <ScalePressable onPress={() => openTrackReview(nowPlaying)} style={styles.nowPlayingShell}>
                <View style={styles.nowPlaying}>
                  <Image source={{ uri: nowPlaying.artwork }} style={styles.nowPlayingArt} />
                  <View style={styles.nowPlayingInfo}>
                    <View style={styles.nowPlayingTopRow}>
                      <Animated.View style={[styles.nowPlayingDot, { transform: [{ scale: pulse }] }]} />
                      <Text style={styles.nowPlayingLabel}>NOW PLAYING</Text>
                    </View>
                    <Text style={styles.nowPlayingTitle} numberOfLines={1}>
                      {nowPlaying.title}
                    </Text>
                    <Text style={styles.nowPlayingArtist} numberOfLines={1}>
                      {nowPlaying.artist}
                    </Text>
                  </View>
                  <View style={styles.nowPlayingRate}>
                    <Text style={styles.nowPlayingRateTxt}>Rate</Text>
                  </View>
                </View>
              </ScalePressable>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>LIBRARY</Text>
              <Text style={styles.sectionMeta}>{data.length} items</Text>
            </View>

            <View style={styles.segmentRow}>
              {(['tracks', 'albums', 'artists', 'liked'] as HomeSection[]).map(section => (
                <Pressable
                  key={section}
                  style={[styles.segmentBtn, activeSection === section && styles.segmentBtnActive]}
                  onPress={() => setActiveSection(section)}
                >
                  <Text style={[styles.segmentTxt, activeSection === section && styles.segmentTxtActive]}>
                    {section.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        }
        renderItem={renderActiveRow}
        ListEmptyComponent={
          loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color="#ffffff60" />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyText}>Play something on Spotify and pull to refresh.</Text>
            </View>
          )
        }
      />

      <Modal visible={!!selectedItem} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <GestureDetector gesture={modalPan}>
            <Reanimated.View style={[styles.modalGestureLayer, modalDragStyle]}>
              <View style={styles.modalHandle} />
              {selectedItem && (
                <ScrollView
                  contentContainerStyle={styles.modalScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Animated.View
                    style={{
                      opacity: modalAnim,
                      transform: [
                        {
                          translateY: modalAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [32, 0],
                          }),
                        },
                      ],
                    }}
                  >
                    <Text style={styles.modalEyebrow}>{modalLabel}</Text>
                    <View style={styles.modalHeaderRow}>
                      {selectedItem.artwork ? (
                        <Image source={{ uri: selectedItem.artwork }} style={styles.modalArtwork} />
                      ) : (
                        <View style={[styles.modalArtwork, styles.placeholderArt]} />
                      )}
                      <View style={styles.modalHeaderInfo}>
                        <Text style={styles.modalTitle} numberOfLines={2}>
                          {selectedItem.title}
                        </Text>
                        <Text style={styles.modalArtist} numberOfLines={2}>
                          {selectedItem.subtitle}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalCard}>
                      <Text style={styles.modalLabel}>YOUR RATING</Text>
                      <StarRating value={rating} onChange={setRating} />
                    </View>

                    <View style={styles.modalCard}>
                      <Text style={styles.modalLabel}>
                        YOUR THOUGHTS <Text style={styles.optional}>(optional)</Text>
                      </Text>
                      <TextInput
                        style={styles.input}
                        placeholder="A memory, a feeling, anything..."
                        placeholderTextColor="#ffffff30"
                        multiline
                        value={body}
                        onChangeText={setBody}
                      />
                    </View>

                    <Pressable
                      style={[styles.submitBtn, (!rating || submitting) && styles.submitBtnDisabled]}
                      onPress={handleSubmit}
                      disabled={!rating || submitting}
                    >
                      <Text style={styles.submitTxt}>{submitting ? 'Posting...' : 'Post Review'}</Text>
                    </Pressable>
                    <Pressable onPress={() => setSelectedItem(null)} style={styles.cancelBtn}>
                      <Text style={styles.cancelTxt}>Cancel</Text>
                    </Pressable>
                  </Animated.View>
                </ScrollView>
              )}
            </Reanimated.View>
          </GestureDetector>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  backgroundOrbTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#ffffff08',
  },
  backgroundOrbBottom: {
    position: 'absolute',
    bottom: 120,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ffffff06',
  },
  header: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 26 },
  logo: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 7 },
  subtitle: { color: '#ffffff40', fontSize: 11, marginTop: 14, letterSpacing: 1.6, fontWeight: '600' },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '700', letterSpacing: -0.5, marginTop: 14 },
  heroText: { color: '#ffffff60', fontSize: 14, lineHeight: 22, marginTop: 10, maxWidth: 330 },
  list: { paddingBottom: 96 },
  nowPlayingShell: { marginHorizontal: 16, marginBottom: 22 },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 14,
  },
  nowPlayingArt: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#1a1a1a' },
  nowPlayingInfo: { flex: 1, marginLeft: 14 },
  nowPlayingTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  nowPlayingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#1DB954', marginRight: 8 },
  nowPlayingLabel: { color: '#1DB954', fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  nowPlayingTitle: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.4 },
  nowPlayingArtist: { color: '#ffffff60', fontSize: 13, marginTop: 3 },
  nowPlayingRate: {
    backgroundColor: '#1DB95420',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  nowPlayingRateTxt: { color: '#1DB954', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  sectionRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: '#ffffff40', fontSize: 11, letterSpacing: 1.6, fontWeight: '600' },
  sectionMeta: { color: '#ffffff30', fontSize: 12 },
  segmentRow: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#141414',
  },
  segmentTxt: {
    color: '#ffffff50',
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  segmentTxtActive: {
    color: '#fff',
  },
  trackShell: { marginHorizontal: 16, marginBottom: 10 },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#111111',
    borderRadius: 16,
  },
  artwork: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#1a1a1a' },
  placeholderArt: { backgroundColor: '#141414' },
  info: { flex: 1, marginLeft: 12 },
  trackTitle: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.35 },
  trackArtist: { color: '#ffffff60', fontSize: 13, marginTop: 3 },
  trackAlbum: { color: '#ffffff40', fontSize: 12, marginTop: 5 },
  reviewedStars: { color: '#F9CB42', fontSize: 13, marginTop: 5, letterSpacing: 0.6 },
  rateBtn: { backgroundColor: '#ffffff0f', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  rateBtnDone: { backgroundColor: '#ffffff18' },
  rateTxt: { color: '#ffffff70', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  rateTxtDone: { color: '#fff' },
  centered: { paddingTop: 80, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 84, paddingHorizontal: 32 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  emptyText: { color: '#ffffff50', fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  modal: { flex: 1, backgroundColor: '#080808' },
  modalGestureLayer: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  modalHandle: {
    width: 38,
    height: 4,
    backgroundColor: '#ffffff15',
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalScrollContent: { paddingBottom: 24 },
  modalEyebrow: { color: '#ffffff40', fontSize: 11, letterSpacing: 1.6, fontWeight: '700', marginBottom: 12 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalHeaderInfo: { flex: 1, marginLeft: 14 },
  modalArtwork: { width: 88, height: 88, borderRadius: 12, backgroundColor: '#141414' },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  modalArtist: { color: '#ffffff60', fontSize: 15, marginTop: 6, lineHeight: 21 },
  modalCard: { backgroundColor: '#111111', borderRadius: 18, padding: 18, marginBottom: 14 },
  modalLabel: { color: '#ffffff40', fontSize: 11, letterSpacing: 1.6, fontWeight: '600', marginBottom: 14 },
  optional: { color: '#ffffff25' },
  stars: { flexDirection: 'row', justifyContent: 'space-between' },
  star: { fontSize: 40, color: '#ffffff14' },
  starFilled: { color: '#F9CB42' },
  input: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    minHeight: 110,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  submitBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  submitBtnDisabled: { backgroundColor: '#ffffff20' },
  submitTxt: { color: '#000', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelTxt: { color: '#ffffff40', fontSize: 15 },
});
