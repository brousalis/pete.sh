-- Drop Polar Loop comparison tables. Sleep stays on apple_health_daily_metrics.

DROP TRIGGER IF EXISTS polar_oauth_single_row ON polar_oauth;
DROP TRIGGER IF EXISTS polar_oauth_updated_at ON polar_oauth;
DROP FUNCTION IF EXISTS ensure_single_polar_oauth();
DROP FUNCTION IF EXISTS update_polar_oauth_updated_at();

DROP TABLE IF EXISTS polar_sleep_nights;
DROP TABLE IF EXISTS polar_oauth;
