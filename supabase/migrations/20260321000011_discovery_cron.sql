-- Migration: discovery cron
-- Requires pg_cron extension (enable via Supabase Dashboard > Database > Extensions > pg_cron)
-- and pg_net extension for HTTP calls

-- Function to refresh all discovery materialized views
CREATE OR REPLACE FUNCTION refresh_discovery_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hot_right_now;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_most_reviewed_week;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hidden_gems;
END;
$$;

-- Schedule cron jobs (requires pg_cron extension)
-- Uncomment after enabling pg_cron in Supabase Dashboard

-- Refresh hot_right_now every hour
-- SELECT cron.schedule(
--   'refresh-hot-right-now',
--   '0 * * * *',
--   'SELECT refresh_discovery_views()'
-- );

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION refresh_discovery_views() TO service_role;
