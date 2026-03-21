export type UserLevel = "Listener" | "Critic" | "Connoisseur" | "Legend";

export interface User {
  id: string;
  username: string;
  email?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  spotifyId?: string | null;
  level: UserLevel;
  reviewStreak: number;
  lastReviewDate?: string | null;
  isCriticVerified: boolean;
  createdAt?: string | null;
}
