export const RATING_STEP = 0.5;
export const MAX_REVIEW_BODY = 500;
export const MIN_TASTE_OVERLAP = 5;
export const MAX_LIST_TITLE = 100;
export const MAX_DIARY_NOTE = 200;

export const COLORS = {
  background:    '#0a0a0a',
  surface:       '#111111',
  surfaceAlt:    '#1a1a1a',
  border:        '#2a2a2a',
  borderLight:   '#333333',
  textPrimary:   '#ffffff',
  textSecondary: '#a0a0a0',
  textTertiary:  '#666666',
  accent:        '#534AB7',
  accentLight:   '#7F77DD',
  success:       '#1D9E75',
  warning:       '#BA7517',
  danger:        '#E24B4A',
} as const;

export type ColorKey = keyof typeof COLORS;

export const LEVEL_THRESHOLDS = {
  Listener:    0,
  Critic:      10,
  Connoisseur: 50,
  Legend:      200,
} as const;

export const BADGE_TYPES = {
  STREAK_7:       'streak_7',
  STREAK_30:      'streak_30',
  STREAK_100:     'streak_100',
  FIRST_REVIEW:   'first_review',
  REVIEWS_100:    'reviews_100',
  HELPFUL_CRITIC: 'helpful_critic',
} as const;

// Keep legacy alias so any existing imports still compile
export const DARK_PALETTE = {
  background:        COLORS.background,
  backgroundMuted:   COLORS.surface,
  surface:           COLORS.surfaceAlt,
  surfaceElevated:   '#1d1d1d',
  surfaceInteractive:'#252525',
  border:            COLORS.border,
  borderStrong:      COLORS.borderLight,
  textPrimary:       COLORS.textPrimary,
  textSecondary:     COLORS.textSecondary,
  textMuted:         COLORS.textTertiary,
  accent:            COLORS.accent,
  accentMuted:       COLORS.accentLight,
  accentContrast:    '#0d0b1f',
  success:           COLORS.success,
  warning:           COLORS.warning,
  danger:            COLORS.danger,
  info:              '#38bdf8',
} as const;

export type DarkPaletteKey = keyof typeof DARK_PALETTE;
