-- Harden the pre-existing public schema without changing the ingest contract.
-- Public clients may read only published editorial metadata/content; all
-- editorial back office, analytics, queue, subscriber, and PPG tables remain
-- service-role-only until an authenticated ownership model exists.

create schema if not exists extensions;

-- Keep extension objects out of the API-exposed public schema. The extensions
-- are relocatable and existing columns/indexes keep their object identities.
alter extension pg_trgm set schema extensions;
alter extension vector set schema extensions;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'authors',
    'categories',
    'tags',
    'articles',
    'article_categories',
    'article_tags',
    'comments',
    'article_views',
    'media',
    'settings',
    'newsletter_subscribers',
    'ai_prompts',
    'news_queue',
    'ai_settings',
    'ai_generation_log',
    'profiles',
    'ppg_titles',
    'ppg_duplicate_clusters',
    'ppg_articles',
    'ppg_article_versions',
    'ppg_taxonomy',
    'ppg_classifications',
    'ppg_entities',
    'ppg_article_entities',
    'ppg_clusters',
    'ppg_metric_proofs',
    'ppg_connector_runs'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
      execute format('grant all on table public.%I to service_role', table_name);
    end if;
  end loop;
end
$$;

-- The public editorial contract is deliberately narrow: published articles
-- and the dimensions needed to render their public taxonomy. No writes are
-- exposed to browser roles.
grant select on table
  public.articles,
  public.authors,
  public.categories,
  public.tags,
  public.article_categories,
  public.article_tags
to anon, authenticated;

drop policy if exists "Public read published articles" on public.articles;
create policy "Public read published articles"
  on public.articles
  for select
  to anon, authenticated
  using (status = 'published' and is_published is true);

drop policy if exists "Public read active authors" on public.authors;
create policy "Public read active authors"
  on public.authors
  for select
  to anon, authenticated
  using (is_active is true);

drop policy if exists "Public read active categories" on public.categories;
create policy "Public read active categories"
  on public.categories
  for select
  to anon, authenticated
  using (is_active is true);

drop policy if exists "Public read tags" on public.tags;
create policy "Public read tags"
  on public.tags
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read published article categories" on public.article_categories;
create policy "Public read published article categories"
  on public.article_categories
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.articles as articles
      where articles.id = article_categories.article_id
        and articles.status = 'published'
        and articles.is_published is true
    )
  );

drop policy if exists "Public read published article tags" on public.article_tags;
create policy "Public read published article tags"
  on public.article_tags
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.articles as articles
      where articles.id = article_tags.article_id
        and articles.status = 'published'
        and articles.is_published is true
    )
  );

-- Preserve the existing published-content view while making it obey the
-- caller's RLS policies instead of the view owner's privileges.
alter view if exists public.articles_full set (security_invoker = true);
revoke all on table public.articles_full from public, anon, authenticated;
grant select on table public.articles_full to anon, authenticated;

-- theme_settings is intentionally public-read, but writes must remain
-- service-role-only and policies should name their target roles explicitly.
revoke all on table public.theme_settings from public, anon, authenticated;
grant select on table public.theme_settings to anon, authenticated;
drop policy if exists "Public read theme_settings" on public.theme_settings;
create policy "Public read theme_settings"
  on public.theme_settings
  for select
  to anon, authenticated
  using (true);
drop policy if exists "Service write theme_settings" on public.theme_settings;
create policy "Service write theme_settings"
  on public.theme_settings
  for all
  to service_role
  using (true)
  with check (true);

-- Eliminate mutable search_path warnings from application functions. These
-- functions are operational/admin helpers, not browser APIs.
alter function public.update_updated_at() set search_path = pg_catalog, public;
alter function public.increment_article_views(uuid, text) set search_path = pg_catalog, public;
alter function public.reset_ranking_counters(text) set search_path = pg_catalog, public;

revoke all on function public.update_updated_at() from public, anon, authenticated;
revoke all on function public.increment_article_views(uuid, text) from public, anon, authenticated;
revoke all on function public.reset_ranking_counters(text) from public, anon, authenticated;
grant execute on function public.update_updated_at() to service_role;
grant execute on function public.increment_article_views(uuid, text) to service_role;
grant execute on function public.reset_ranking_counters(text) to service_role;
