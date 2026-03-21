export interface Track {
  kind: "track";
  id: string;
  title: string;
  artist: string;
  album?: string | null;
  artworkUrl?: string | null;
  durationMs?: number | null;
  previewUrl?: string | null;
}

export interface Album {
  kind: "album";
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string | null;
  releaseDate?: string | null;
  totalTracks?: number | null;
}

export interface Artist {
  kind: "artist";
  id: string;
  name: string;
  imageUrl?: string | null;
  genres?: string[];
  followers?: number | null;
}

export type MusicItem = Track | Album | Artist;
