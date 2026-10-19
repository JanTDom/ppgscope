-- Durable RSS/sitemap ingest with an auditable provenance chain.
-- The existing ppg_* tables are legacy and remain untouched. These tables are
-- intentionally server-only: the dashboard reads a filtered status API.

create extension if not exists pgcrypto;

create table if not exists public.ppg_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_name text not null default 'vercel_cron',
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  source_limit integer not null default 12 check (source_limit between 1 and 100),
  sources_attempted integer not null default 0,
  sources_succeeded integer not null default 0,
  source_events_written integer not null default 0,
  articles_written integer not null default 0,
  metrics_written integer not null default 0,
  error_count integer not null default 0,
  errors jsonb not null default '[]'::jsonb
);

create index if not exists ppg_ingest_runs_started_at_idx
  on public.ppg_ingest_runs (started_at desc);

create table if not exists public.ppg_source_observations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ppg_ingest_runs(id) on delete cascade,
  source_id text not null,
  source_name text not null,
  source_domain text not null,
  source_type text not null check (source_type in ('publisher_rss', 'publisher_sitemap', 'google_news_rss')),
  source_url text not null,
  fetched_at timestamptz not null,
  http_status integer not null default 0,
  ok boolean not null default false,
  response_hash text,
  item_count integer not null default 0,
  parser_version text not null,
  error text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists ppg_source_observations_run_idx
  on public.ppg_source_observations (run_id);
create index if not exists ppg_source_observations_fetched_idx
  on public.ppg_source_observations (fetched_at desc);
create index if not exists ppg_source_observations_domain_idx
  on public.ppg_source_observations (source_domain, fetched_at desc);

create table if not exists public.ppg_ingest_articles (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ppg_ingest_runs(id) on delete cascade,
  observation_id uuid not null references public.ppg_source_observations(id) on delete restrict,
  source_id text not null,
  source_name text not null,
  source_domain text not null,
  source_type text not null check (source_type in ('publisher_rss', 'publisher_sitemap', 'google_news_rss')),
  source_url text not null unique,
  feed_url text not null,
  fetched_at timestamptz not null,
  published_at_utc timestamptz,
  published_at_raw text,
  title text not null,
  summary text,
  content_hash text not null,
  provenance jsonb not null,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  observation_ids uuid[] not null default '{}'::uuid[]
);

create index if not exists ppg_ingest_articles_published_idx
  on public.ppg_ingest_articles (published_at_utc desc nulls last);
create index if not exists ppg_ingest_articles_fetched_idx
  on public.ppg_ingest_articles (fetched_at desc);
create index if not exists ppg_ingest_articles_domain_idx
  on public.ppg_ingest_articles (source_domain, published_at_utc desc nulls last);

create table if not exists public.ppg_ingest_metric_proofs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ppg_ingest_runs(id) on delete cascade,
  metric_key text not null,
  metric_value jsonb not null,
  unit text not null,
  status text not null check (status in ('observed', 'partial', 'no_data')),
  window_start_utc timestamptz not null,
  window_end_utc timestamptz not null,
  calculated_at_utc timestamptz not null,
  calculation_version text not null,
  query_definition text not null,
  source_observation_ids uuid[] not null default '{}'::uuid[],
  source_article_ids uuid[] not null default '{}'::uuid[],
  source_urls text[] not null default '{}'::text[],
  provenance jsonb not null
);

create index if not exists ppg_ingest_metric_proofs_key_idx
  on public.ppg_ingest_metric_proofs (metric_key, calculated_at_utc desc);
create index if not exists ppg_ingest_metric_proofs_run_idx
  on public.ppg_ingest_metric_proofs (run_id);

alter table public.ppg_ingest_runs enable row level security;
alter table public.ppg_source_observations enable row level security;
alter table public.ppg_ingest_articles enable row level security;
alter table public.ppg_ingest_metric_proofs enable row level security;

revoke all on table public.ppg_ingest_runs from anon, authenticated;
revoke all on table public.ppg_source_observations from anon, authenticated;
revoke all on table public.ppg_ingest_articles from anon, authenticated;
revoke all on table public.ppg_ingest_metric_proofs from anon, authenticated;

comment on table public.ppg_ingest_runs is 'Server-only scheduled ingest runs; no public client grant.';
comment on table public.ppg_source_observations is 'Immutable-ish fetch observations proving which feed/sitemap was fetched and when.';
comment on table public.ppg_ingest_articles is 'Deduplicated articles with source_url, fetched_at, published_at_utc and provenance.';
comment on table public.ppg_ingest_metric_proofs is 'Every derived ingest metric carries source observation/article IDs and source URLs.';
