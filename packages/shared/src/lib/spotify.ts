import type { SupabaseClient } from "@supabase/supabase-js";

import type { Album, Artist, Track } from "../types/music";

type SpotifyProxyAction = "search" | "track" | "album" | "artist" | "album-tracks";

type SpotifySearchResponse = {
  tracks?: {
    items?: SpotifyTrack[];
  };
  albums?: {
    items?: SpotifyAlbum[];
  };
  artists?: {
    items?: SpotifyArtist[];
  };
};

type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms?: number;
  preview_url?: string | null;
  album?: {
    name?: string;
    images?: Array<{ url: string }>;
  };
  artists?: Array<{ name: string }>;
};

type SpotifyAlbum = {
  id: string;
  name: string;
  release_date?: string;
  total_tracks?: number;
  images?: Array<{ url: string }>;
  artists?: Array<{ name: string }>;
};

type SpotifyArtist = {
  id: string;
  name: string;
  genres?: string[];
  followers?: {
    total?: number;
  };
  images?: Array<{ url: string }>;
};

function mapTrack(track: SpotifyTrack): Track {
  return {
    kind: "track",
    id: track.id,
    title: track.name,
    artist: track.artists?.map((artist) => artist.name).join(", ") ?? "Unknown Artist",
    album: track.album?.name ?? null,
    artworkUrl: track.album?.images?.[0]?.url ?? null,
    durationMs: track.duration_ms ?? null,
    previewUrl: track.preview_url ?? null
  };
}

function mapAlbum(album: SpotifyAlbum): Album {
  return {
    kind: "album",
    id: album.id,
    title: album.name,
    artist: album.artists?.map((artist) => artist.name).join(", ") ?? "Unknown Artist",
    artworkUrl: album.images?.[0]?.url ?? null,
    releaseDate: album.release_date ?? null,
    totalTracks: album.total_tracks ?? null
  };
}

function mapArtist(artist: SpotifyArtist): Artist {
  return {
    kind: "artist",
    id: artist.id,
    name: artist.name,
    imageUrl: artist.images?.[0]?.url ?? null,
    genres: artist.genres ?? [],
    followers: artist.followers?.total ?? null
  };
}

async function invokeSpotifyProxy<T>(
  client: SupabaseClient,
  action: SpotifyProxyAction,
  params: Record<string, unknown>
): Promise<T> {
  const { data, error } = await client.functions.invoke<T>("spotify-proxy", {
    body: {
      action,
      params
    }
  });

  if (error) {
    throw error;
  }

  return data as T;
}

export async function searchSpotify(
  client: SupabaseClient,
  query: string
): Promise<{
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
}> {
  if (!query.trim()) {
    return {
      tracks: [],
      albums: [],
      artists: []
    };
  }

  const data = await invokeSpotifyProxy<SpotifySearchResponse>(client, "search", {
    query
  });

  return {
    tracks: data.tracks?.items?.map(mapTrack) ?? [],
    albums: data.albums?.items?.map(mapAlbum) ?? [],
    artists: data.artists?.items?.map(mapArtist) ?? []
  };
}

export async function getTrack(
  client: SupabaseClient,
  id: string
): Promise<Track> {
  const data = await invokeSpotifyProxy<SpotifyTrack>(client, "track", { id });
  return mapTrack(data);
}

export async function getAlbum(
  client: SupabaseClient,
  id: string
): Promise<Album> {
  const data = await invokeSpotifyProxy<SpotifyAlbum>(client, "album", { id });
  return mapAlbum(data);
}

export async function getArtist(
  client: SupabaseClient,
  id: string
): Promise<Artist> {
  const data = await invokeSpotifyProxy<SpotifyArtist>(client, "artist", { id });
  return mapArtist(data);
}

export async function getAlbumTracks(
  client: SupabaseClient,
  id: string
): Promise<Track[]> {
  const data = await invokeSpotifyProxy<{ items?: SpotifyTrack[] }>(client, "album-tracks", { id });
  return (data.items ?? []).map(mapTrack);
}
