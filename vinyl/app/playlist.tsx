import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  getPlaylistTracks,
  getValidAccessToken,
  PlaylistTrack,
  SpotifyAuthError,
  SpotifyRateLimitError,
} from '../lib/spotify';
import { findExistingTrackReview } from '../lib/reviews';
import { supabase } from '../lib/supabase';

const FILLED_STAR = '\u2605';
const LEFT_ARROW = '\u2190';

type ReviewDraft = {
  rating: number;
  body: string;
};

type SelectedTrack = PlaylistTrack & {
  existingReviewId?: string;
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

function TrackRow({
  item,
  review,
  onPress,
}: {
  item: PlaylistTrack;
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
          <Text style={styles.trackAlbum} numberOfLines={1}>
            {item.album}
          </Text>
        </View>
        <View style={[styles.rateBtn, review && styles.rateBtnDone]}>
          <Text style={[styles.rateTxt, review && styles.rateTxtDone]}>{review ? 'Rated' : 'Rate'}</Text>
        </View>
      </View>
    </ScalePressable>
  );
}

export default function PlaylistScreen() {
  const router = useRouter();
  const { playlistId, name, owner, artwork } = useLocalSearchParams<{
    playlistId: string;
    name?: string;
    owner?: string;
    artwork?: string;
  }>();

  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [reviews, setReviews] = useState<Record<string, ReviewDraft>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SelectedTrack | null>(null);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const swipeX = useSharedValue(0);
  const modalDragY = useSharedValue(0);
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  useEffect(() => {
    if (selectedTrack) {
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
  }, [modalAnim, modalDragY, selectedTrack]);

  const loadPlaylist = async () => {
    if (!playlistId) {
      setLoading(false);
      return;
    }

    const token = await getValidAccessToken();
    if (!token) {
      router.replace('/');
      return;
    }

    setErrorMsg(null);
    try {
      setTracks(await getPlaylistTracks(token, playlistId));
    } catch (e) {
      if (e instanceof SpotifyAuthError) {
        router.replace('/');
        return;
      }
      if (e instanceof SpotifyRateLimitError) {
        setErrorMsg('Too many requests — try again later');
      } else {
        setErrorMsg('Could not load playlist, pull to refresh');
      }
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Bug #2: check for existing review, open in edit mode if found
  const openReview = async (track: PlaylistTrack) => {
    const userId = await SecureStore.getItemAsync('vinyl_user_id');
    let existingReviewId: string | undefined;
    if (userId) {
      const found = await findExistingTrackReview(userId, track.id);
      existingReviewId = found ?? undefined;
    }
    setSelectedTrack({ ...track, existingReviewId });
    setRating(reviews[track.id]?.rating ?? 0);
    setBody(reviews[track.id]?.body ?? '');
  };

  const handleSubmit = async () => {
    if (!selectedTrack || !rating) {
      Alert.alert('Pick a star rating first');
      return;
    }

    setSubmitting(true);
    try {
      const userId = await SecureStore.getItemAsync('vinyl_user_id');
      const isEdit = !!selectedTrack.existingReviewId;

      const payload = {
        user_id: userId,
        track_id: selectedTrack.id,
        title: selectedTrack.title,
        artist: selectedTrack.artist,
        album: selectedTrack.album,
        artwork_url: selectedTrack.artwork,
        rating,
        body: body || null,
      };

      const { error } = isEdit
        ? await supabase.from('reviews').update(payload).eq('id', selectedTrack.existingReviewId!).eq('user_id', userId)
        : await supabase.from('reviews').insert(payload);

      if (error) throw error;

      setReviews(prev => ({ ...prev, [selectedTrack.id]: { rating, body } }));
      setSelectedTrack(null);
      setRating(0);
      setBody('');
    } catch (error) {
      console.error(error);
      Alert.alert('Failed to save review', 'Could not save your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
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

  const modalPan = Gesture.Pan()
    .activeOffsetY([12, 999])
    .failOffsetX([-18, 18])
    .onUpdate(event => {
      modalDragY.value = Math.max(0, event.translationY);
    })
    .onEnd(event => {
      if (event.translationY > 140 || event.velocityY > 900) {
        modalDragY.value = withSpring(800, { damping: 20, stiffness: 140 });
        runOnJS(setSelectedTrack)(null);
      } else {
        modalDragY.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  const modalDragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalDragY.value }],
  }));

  const isEditing = !!selectedTrack?.existingReviewId;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <GestureDetector gesture={backGesture}>
        <Reanimated.View style={[styles.container, swipeStyle]}>
          <View style={styles.glowTop} />
          <View style={styles.navBar}>
            <ScalePressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backTxt}>{LEFT_ARROW} Back</Text>
            </ScalePressable>
          </View>

          <FlatList
            data={tracks}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <>
                <View style={styles.header}>
                  {artwork ? (
                    <Image source={{ uri: artwork }} style={styles.heroArtwork} />
                  ) : (
                    <View style={[styles.heroArtwork, styles.placeholderArt]} />
                  )}
                  <Text style={styles.heroTitle}>{name || 'Playlist'}</Text>
                  <Text style={styles.heroMeta}>
                    {owner || 'Spotify'} · {tracks.length} tracks
                  </Text>
                </View>

                {errorMsg && (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{errorMsg}</Text>
                  </View>
                )}

                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>PLAYLIST TRACKS</Text>
                  <Text style={styles.sectionMeta}>{tracks.length} songs</Text>
                </View>
              </>
            }
            renderItem={({ item }) => (
              <TrackRow item={item} review={reviews[item.id]} onPress={() => openReview(item)} />
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No tracks found</Text>
                <Text style={styles.emptyText}>This playlist may be empty or unavailable right now.</Text>
              </View>
            }
          />
        </Reanimated.View>
      </GestureDetector>

      <Modal visible={!!selectedTrack} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <GestureDetector gesture={modalPan}>
            <Reanimated.View style={[styles.modalGestureLayer, modalDragStyle]}>
              <View style={styles.modalHandle} />
              {selectedTrack && (
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
                    <Text style={styles.modalEyebrow}>
                      {isEditing ? 'EDIT REVIEW' : 'TRACK REVIEW'}
                    </Text>
                    <View style={styles.modalHeaderRow}>
                      <Image source={{ uri: selectedTrack.artwork }} style={styles.modalArtwork} />
                      <View style={styles.modalHeaderInfo}>
                        <Text style={styles.modalTitle} numberOfLines={2}>
                          {selectedTrack.title}
                        </Text>
                        <Text style={styles.modalArtist} numberOfLines={2}>
                          {selectedTrack.artist}
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
                      <Text style={styles.submitTxt}>
                        {submitting ? 'Saving...' : isEditing ? 'Update Review' : 'Post Review'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => setSelectedTrack(null)} style={styles.cancelBtn}>
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
  centered: { flex: 1, backgroundColor: '#080808', justifyContent: 'center', alignItems: 'center' },
  glowTop: {
    position: 'absolute',
    top: -100,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ffffff08',
  },
  navBar: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff0f',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backTxt: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  list: { paddingBottom: 40 },
  header: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22 },
  heroArtwork: { width: 112, height: 112, borderRadius: 18, backgroundColor: '#141414', marginBottom: 16 },
  placeholderArt: { backgroundColor: '#141414' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '700', letterSpacing: -0.45, textAlign: 'center' },
  heroMeta: { color: '#ffffff60', fontSize: 14, marginTop: 8, textAlign: 'center' },
  errorBanner: {
    marginHorizontal: 4,
    marginBottom: 16,
    backgroundColor: '#ffffff0f',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  errorBannerText: { color: '#ffffff80', fontSize: 13, textAlign: 'center' },
  sectionRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: '#ffffff40', fontSize: 11, letterSpacing: 1.6, fontWeight: '600' },
  sectionMeta: { color: '#ffffff30', fontSize: 12 },
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
  info: { flex: 1, marginLeft: 12 },
  trackTitle: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: -0.35 },
  trackArtist: { color: '#ffffff60', fontSize: 13, marginTop: 3 },
  trackAlbum: { color: '#ffffff40', fontSize: 12, marginTop: 5 },
  rateBtn: { backgroundColor: '#ffffff0f', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  rateBtnDone: { backgroundColor: '#ffffff18' },
  rateTxt: { color: '#ffffff70', fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  rateTxtDone: { color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 32 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
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
