import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  Animated,
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
  getValidAccessToken,
  PlaylistTrack,
  RecentAlbum,
  RecentArtist,
  SearchResults,
  searchSpotify,
  SpotifyAuthError,
  SpotifyRateLimitError,
} from '../../lib/spotify';
import {
  findExistingAlbumReview,
  findExistingArtistReview,
  findExistingTrackReview,
} from '../../lib/reviews';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

const FILLED_STAR = '\u2605';
const RECENT_SEARCHES_KEY = 'vinyl_recent_searches';

type ReviewKind = 'track' | 'album' | 'artist';

type ReviewTarget = {
  id: string;
  title: string;
  subtitle: string;
  artwork: string;
  kind: ReviewKind;
  album?: string;
  existingReviewId?: string;
};

const EMPTY_RESULTS: SearchResults = {
  tracks: [],
  albums: [],
  artists: [],
};

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

function ResultRow({
  title,
  subtitle,
  artwork,
  hasReview,
  onPress,
}: {
  title: string;
  subtitle: string;
  artwork: string;
  hasReview?: boolean;
  onPress: () => void;
}) {
  return (
    <ScalePressable onPress={onPress} style={styles.resultShell}>
      <View style={styles.resultRow}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.resultArtwork} />
        ) : (
          <View style={[styles.resultArtwork, styles.placeholderArt]} />
        )}
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={[styles.reviewBtn, hasReview && styles.reviewBtnDone]}>
          <Text style={[styles.reviewBtnTxt, hasReview && styles.reviewBtnTxtDone]}>
            {hasReview ? 'Rated' : 'Review'}
          </Text>
        </View>
      </View>
    </ScalePressable>
  );
}

export default function SearchScreen({ isActive = true }: { isActive?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<any>(null);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const modalDragY = useSharedValue(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ReviewTarget | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    const timeout = setTimeout(() => inputRef.current?.focus?.(), 120);
    return () => clearTimeout(timeout);
  }, [isActive]);

  useEffect(() => {
    loadRecentSearches().catch(console.error);
  }, []);

  // Bug #3: debounce is 400ms — only update debouncedQuery from trimmed value
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!selectedItem) {
      modalAnim.setValue(0);
      modalDragY.value = 0;
      return;
    }

    modalDragY.value = 0;
    Animated.spring(modalAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 70,
      friction: 11,
    }).start();
  }, [modalAnim, modalDragY, selectedItem]);

  useEffect(() => {
    let active = true;

    const runSearch = async () => {
      // Bug #3: guard empty query
      if (!debouncedQuery) {
        if (active) {
          setResults(EMPTY_RESULTS);
          setSearching(false);
          setErrorMsg(null);
        }
        return;
      }

      setSearching(true);
      setErrorMsg(null);
      try {
        const token = await getValidAccessToken();
        if (!token) {
          if (active) router.replace('/');
          return;
        }

        const nextResults = await searchSpotify(token, debouncedQuery);
        if (!active) return;

        setResults(nextResults);
        await persistRecentSearch(debouncedQuery);
      } catch (e) {
        if (!active) return;
        if (e instanceof SpotifyAuthError) {
          router.replace('/');
          return;
        }
        if (e instanceof SpotifyRateLimitError) {
          setErrorMsg('Too many requests — try again later');
        } else {
          setErrorMsg('Search failed. Please try again.');
        }
        setResults(EMPTY_RESULTS);
        console.error(e);
      } finally {
        if (active) setSearching(false);
      }
    };

    runSearch().catch(console.error);

    return () => {
      active = false;
    };
  }, [debouncedQuery, router]);

  const loadRecentSearches = async () => {
    const raw = await SecureStore.getItemAsync(RECENT_SEARCHES_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter(item => typeof item === 'string').slice(0, 5));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const persistRecentSearch = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      SecureStore.setItemAsync(RECENT_SEARCHES_KEY, JSON.stringify(next)).catch(console.error);
      return next;
    });
  };

  // Bug #2: check for existing review, open in edit mode if found
  const openTrackReview = async (track: PlaylistTrack) => {
    const userId = await SecureStore.getItemAsync('vinyl_user_id');
    let existingReviewId: string | undefined;
    if (userId) {
      const found = await findExistingTrackReview(userId, track.id);
      existingReviewId = found ?? undefined;
    }
    setSelectedItem({
      id: track.id,
      title: track.title,
      subtitle: track.artist,
      artwork: track.artwork,
      kind: 'track',
      album: track.album,
      existingReviewId,
    });
    setRating(0);
    setBody('');
  };

  const openAlbumReview = async (album: RecentAlbum) => {
    const userId = await SecureStore.getItemAsync('vinyl_user_id');
    let existingReviewId: string | undefined;
    if (userId) {
      const found = await findExistingAlbumReview(userId, album.id);
      existingReviewId = found ?? undefined;
    }
    setSelectedItem({
      id: album.id,
      title: album.title,
      subtitle: album.artist,
      artwork: album.artwork,
      kind: 'album',
      existingReviewId,
    });
    setRating(0);
    setBody('');
  };

  const openArtistReview = async (artist: RecentArtist) => {
    const userId = await SecureStore.getItemAsync('vinyl_user_id');
    let existingReviewId: string | undefined;
    if (userId) {
      const found = await findExistingArtistReview(userId, artist.id);
      existingReviewId = found ?? undefined;
    }
    setSelectedItem({
      id: artist.id,
      title: artist.name,
      subtitle: 'Artist Review',
      artwork: artist.artwork,
      kind: 'artist',
      existingReviewId,
    });
    setRating(0);
    setBody('');
  };

  const handleSubmit = async () => {
    if (!selectedItem || !rating) {
      Alert.alert('Pick a star rating first');
      return;
    }

    setSubmitting(true);
    try {
      const userId = await SecureStore.getItemAsync('vinyl_user_id');
      const isEdit = !!selectedItem.existingReviewId;

      if (selectedItem.kind === 'track') {
        const payload = {
          user_id: userId,
          track_id: selectedItem.id,
          title: selectedItem.title,
          artist: selectedItem.subtitle,
          album: selectedItem.album ?? '',
          artwork_url: selectedItem.artwork,
          rating,
          body: body || null,
        };
        const { error } = isEdit
          ? await supabase.from('reviews').update(payload).eq('id', selectedItem.existingReviewId!).eq('user_id', userId)
          : await supabase.from('reviews').insert(payload);
        if (error) throw error;
      }

      if (selectedItem.kind === 'album') {
        const payload = {
          user_id: userId,
          album_id: selectedItem.id,
          album_name: selectedItem.title,
          artist_name: selectedItem.subtitle,
          artwork_url: selectedItem.artwork,
          rating,
          body: body || null,
        };
        const { error } = isEdit
          ? await supabase.from('album_reviews').update(payload).eq('id', selectedItem.existingReviewId!).eq('user_id', userId)
          : await supabase.from('album_reviews').insert(payload);
        if (error) throw error;
      }

      if (selectedItem.kind === 'artist') {
        const payload = {
          user_id: userId,
          artist_id: selectedItem.id,
          artist_name: selectedItem.title,
          artwork_url: selectedItem.artwork,
          rating,
          body: body || null,
        };
        const { error } = isEdit
          ? await supabase.from('artist_reviews').update(payload).eq('id', selectedItem.existingReviewId!).eq('user_id', userId)
          : await supabase.from('artist_reviews').insert(payload);
        if (error) throw error;
      }

      setSelectedItem(null);
      setRating(0);
      setBody('');
    } catch (error) {
      console.error(error);
      Alert.alert('Failed to save review', 'Could not save your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
        runOnJS(setSelectedItem)(null);
      } else {
        modalDragY.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const modalDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalDragY.value }],
  }));

  const hasResults =
    results.tracks.length > 0 || results.albums.length > 0 || results.artists.length > 0;

  const isEditing = !!selectedItem?.existingReviewId;
  const modalLabel = isEditing
    ? 'EDIT REVIEW'
    : selectedItem?.kind === 'track'
      ? 'TRACK REVIEW'
      : selectedItem?.kind === 'album'
        ? 'ALBUM REVIEW'
        : 'ARTIST REVIEW';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.header}>
        <Text style={styles.logo}>VINYL</Text>
        <Text style={styles.subtitle}>SEARCH</Text>
        <Text style={styles.heroTitle}>Find anything worth rating.</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search tracks, albums, artists"
          placeholderTextColor="#ffffff35"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        )}

        {!debouncedQuery ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>RECENT SEARCHES</Text>
              <Text style={styles.sectionMeta}>{recentSearches.length} saved</Text>
            </View>

            {recentSearches.length ? (
              <View style={styles.recentWrap}>
                {recentSearches.map(item => (
                  <Pressable key={item} style={styles.recentChip} onPress={() => setQuery(item)}>
                    <Text style={styles.recentChipTxt}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>Search for tracks, albums, artists</Text>
                <Text style={styles.emptyText}>Your last five searches will live here for quick access.</Text>
              </View>
            )}
          </>
        ) : searching ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : hasResults ? (
          <>
            {results.tracks.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>TRACKS</Text>
                  <Text style={styles.sectionMeta}>{results.tracks.length} results</Text>
                </View>
                {results.tracks.map(track => (
                  <ResultRow
                    key={`track-${track.id}`}
                    title={track.title}
                    subtitle={track.artist}
                    artwork={track.artwork}
                    onPress={() => openTrackReview(track)}
                  />
                ))}
              </>
            )}

            {results.albums.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>ALBUMS</Text>
                  <Text style={styles.sectionMeta}>{results.albums.length} results</Text>
                </View>
                {results.albums.map(album => (
                  <ResultRow
                    key={`album-${album.id}`}
                    title={album.title}
                    subtitle={album.artist}
                    artwork={album.artwork}
                    onPress={() => openAlbumReview(album)}
                  />
                ))}
              </>
            )}

            {results.artists.length > 0 && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>ARTISTS</Text>
                  <Text style={styles.sectionMeta}>{results.artists.length} results</Text>
                </View>
                {results.artists.map(artist => (
                  <ResultRow
                    key={`artist-${artist.id}`}
                    title={artist.name}
                    subtitle="Artist"
                    artwork={artist.artwork}
                    onPress={() => openArtistReview(artist)}
                  />
                ))}
              </>
            )}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No results for "{debouncedQuery}"</Text>
            <Text style={styles.emptyText}>Try a different spelling or a broader search term.</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!selectedItem} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <GestureDetector gesture={modalPan}>
            <Reanimated.View style={[styles.modalGestureLayer, modalDragStyle]}>
              <View style={styles.modalHandle} />
              {selectedItem && (
                <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
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
                      <Text style={styles.modalLabel}>YOUR THOUGHTS</Text>
                      <TextInput
                        style={styles.modalInput}
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
                      <Text style={styles.submitTxt}>
                        {submitting ? 'Saving...' : isEditing ? 'Update Review' : 'Post Review'}
                      </Text>
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
  glowTop: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ffffff08',
  },
  header: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 18 },
  logo: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 7 },
  subtitle: { color: '#ffffff40', fontSize: 11, marginTop: 14, letterSpacing: 1.6, fontWeight: '600' },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.45, marginTop: 12, maxWidth: 280 },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 12 },
  searchInput: {
    backgroundColor: '#111111',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: '#fff',
    fontSize: 15,
  },
  content: { paddingHorizontal: 16, paddingBottom: 96 },
  errorBanner: {
    marginBottom: 16,
    backgroundColor: '#ffffff0f',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorBannerText: { color: '#ffffff80', fontSize: 13, textAlign: 'center' },
  sectionRow: {
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: '#ffffff40', fontSize: 11, letterSpacing: 1.6, fontWeight: '600' },
  sectionMeta: { color: '#ffffff30', fontSize: 12 },
  recentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  recentChip: {
    backgroundColor: '#111111',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recentChipTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  resultShell: { marginBottom: 10 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 12,
  },
  resultArtwork: { width: 58, height: 58, borderRadius: 12, backgroundColor: '#141414' },
  placeholderArt: { backgroundColor: '#141414' },
  resultInfo: { flex: 1, marginLeft: 12 },
  resultTitle: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.35 },
  resultSubtitle: { color: '#ffffff60', fontSize: 13, marginTop: 4 },
  reviewBtn: { backgroundColor: '#ffffff0f', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  reviewBtnDone: { backgroundColor: '#ffffff18' },
  reviewBtnTxt: { color: '#ffffff70', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  reviewBtnTxtDone: { color: '#fff' },
  centered: { paddingTop: 72, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingTop: 72, paddingHorizontal: 20 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  emptyText: { color: '#ffffff50', fontSize: 14, lineHeight: 22, marginTop: 8, textAlign: 'center' },
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
  modalInput: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    minHeight: 110,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  stars: { flexDirection: 'row', justifyContent: 'space-between' },
  star: { fontSize: 40, color: '#ffffff14' },
  starFilled: { color: '#F9CB42' },
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
