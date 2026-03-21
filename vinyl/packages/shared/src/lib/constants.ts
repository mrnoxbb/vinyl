export const RATING_STEP = 0.5;
export const MAX_REVIEW_BODY = 500;
export const MIN_TASTE_OVERLAP = 5;

export const DARK_PALETTE = {
  background: "#0a0a0a",
  backgroundMuted: "#111111",
  surface: "#161616",
  surfaceElevated: "#1d1d1d",
  surfaceInteractive: "#252525",
  border: "#2e2e2e",
  borderStrong: "#3b3b3b",
  textPrimary: "#f5f5f5",
  textSecondary: "#c7c7c7",
  textMuted: "#8b8b8b",
  accent: "#1db954",
  accentMuted: "#159146",
  accentContrast: "#061109",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#38bdf8"
} as const;

export type DarkPaletteKey = keyof typeof DARK_PALETTE;
