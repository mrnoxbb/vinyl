import * as Sentry from '@sentry/react-native';

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return; // skip in dev if not configured

  Sentry.init({
    dsn,
    // Capture 100% of transactions in dev, 10% in production
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Capture 100% of sessions for session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: __DEV__,
  });
}
