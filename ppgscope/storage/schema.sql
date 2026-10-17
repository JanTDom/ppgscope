-- =====================================================================
-- PPGscope: Production PostgreSQL (Supabase) Database Schema with pgvector
-- Schema version: 1.0.0
-- =====================================================================

-- Enable pgvector extension for emergent topic clustering and semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Titles and Source Registry
CREATE TABLE IF NOT EXISTS ppg_titles (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL UNIQUE,
    region VARCHAR(128) NOT NULL,
    type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DZIAŁA',
    error_reason TEXT,
    robots_url TEXT NOT NULL,
    google_news_sitemap TEXT,
    sitemap_url TEXT,
    rss_url TEXT,
    last_success_at TIMESTAMPTZ,
    fetched_records_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Duplicate Clusters (Syndicate Content / Teksty Wspólne)
CREATE TABLE IF NOT EXISTS ppg_duplicate_clusters (
    cluster_id VARCHAR(64) PRIMARY KEY,
    original_url TEXT NOT NULL,
    original_published_at TIMESTAMPTZ NOT NULL,
    original_title TEXT NOT NULL,
    original_press_title VARCHAR(255) NOT NULL,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    member_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Ingested Articles
CREATE TABLE IF NOT EXISTS ppg_articles (
    canonical_url TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    lead TEXT,
    body TEXT NOT NULL,
    author VARCHAR(255),
    published_at TIMESTAMPTZ NOT NULL,
    modified_at TIMESTAMPTZ,
    section VARCHAR(255),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    press_title VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL REFERENCES ppg_titles(domain) ON UPDATE CASCADE,
    region VARCHAR(128),
    raw_html_hash CHAR(64) NOT NULL,
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_cluster_id VARCHAR(64) REFERENCES ppg_duplicate_clusters(cluster_id) ON DELETE SET NULL,
    original_article_url TEXT,
    embedding vector(384), -- Optional semantic embedding for level-2 emerging topics
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-performance aggregations and audit queries
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON ppg_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_domain ON ppg_articles (domain);
CREATE INDEX IF NOT EXISTS idx_articles_is_duplicate ON ppg_articles (is_duplicate);
CREATE INDEX IF NOT EXISTS idx_articles_cluster ON ppg_articles (duplicate_cluster_id);
CREATE INDEX IF NOT EXISTS idx_articles_raw_hash ON ppg_articles (raw_html_hash);

-- 4. Topic Classifications (Audit & Provenance)
CREATE TABLE IF NOT EXISTS ppg_classifications (
    canonical_url TEXT PRIMARY KEY REFERENCES ppg_articles(canonical_url) ON DELETE CASCADE,
    primary_topic VARCHAR(64) NOT NULL,
    secondary_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence NUMERIC(4, 3) NOT NULL,
    model_version VARCHAR(64) NOT NULL,
    prompt_version VARCHAR(64),
    taxonomy_version VARCHAR(32) NOT NULL,
    classified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classifications_primary ON ppg_classifications (primary_topic);

-- 5. Metric Audit Trail (Data Provenance & Truth)
CREATE TABLE IF NOT EXISTS ppg_metric_proofs (
    id BIGSERIAL PRIMARY KEY,
    metric_name VARCHAR(128) NOT NULL,
    metric_value JSONB NOT NULL,
    status VARCHAR(32) NOT NULL, -- POMIAR, PRZYBLIŻENIE, SZACUNEK
    source VARCHAR(128) NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sample_size INTEGER NOT NULL DEFAULT 1,
    methodology_version VARCHAR(64) NOT NULL,
    p_value NUMERIC(6, 5),
    is_significant BOOLEAN,
    details JSONB
);

CREATE INDEX IF NOT EXISTS idx_metric_proofs_name ON ppg_metric_proofs (metric_name, measured_at DESC);
