import { createHash } from "node:crypto";
import sourceRegistry from "../../data/source-registry.json";
import { decodeEntities, parseFeed, type FeedItem } from "../forensics/feed";
import {
  supabaseAdminInsert,
  supabaseAdminPatch,
  supabaseAdminUpsert,
} from "./supabase-admin";

const PARSER_VERSION = "rss-sitemap-ingest-v1";
const FETCH_TIMEOUT_MS = 7000;
const MAX_RESPONSE_BYTES = 1_500_000;
const MAX_ITEMS_PER_SOURCE = 24;
type SourceType = "publisher_rss" | "publisher_sitemap" | "google_news_rss";

interface RegistrySource {
  id: string;
  name: string;
  domain: string;
  region: string;
  rss_url: string;
  sitemap_url: string;
  status: string;
}

interface SourceObservation {
  id?: string;
  source_id: string;
  source_name: string;
  source_domain: string;
  source_type: SourceType;
  source_url: string;
  fetched_at: string;
  http_status: number;
  ok: boolean;
  response_hash: string | null;
  item_count: number;
  parser_version: string;
  error: string | null;
  metadata: Record<string, unknown>;
}

interface IngestArticle {
  source_id: string;
  source_name: string;
  source_domain: string;
  source_type: SourceType;
  source_url: string;
  feed_url: string;
  fetched_at: string;
  published_at_utc: string | null;
  published_at_raw: string | null;
  title: string;
  summary: string | null;
  content_hash: string;
  provenance: Record<string, unknown>;
  observation_id: string;
}

interface ParsedSitemapItem {
  sourceUrl: string;
  title: string | null;
  publishedAtUtc: string | null;
  publishedAtRaw: string | null;
  publicationDateBasis: "google_news_publication_date" | "sitemap_lastmod" | "unavailable";
}

interface FetchResult {
  status: number;
  body: string;
  fetchedAt: string;
  responseHash: string | null;
  error: string | null;
}

interface RunSummary {
  run_id: string;
  status: "success" | "partial" | "failed";
  sources_attempted: number;
  sources_succeeded: number;
  source_events_written: number;
  articles_written: number;
  metrics_written: number;
  errors: string[];
}

const registry = (sourceRegistry as RegistrySource[]).filter(
  (source) => source.status === "DZIAŁA" && source.domain && source.rss_url,
);

function asPositiveInt(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeSourceUrl(value: string, allowedDomain: string): string | null {
  try {
    const parsed = new URL(value.trim());
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const domain = allowedDomain.toLowerCase().replace(/^www\./, "");
    if (!/^https?:$/.test(parsed.protocol) || (hostname !== domain && !hostname.endsWith(`.${domain}`))) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000) return null;
  return date.toISOString();
}

function cleanText(value: string | null): string {
  return decodeEntities((value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function parseSitemap(xml: string): ParsedSitemapItem[] {
  const urls = xml.match(/<url(?:\s[^>]*)?>[\s\S]*?<\/url>/gi) || [];
  return urls.slice(0, MAX_ITEMS_PER_SOURCE).flatMap((block) => {
    const loc = block.match(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/i)?.[1];
    if (!loc) return [];
    const newsDate = block.match(/<news:publication_date(?:\s[^>]*)?>([\s\S]*?)<\/news:publication_date>/i)?.[1] || null;
    const lastmod = block.match(/<lastmod(?:\s[^>]*)?>([\s\S]*?)<\/lastmod>/i)?.[1] || null;
    const title = block.match(/<news:title(?:\s[^>]*)?>([\s\S]*?)<\/news:title>/i)?.[1] || null;
    const parsedNewsDate = parseDate(cleanText(newsDate));
    const parsedLastmod = parseDate(cleanText(lastmod));
    return [{
      sourceUrl: cleanText(loc),
      title: title ? cleanText(title) : null,
      publishedAtUtc: parsedNewsDate,
      publishedAtRaw: newsDate ? cleanText(newsDate) : lastmod ? cleanText(lastmod) : null,
      publicationDateBasis: parsedNewsDate
        ? "google_news_publication_date"
        : parsedLastmod
          ? "sitemap_lastmod"
          : "unavailable",
    }];
  });
}

async function fetchText(url: string, accept: string): Promise<FetchResult> {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "PPGscope/1.0 (+https://ppgscope.pl)",
        Accept: accept,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    const body = await response.text();
    if (body.length > MAX_RESPONSE_BYTES) {
      return { status: response.status, body: "", fetchedAt, responseHash: sha256(body), error: "response_too_large" };
    }
    return {
      status: response.status,
      body: response.ok ? body : "",
      fetchedAt,
      responseHash: sha256(body),
      error: response.ok ? null : `http_${response.status}`,
    };
  } catch (error) {
    return {
      status: 0,
      body: "",
      fetchedAt,
      responseHash: null,
      error: error instanceof Error ? error.message.slice(0, 180) : "network_error",
    };
  }
}

function googleNewsUrl(domain: string): string {
  const params = new URLSearchParams({ q: `site:${domain}`, hl: "pl", gl: "PL", ceid: "PL:pl" });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

function observationRow(runId: string, source: RegistrySource, sourceType: SourceType, sourceUrl: string, result: FetchResult, itemCount: number, metadata: Record<string, unknown> = {}): SourceObservation {
  return {
    source_id: source.id,
    source_name: source.name,
    source_domain: source.domain,
    source_type: sourceType,
    source_url: sourceUrl,
    fetched_at: result.fetchedAt,
    http_status: result.status,
    ok: result.error === null,
    response_hash: result.responseHash,
    item_count: itemCount,
    parser_version: PARSER_VERSION,
    error: result.error,
    metadata: { run_id: runId, region: source.region, ...metadata },
  };
}

function feedArticles(items: FeedItem[], source: RegistrySource, observationId: string, sourceType: SourceType, feedUrl: string, fetchedAt: string): IngestArticle[] {
  return items.flatMap((item) => {
    const sourceUrl = normalizeSourceUrl(item.link, source.domain);
    if (!sourceUrl || !item.title) return [];
    return [{
      source_id: source.id,
      source_name: source.name,
      source_domain: source.domain,
      source_type: sourceType,
      source_url: sourceUrl,
      feed_url: feedUrl,
      fetched_at: fetchedAt,
      published_at_utc: item.publishedAt,
      published_at_raw: item.publishedAt,
      title: item.title.slice(0, 1000),
      summary: item.summary ? item.summary.slice(0, 5000) : null,
      content_hash: sha256(`${sourceUrl}\n${item.title}\n${item.summary}`),
      observation_id: observationId,
      provenance: {
        source_url: sourceUrl,
        feed_url: feedUrl,
        fetched_at: fetchedAt,
        published_at_utc: item.publishedAt,
        published_at_basis: item.publishedAt ? "rss_or_atom_date" : "unavailable",
        source_type: sourceType,
        source_id: source.id,
        parser_version: PARSER_VERSION,
      },
    }];
  });
}

function sitemapArticles(items: ParsedSitemapItem[], source: RegistrySource, observationId: string, sourceType: SourceType, feedUrl: string, fetchedAt: string): IngestArticle[] {
  return items.flatMap((item) => {
    const sourceUrl = normalizeSourceUrl(item.sourceUrl, source.domain);
    if (!sourceUrl) return [];
    return [{
      source_id: source.id,
      source_name: source.name,
      source_domain: source.domain,
      source_type: sourceType,
      source_url: sourceUrl,
      feed_url: feedUrl,
      fetched_at: fetchedAt,
      published_at_utc: item.publishedAtUtc,
      published_at_raw: item.publishedAtRaw,
      title: item.title || sourceUrl,
      summary: null,
      content_hash: sha256(`${sourceUrl}\n${item.title || ""}\n${item.publishedAtRaw || ""}`),
      observation_id: observationId,
      provenance: {
        source_url: sourceUrl,
        feed_url: feedUrl,
        fetched_at: fetchedAt,
        published_at_utc: item.publishedAtUtc,
        published_at_raw: item.publishedAtRaw,
        published_at_basis: item.publicationDateBasis,
        source_type: sourceType,
        source_id: source.id,
        parser_version: PARSER_VERSION,
      },
    }];
  });
}

async function observe(runId: string, source: RegistrySource, sourceType: SourceType, sourceUrl: string, accept: string, parser: (body: string) => number): Promise<{ observation: SourceObservation; itemCount: number; body: string }> {
  const result = await fetchText(sourceUrl, accept);
  const itemCount = result.error === null ? parser(result.body) : 0;
  return { observation: observationRow(runId, source, sourceType, sourceUrl, result, itemCount), itemCount, body: result.body };
}

async function ingestSource(runId: string, source: RegistrySource): Promise<{ observations: SourceObservation[]; articles: IngestArticle[]; success: boolean }> {
  const observations: SourceObservation[] = [];
  const rss = await observe(runId, source, "publisher_rss", source.rss_url, "application/rss+xml, application/atom+xml, application/xml, text/xml", (body) => parseFeed(body).length);
  const rssRows = await supabaseAdminInsert<SourceObservation[]>("ppg_source_observations", [{ ...rss.observation, run_id: runId }]);
  observations.push(...rssRows);
  if (rss.observation.ok) {
    const items = parseFeed(rss.body);
    const observationId = rssRows[0]?.id;
    if (observationId && items.length > 0) {
      return { observations: rssRows, articles: feedArticles(items, source, observationId, "publisher_rss", source.rss_url, rss.observation.fetched_at), success: true };
    }
  }

  const sitemap = await observe(runId, source, "publisher_sitemap", source.sitemap_url, "application/xml, text/xml", (body) => parseSitemap(body).length);
  const sitemapRows = await supabaseAdminInsert<SourceObservation[]>("ppg_source_observations", [{ ...sitemap.observation, run_id: runId }]);
  observations.push(...sitemapRows);
  if (sitemap.observation.ok) {
    const items = parseSitemap(sitemap.body);
    const observationId = sitemapRows[0]?.id;
    if (observationId && items.length > 0) {
      return { observations, articles: sitemapArticles(items, source, observationId, "publisher_sitemap", source.sitemap_url, sitemap.observation.fetched_at), success: true };
    }
  }

  const googleUrl = googleNewsUrl(source.domain);
  const google = await observe(runId, source, "google_news_rss", googleUrl, "application/rss+xml, application/xml, text/xml", (body) => parseFeed(body).length);
  const googleRows = await supabaseAdminInsert<SourceObservation[]>("ppg_source_observations", [{ ...google.observation, run_id: runId }]);
  observations.push(...googleRows);
  if (google.observation.ok) {
    const items = parseFeed(google.body);
    const observationId = googleRows[0]?.id;
    if (observationId && items.length > 0) {
      return { observations, articles: feedArticles(items, source, observationId, "google_news_rss", googleUrl, google.observation.fetched_at), success: true };
    }
  }
  return { observations, articles: [], success: false };
}

function chooseSources(limit: number): RegistrySource[] {
  if (registry.length === 0) return [];
  const tick = Math.floor(Date.now() / (15 * 60 * 1000));
  const start = (tick * limit) % registry.length;
  return Array.from({ length: Math.min(limit, registry.length) }, (_, index) => registry[(start + index) % registry.length]);
}

function metricRow(runId: string, metricKey: string, metricValue: number, unit: string, status: "observed" | "partial" | "no_data", start: string, end: string, observationIds: string[], articleIds: string[], sourceUrls: string[], definition: string) {
  return {
    run_id: runId,
    metric_key: metricKey,
    metric_value: { value: metricValue, unit },
    unit,
    status,
    window_start_utc: start,
    window_end_utc: end,
    calculated_at_utc: end,
    calculation_version: PARSER_VERSION,
    query_definition: definition,
    source_observation_ids: observationIds,
    source_article_ids: articleIds,
    source_urls: sourceUrls,
    provenance: {
      proof_type: "derived_from_durable_ingest",
      run_id: runId,
      source_observation_ids: observationIds,
      source_article_ids: articleIds,
      source_urls: sourceUrls,
      calculated_at_utc: end,
      calculation_version: PARSER_VERSION,
    },
  };
}

export async function runScheduledIngest(options: { sourceLimit?: number; triggerName?: string } = {}): Promise<RunSummary> {
  const sourceLimit = options.sourceLimit || asPositiveInt(process.env.INGEST_MAX_SOURCES, 12, 50);
  const sources = chooseSources(sourceLimit);
  const startedAt = new Date().toISOString();
  const runRows = await supabaseAdminInsert<{ id: string }[]>("ppg_ingest_runs", [{ trigger_name: options.triggerName || "vercel_cron", started_at: startedAt, status: "running", source_limit: sourceLimit }]);
  const runId = runRows[0]?.id;
  if (!runId) throw new Error("Supabase did not return the ingest run id.");

  const errors: string[] = [];
  let sourcesSucceeded = 0;
  const allObservations: SourceObservation[] = [];
  const allArticles: IngestArticle[] = [];

  for (const source of sources) {
    try {
      const result = await ingestSource(runId, source);
      allObservations.push(...result.observations);
      allArticles.push(...result.articles);
      if (result.success) sourcesSucceeded += 1;
    } catch (error) {
      errors.push(`${source.domain}: ${error instanceof Error ? error.message.slice(0, 180) : "unknown_error"}`);
    }
  }

  const articles = allArticles.length > 0
    ? await supabaseAdminUpsert<Array<{ id: string }>>("ppg_ingest_articles", allArticles.map((article) => ({ ...article, run_id: runId, observation_ids: [article.observation_id] })), "source_url")
    : [];
  const articleIds = articles.map((article) => article.id).filter(Boolean);
  const observationIds = allObservations.map((observation) => observation.id).filter((id): id is string => Boolean(id));
  const sourceUrls = Array.from(new Set(allArticles.map((article) => article.source_url)));
  const finishedAt = new Date().toISOString();
  const windowStart = startedAt;
  const proofStatus = sourcesSucceeded === 0 ? "no_data" : errors.length > 0 ? "partial" : "observed";
  const coverage = allArticles.length === 0 ? 0 : Math.round((allArticles.filter((article) => article.published_at_utc).length / allArticles.length) * 1000) / 10;
  const metrics = [
    metricRow(runId, "ingest.sources_attempted", sources.length, "sources", proofStatus, windowStart, finishedAt, observationIds, articleIds, sourceUrls, "Liczba źródeł wybranych do tego cyklu rotacyjnego."),
    metricRow(runId, "ingest.sources_succeeded", sourcesSucceeded, "sources", proofStatus, windowStart, finishedAt, observationIds, articleIds, sourceUrls, "Źródła z poprawną odpowiedzią i co najmniej jednym elementem RSS/sitemap."),
    metricRow(runId, "ingest.articles_observed", allArticles.length, "articles", proofStatus, windowStart, finishedAt, observationIds, articleIds, sourceUrls, "Liczba elementów zakwalifikowanych po walidacji URL z bieżącego cyklu."),
    metricRow(runId, "ingest.published_at_coverage_pct", coverage, "percent", proofStatus, windowStart, finishedAt, observationIds, articleIds, sourceUrls, "Odsetek elementów z poprawnie znormalizowanym published_at_utc; sitemap lastmod nie jest traktowany jako data publikacji."),
  ];
  await supabaseAdminInsert("ppg_ingest_metric_proofs", metrics);

  const status = sourcesSucceeded === 0 ? "failed" : errors.length > 0 ? "partial" : "success";
  await supabaseAdminPatch("ppg_ingest_runs", `id=eq.${encodeURIComponent(runId)}`, {
    finished_at: finishedAt,
    status,
    sources_attempted: sources.length,
    sources_succeeded: sourcesSucceeded,
    source_events_written: observationIds.length,
    articles_written: articleIds.length,
    metrics_written: metrics.length,
    error_count: errors.length,
    errors,
  });

  return { run_id: runId, status, sources_attempted: sources.length, sources_succeeded: sourcesSucceeded, source_events_written: observationIds.length, articles_written: articleIds.length, metrics_written: metrics.length, errors };
}
