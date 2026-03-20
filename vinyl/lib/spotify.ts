import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID!;

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

// ---------------------------------------------------------------------------
// Auth failure handler — screens register their router.replace('/') here
// so getValidAccessToken can trigger sign-out without needing React context.
// ---------------------------------------------------------------------------
let _authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: () => void) {
  _authFailureHandler = handler;
}

async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync('vinyl_user_id'),
    SecureStore.deleteItemAsync('vinyl_access_token'),
    SecureStore.deleteItemAsync('vinyl_token_expires_at'),
  ]);
}

// ---------------------------------------------------------------------------
// Typed Spotify errors
// ---------------------------------------------------------------------------
export class SpotifyAuthError extends Error {
  constructor(message = 'Spotify session expired') {
    super(message);
    this.name = 'SpotifyAuthError';
  }
}

export class SpotifyRateLimitError extends Error {
  constructor() {
    super('Too many requests — try again later');
    this.name = 'SpotifyRateLimitError';
  }
}

function handleSpotifyError(status: number, message: string): never {
  if (status === 401) throw new SpotifyAuthError(message);
  if (status === 429) throw new SpotifyRateLimitError();
  throw new Error(message);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type RecentTrackArtist = {
  id: string;
  name: string;
};

export type RecentTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  played_at: string;
  album_id: string;
  artists_data: RecentTrackArtist[];
};

export type RecentAlbum = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
};

export type RecentArtist = {
  id: string;
  name: string;
  artwork: string;
};

export type LikedTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  added_at: string;
};

export type UserPlaylist = {
  id: string;
  name: string;
  artwork: string;
  owner: string;
  track_count: number;
};

export type PlaylistTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
};

export type SearchResults = {
  tracks: PlaylistTrack[];
  albums: RecentAlbum[];
  artists: RecentArtist[];
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export function useSpotifyAuth() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'vinyl' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: [
        'user-read-recently-played',
        'user-library-read',
        'playlist-read-private',
        'playlist-read-collaborative',
        'user-read-private',
        'user-read-email',
        'user-read-playback-state',
      ],
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discovery,
  );

  return { request, response, promptAsync, redirectUri };
}

export async function exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  return res.json();
}

async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || data?.error || 'Failed to refresh Spotify token');
  }
  return data;
}

export async function getValidAccessToken(): Promise<string | null> {
  const userId = await SecureStore.getItemAsync('vinyl_user_id');
  const storedToken = await SecureStore.getItemAsync('vinyl_access_token');
  const storedExpiry = await SecureStore.getItemAsync('vinyl_token_expires_at');

  // Token still valid — use it directly
  if (storedToken && storedExpiry && new Date(storedExpiry).getTime() > Date.now() + 60_000) {
    return storedToken;
  }

  if (!userId) return storedToken;

  const { data: user } = await supabase
    .from('users')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', userId)
    .single();

  if (!user) return storedToken;

  const remoteExpiry = user.token_expires_at ? new Date(user.token_expires_at).getTime() : 0;
  if (user.access_token && remoteExpiry > Date.now() + 60_000) {
    await SecureStore.setItemAsync('vinyl_access_token', user.access_token);
    await SecureStore.setItemAsync('vinyl_token_expires_at', user.token_expires_at);
    return user.access_token;
  }

  if (!user.refresh_token) {
    return user.access_token ?? storedToken;
  }

  // Attempt refresh with exponential backoff — 3 retries before clearing session
  const MAX_RETRIES = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    }
    try {
      const refreshed = await refreshAccessToken(user.refresh_token);
      const nextAccessToken: string = refreshed.access_token;
      const nextRefreshToken: string = refreshed.refresh_token ?? user.refresh_token;
      const nextExpiry = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();

      await supabase
        .from('users')
        .update({
          access_token: nextAccessToken,
          refresh_token: nextRefreshToken,
          token_expires_at: nextExpiry,
        })
        .eq('id', userId);

      await SecureStore.setItemAsync('vinyl_access_token', nextAccessToken);
      await SecureStore.setItemAsync('vinyl_token_expires_at', nextExpiry);

      return nextAccessToken;
    } catch (err) {
      lastError = err;
      console.warn(`[spotify] token refresh attempt ${attempt + 1} failed:`, err);
    }
  }

  console.error('[spotify] all refresh attempts failed:', lastError);
  await clearSession();
  _authFailureHandler?.();
  return null;
}

// ---------------------------------------------------------------------------
// Spotify API
// ---------------------------------------------------------------------------
export async function getSpotifyProfile(accessToken: string) {
  const res = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    handleSpotifyError(res.status, error?.error?.message || 'Failed to load Spotify profile');
  }
  return res.json();
}

export async function getRecentlyPlayed(accessToken: string): Promise<RecentTrack[]> {
  const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    handleSpotifyError(res.status, error?.error?.message || 'Failed to load recently played tracks');
  }
  const data = await res.json();

  return (
    data.items?.map((item: any) => ({
      id: item.track.id,
      title: item.track.name,
      artist: item.track.artists.map((a: any) => a.name).join(', '),
      album: item.track.album.name,
      artwork: item.track.album.images[0]?.url ?? '',
      played_at: item.played_at,
      album_id: item.track.album.id,
      artists_data: item.track.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
      })),
    })) ?? []
  );
}

export async function getLikedTracks(accessToken: string): Promise<LikedTrack[]> {
  const res = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    handleSpotifyError(res.status, error?.error?.message || 'Failed to load liked songs');
  }
  const data = await res.json();

  return (
    data.items?.map((item: any) => ({
      id: item.track.id,
      title: item.track.name,
      artist: item.track.artists.map((artist: any) => artist.name).join(', '),
      album: item.track.album.name,
      artwork: item.track.album.images?.[0]?.url ?? '',
      added_at: item.added_at,
    })) ?? []
  );
}

export function buildRecentAlbums(tracks: RecentTrack[]): RecentAlbum[] {
  const albums = new Map<string, RecentAlbum>();

  tracks.forEach(track => {
    const albumId = track.album_id ?? `${track.album}-${track.artist}`;
    if (albums.has(albumId)) return;

    albums.set(albumId, {
      id: albumId,
      title: track.album,
      artist: track.artist,
      artwork: track.artwork,
    });
  });

  return Array.from(albums.values());
}

/** Batch-fetch up to 50 artist images per request — fixes N+1. */
export async function getArtistsBatch(accessToken: string, ids: string[]): Promise<RecentArtist[]> {
  if (!ids.length) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += 50) {
    chunks.push(ids.slice(i, i + 50));
  }

  const results: RecentArtist[] = [];
  for (const chunk of chunks) {
    const res = await fetch(`https://api.spotify.com/v1/artists?ids=${chunk.join(',')}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => null);
      handleSpotifyError(res.status, error?.error?.message || 'Failed to load artists');
    }
    const data = await res.json();
    const batch: RecentArtist[] =
      data.artists?.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        artwork: artist.images?.[0]?.url ?? '',
      })) ?? [];
    results.push(...batch);
  }
  return results;
}

export async function getRecentArtists(accessToken: string, tracks: RecentTrack[]): Promise<RecentArtist[]> {
  const artistMap = new Map<string, RecentTrackArtist>();

  tracks.forEach(track => {
    track.artists_data.forEach(artist => {
      if (!artist?.id || artistMap.has(artist.id)) return;
      artistMap.set(artist.id, artist);
    });
  });

  return getArtistsBatch(accessToken, Array.from(artistMap.keys()));
}

export async function getUserPlaylists(accessToken: string): Promise<UserPlaylist[]> {
  const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    handleSpotifyError(res.status, error?.error?.message || 'Failed to load playlists');
  }
  const data = await res.json();

  return (
    data.items?.map((playlist: any) => ({
      id: playlist.id,
      name: playlist.name,
      artwork: playlist.images?.[0]?.url ?? '',
      owner: playlist.owner?.display_name ?? 'Spotify',
      track_count: playlist.tracks?.total ?? 0,
    })) ?? []
  );
}

export async function getPlaylistTracks(accessToken: string, playlistId: string): Promise<PlaylistTrack[]> {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    handleSpotifyError(res.status, error?.error?.message || 'Failed to load playlist tracks');
  }
  const data = await res.json();

  return (
    data.items
      ?.filter((item: any) => item.track?.id)
      .map((item: any) => ({
        id: item.track.id,
        title: item.track.name,
        artist: item.track.artists.map((artist: any) => artist.name).join(', '),
        album: item.track.album.name,
        artwork: item.track.album.images?.[0]?.url ?? '',
      })) ?? []
  );
}

export async function searchSpotify(accessToken: string, query: string): Promise<SearchResults> {
  if (!query.trim()) {
    return { tracks: [], albums: [], artists: [] };
  }

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query.trim())}&type=track,album,artist&limit=8`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    handleSpotifyError(res.status, error?.error?.message || 'Failed to search Spotify');
  }
  const data = await res.json();

  return {
    tracks:
      data.tracks?.items?.map((track: any) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map((artist: any) => artist.name).join(', '),
        album: track.album.name,
        artwork: track.album.images?.[0]?.url ?? '',
      })) ?? [],
    albums:
      data.albums?.items?.map((album: any) => ({
        id: album.id,
        title: album.name,
        artist: album.artists.map((artist: any) => artist.name).join(', '),
        artwork: album.images?.[0]?.url ?? '',
      })) ?? [],
    artists:
      data.artists?.items?.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
        artwork: artist.images?.[0]?.url ?? '',
      })) ?? [],
  };
}

export async function saveUserToSupabase(profile: any, accessToken: string, refreshToken: string) {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        spotify_id: profile.id,
        display_name: profile.display_name,
        avatar_url: profile.images?.[0]?.url ?? null,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      },
      { onConflict: 'spotify_id' },
    )
    .select()
    .single();

  return { data, error };
}

export async function getCurrentlyPlaying(accessToken: string) {
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    handleSpotifyError(res.status, error?.error?.message || 'Failed to load currently playing track');
  }
  const data = await res.json();
  if (!data || !data.item) return null;
  return {
    id: data.item.id,
    title: data.item.name,
    artist: data.item.artists.map((a: any) => a.name).join(', '),
    album: data.item.album.name,
    artwork: data.item.album.images[0]?.url ?? '',
    isPlaying: data.is_playing,
    progressMs: data.progress_ms,
    durationMs: data.item.duration_ms,
  };
}
