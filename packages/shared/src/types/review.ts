import type { User } from "./user";

export type ReviewKind = "track" | "album" | "artist";

export interface ReviewTarget {
  kind: ReviewKind;
  spotifyId: string;
  title: string;
  artist: string;
  artworkUrl?: string | null;
  album?: string | null;
}

export interface Review {
  id: string;
  userId: string;
  kind: ReviewKind;
  spotifyId: string;
  rating: number;
  body: string | null;
  hasSpoiler: boolean;
  helpfulVotes: number;
  createdAt: string;
  updatedAt?: string | null;
  target: ReviewTarget;
  user?: Pick<User, "id" | "username" | "displayName" | "avatarUrl" | "level">;
}

export interface ReviewMutation {
  rating: number;
  body?: string | null;
  hasSpoiler?: boolean;
}
