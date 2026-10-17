-- =====================================================================
-- PPGscope: Production PostgreSQL (Supabase) Database Schema with pgvector
-- Schema version: 1.1.0
-- =====================================================================

-- Enable pgvector extension for emergent topic clustering and semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Outlets & Sources Registry
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

-- 2. Duplicate Groups / Clusters (Syndicated Content / Teksty Wspólne)
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

-- 3. Articles (Idempotent Canonical URL)
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
    embedding vector(384),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_published_at ON ppg_articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_domain ON ppg_articles (domain);
CREATE INDEX IF NOT EXISTS idx_articles_is_duplicate ON ppg_articles (is_duplicate);
CREATE INDEX IF NOT EXISTS idx_articles_cluster ON ppg_articles (duplicate_cluster_id);
CREATE INDEX IF NOT EXISTS idx_articles_raw_hash ON ppg_articles (raw_html_hash);

-- 4. Article Versions (Audit trail of article content edits)
CREATE TABLE IF NOT EXISTS ppg_article_versions (
    id BIGSERIAL PRIMARY KEY,
    canonical_url TEXT NOT NULL REFERENCES ppg_articles(canonical_url) ON DELETE CASCADE,
    version_num INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    lead TEXT,
    body TEXT NOT NULL,
    raw_html_hash CHAR(64) NOT NULL,
    modified_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_versions_url ON ppg_article_versions (canonical_url, version_num);

-- 5. Versioned Taxonomy Definitions
CREATE TABLE IF NOT EXISTS ppg_taxonomy (
    id SERIAL PRIMARY KEY,
    topic_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    taxonomy_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (topic_id, taxonomy_version)
);

-- 6. Topic Classifications (Provenance, Primary & Secondary Roles)
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
CREATE INDEX IF NOT EXISTS idx_classifications_date ON ppg_classifications (classified_at DESC);

-- 7. Named Entities (People, Institutions, Locations)
CREATE TABLE IF NOT EXISTS ppg_entities (
    id BIGSERIAL PRIMARY KEY,
    entity_name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(64) NOT NULL, -- PERSON, INSTITUTION, LOCATION, COMPANY
    normalized_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_type, normalized_name)
);

CREATE TABLE IF NOT EXISTS ppg_article_entities (
    canonical_url TEXT NOT NULL REFERENCES ppg_articles(canonical_url) ON DELETE CASCADE,
    entity_id BIGINT NOT NULL REFERENCES ppg_entities(id) ON DELETE CASCADE,
    mention_count INTEGER NOT NULL DEFAULT 1,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.0,
    PRIMARY KEY (canonical_url, entity_id)
);

-- 8. Emergent Clusters (Level 2 Topic Clusters)
CREATE TABLE IF NOT EXISTS ppg_clusters (
    id VARCHAR(64) PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    cluster_label VARCHAR(255) NOT NULL,
    article_count INTEGER NOT NULL DEFAULT 0,
    representative_titles JSONB NOT NULL DEFAULT '[]'::jsonb,
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Metric Snapshots / Proofs (Truth Over Everything)
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

-- 10. Connector Runs (Audit of every ingestion run)
CREATE TABLE IF NOT EXISTS ppg_connector_runs (
    id BIGSERIAL PRIMARY KEY,
    connector_id VARCHAR(64) NOT NULL,
    domain VARCHAR(255),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL, -- RUNNING, SUCCESS, PARTIAL, ERROR
    records_fetched INTEGER NOT NULL DEFAULT 0,
    error_details TEXT
);

CREATE INDEX IF NOT EXISTS idx_connector_runs ON ppg_connector_runs (connector_id, started_at DESC);
