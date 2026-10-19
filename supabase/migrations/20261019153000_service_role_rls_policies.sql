-- Make the intended private access contract explicit for the advisor and for
-- future maintainers. The service role already bypasses RLS, but this policy
-- documents that it is the only non-public actor allowed on these tables.

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
    'ppg_connector_runs',
    'ppg_ingest_runs',
    'ppg_source_observations',
    'ppg_ingest_articles',
    'ppg_ingest_metric_proofs',
    'ppg_ingest_runtime',
    'theme_settings'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('drop policy if exists %I on public.%I', 'Service role full access', table_name);
      execute format(
        'create policy %I on public.%I for all to service_role using (true) with check (true)',
        'Service role full access', table_name
      );
    end if;
  end loop;
end
$$;
