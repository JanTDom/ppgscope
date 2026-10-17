-- =====================================================================
-- PPGscope: Server-Side Aggregation Views & Functions (Punkt 2 Architecture)
-- Enables instant queries over millions of articles without loading raw records.
-- =====================================================================

-- 1. Materialized View for Pre-Computed Aggregates per Domain, Locality, and Time
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ppg_domain_aggregates AS
SELECT 
    domain,
    locality,
    press_title,
    DATE_TRUNC('day', published_at) AS pub_day,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE locality = 'C') AS count_c,
    COUNT(*) FILTER (WHERE locality = 'CL') AS count_cl,
    COUNT(*) FILTER (WHERE locality = 'L') AS count_l
FROM ppg_articles
GROUP BY domain, locality, press_title, DATE_TRUNC('day', published_at);

-- Create fast indexes on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_ppg_domain ON mv_ppg_domain_aggregates(domain, pub_day);
CREATE INDEX IF NOT EXISTS idx_mv_ppg_press ON mv_ppg_domain_aggregates(press_title, pub_day);

-- 2. Fast SQL Stored Function for Dashboard Aggregates
CREATE OR REPLACE FUNCTION get_ppg_stats(
    p_preset TEXT DEFAULT '30d',
    p_press_title TEXT DEFAULT 'ALL'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    -- Determine start timestamp
    IF p_preset = '24h' THEN
        v_start_date := NOW() - INTERVAL '24 hours';
    ELSIF p_preset = '7d' THEN
        v_start_date := NOW() - INTERVAL '7 days';
    ELSIF p_preset = '30d' THEN
        v_start_date := NOW() - INTERVAL '30 days';
    ELSIF p_preset = '90d' THEN
        v_start_date := NOW() - INTERVAL '90 days';
    ELSIF p_preset = '1y' THEN
        v_start_date := NOW() - INTERVAL '1 year';
    ELSE
        v_start_date := '2024-03-09 08:00:00+01'::TIMESTAMPTZ;
    END IF;

    SELECT jsonb_build_object(
        'total_articles', COALESCE(SUM(total_count), 0),
        'count_c', COALESCE(SUM(count_c), 0),
        'count_cl', COALESCE(SUM(count_cl), 0),
        'count_l', COALESCE(SUM(count_l), 0),
        'local_content_share', 
            CASE WHEN SUM(total_count) > 0 
                 THEN ROUND(((SUM(count_l) + SUM(count_cl))::NUMERIC / SUM(total_count)::NUMERIC) * 100, 1)
                 ELSE 0.0 END,
        'localization_index',
            CASE WHEN (SUM(count_c) + SUM(count_cl)) > 0
                 THEN ROUND((SUM(count_cl)::NUMERIC / (SUM(count_c) + SUM(count_cl))::NUMERIC) * 100, 1)
                 ELSE 0.0 END
    )
    INTO v_result
    FROM mv_ppg_domain_aggregates
    WHERE pub_day >= v_start_date
      AND (p_press_title = 'ALL' OR press_title = p_press_title);

    RETURN v_result;
END;
$$;
