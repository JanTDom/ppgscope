import sourceRegistry from "./source-registry.ts";

const PARSER_VERSION = "rss-sitemap-ingest-v1";
const FETCH_TIMEOUT_MS = 7000;
const MAX_RESPONSE_BYTES = 1_500_000;
const MAX_ITEMS_PER_SOURCE = 24;
type SourceType = "publisher_rss" | "publisher_sitemap" | "google_news_rss";

type RegistrySource = {
  id: string;
  name: string;
  domain: string;
  region: string;
  rss_url: string;
  sitemap_url: string;
  status: string;
};

type FeedItem = { title: string; link: string; publishedAt: string | null; summary: string | null };
type FetchResult = { status: number; body: string; fetchedAt: string; responseHash: string | null; error: string | null };
type Observation = {
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
};

const sources = (sourceRegistry as RegistrySource[]).filter((source) => source.status === "DZIAŁA" && source.rss_url);
const PRIORITY_DOMAINS = ["gazetakrakowska.pl", "gloswielkopolski.pl", "gazetawroclawska.pl", "dziennikbaltycki.pl", "dziennikzachodni.pl"];
const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function headers(prefer = "return=representation") {
  return { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", Accept: "application/json", Prefer: prefer };
}

async function admin<T>(table: string, init: RequestInit = {}, query = ""): Promise<T> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query ? `?${query}` : ""}`, { ...init, headers: { ...headers(), ...(init.headers || {}) } });
  if (!response.ok) throw new Error(`Supabase ${response.status} on ${table}: ${(await response.text()).slice(0, 400)}`);
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

async function digest(value: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function decode(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, body: string) => {
    if (body.toLowerCase() === "amp") return "&";
    if (body.toLowerCase() === "lt") return "<";
    if (body.toLowerCase() === "gt") return ">";
    if (body.toLowerCase() === "quot") return '"';
    if (body.toLowerCase() === "apos") return "'";
    if (body.toLowerCase() === "nbsp") return " ";
    if (body.toLowerCase().startsWith("#x")) return String.fromCodePoint(parseInt(body.slice(2), 16));
    if (body.startsWith("#")) return String.fromCodePoint(parseInt(body.slice(1), 10));
    return match;
  });
}

function clean(value: string | null): string {
  return decode((value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function tag(block: string, name: string): string | null {
  return block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))?.[1] || null;
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(clean(value));
  return Number.isNaN(date.getTime()) || date.getUTCFullYear() < 2000 ? null : date.toISOString();
}

function parseFeed(xml: string): FeedItem[] {
  const blocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, MAX_ITEMS_PER_SOURCE).flatMap((block) => {
    const title = clean(tag(block, "title"));
    const link = clean(tag(block, "link"));
    const publishedAt = parseDate(tag(block, "pubDate") || tag(block, "dc:date") || tag(block, "published") || tag(block, "updated"));
    const summary = clean(tag(block, "description") || tag(block, "summary") || tag(block, "content"));
    return title && link ? [{ title, link, publishedAt, summary: summary || null }] : [];
  });
}

function parseSitemap(xml: string) {
  const blocks = xml.match(/<url(?:\s[^>]*)?>[\s\S]*?<\/url>/gi) || [];
  return blocks.slice(0, MAX_ITEMS_PER_SOURCE).flatMap((block) => {
    const sourceUrl = clean(tag(block, "loc"));
    if (!sourceUrl) return [];
    const newsDate = tag(block, "news:publication_date");
    const lastmod = tag(block, "lastmod");
    const publishedAt = parseDate(newsDate);
    return [{ sourceUrl, title: clean(tag(block, "news:title")) || null, publishedAt, publishedAtRaw: newsDate ? clean(newsDate) : lastmod ? clean(lastmod) : null, basis: publishedAt ? "google_news_publication_date" : lastmod ? "sitemap_lastmod" : "unavailable" }];
  });
}

function canonicalUrl(value: string, domain: string): string | null {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const normalizedDomain = domain.toLowerCase().replace(/^www\./, "");
    if (!/^https?:$/.test(parsed.protocol) || (hostname !== normalizedDomain && !hostname.endsWith(`.${normalizedDomain}`))) return null;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

async function fetchText(url: string, accept: string): Promise<FetchResult> {
  const fetchedAt = new Date().toISOString();
  try {
    const response = await fetch(url, { headers: { "User-Agent": "PPGscope/1.0 (+https://ppgscope.pl)", Accept: accept }, redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    const body = await response.text();
    const responseHash = await digest(body);
    return { status: response.status, body: response.ok && body.length <= MAX_RESPONSE_BYTES ? body : "", fetchedAt, responseHash, error: response.ok ? body.length <= MAX_RESPONSE_BYTES ? null : "response_too_large" : `http_${response.status}` };
  } catch (error) {
    return { status: 0, body: "", fetchedAt, responseHash: null, error: error instanceof Error ? error.message.slice(0, 180) : "network_error" };
  }
}

function googleUrl(domain: string): string {
  const params = new URLSearchParams({ q: `site:${domain}`, hl: "pl", gl: "PL", ceid: "PL:pl" });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

async function recordObservation(runId: string, source: RegistrySource, sourceType: SourceType, url: string, result: FetchResult, itemCount: number): Promise<Observation> {
  const row: Observation = {
    source_id: source.id,
    source_name: source.name,
    source_domain: source.domain,
    source_type: sourceType,
    source_url: url,
    fetched_at: result.fetchedAt,
    http_status: result.status,
    ok: result.error === null,
    response_hash: result.responseHash,
    item_count: itemCount,
    parser_version: PARSER_VERSION,
    error: result.error,
    metadata: { run_id: runId, region: source.region },
  };
  const rows = await admin<Observation[]>("ppg_source_observations", { method: "POST", body: JSON.stringify([{ ...row, run_id: runId }]) });
  return rows[0];
}

async function articleRows(source: RegistrySource, observation: Observation, sourceType: SourceType, feedUrl: string, items: FeedItem[]) {
  const rows = await Promise.all(items.map(async (item) => {
    const sourceUrl = canonicalUrl(item.link, source.domain);
    if (!sourceUrl) return [];
    return [{ source_id: source.id, source_name: source.name, source_domain: source.domain, source_type: sourceType, source_url: sourceUrl, feed_url: feedUrl, fetched_at: observation.fetched_at, published_at_utc: item.publishedAt, published_at_raw: item.publishedAt, title: item.title.slice(0, 1000), summary: item.summary?.slice(0, 5000) || null, content_hash: await digest(`${sourceUrl}\n${item.title}\n${item.summary || ""}`), provenance: { source_url: sourceUrl, feed_url: feedUrl, fetched_at: observation.fetched_at, published_at_utc: item.publishedAt, published_at_basis: item.publishedAt ? "rss_or_atom_date" : "unavailable", source_type: sourceType, source_id: source.id, parser_version: PARSER_VERSION }, observation_id: observation.id }];
  }));
  return rows.flat();
}

async function sitemapRows(source: RegistrySource, observation: Observation, feedUrl: string, items: ReturnType<typeof parseSitemap>) {
  const rows = await Promise.all(items.map(async (item) => {
    const sourceUrl = canonicalUrl(item.sourceUrl, source.domain);
    if (!sourceUrl) return [];
    return [{ source_id: source.id, source_name: source.name, source_domain: source.domain, source_type: "publisher_sitemap" as const, source_url: sourceUrl, feed_url: feedUrl, fetched_at: observation.fetched_at, published_at_utc: item.publishedAt, published_at_raw: item.publishedAtRaw, title: item.title || sourceUrl, summary: null, content_hash: await digest(`${sourceUrl}\n${item.title || ""}\n${item.publishedAtRaw || ""}`), provenance: { source_url: sourceUrl, feed_url: feedUrl, fetched_at: observation.fetched_at, published_at_utc: item.publishedAt, published_at_raw: item.publishedAtRaw, published_at_basis: item.basis, source_type: "publisher_sitemap", source_id: source.id, parser_version: PARSER_VERSION }, observation_id: observation.id }];
  }));
  return rows.flat();
}

function pickSources(limit: number, requestedDomains: string[] = []): RegistrySource[] {
  if (requestedDomains.length > 0) {
    const requested = requestedDomains
      .map((domain) => sources.find((source) => source.domain === domain))
      .filter((source): source is RegistrySource => Boolean(source));
    if (requested.length > 0) return requested.slice(0, limit);
  }
  const tick = Math.floor(Date.now() / (15 * 60 * 1000));
  const priority = PRIORITY_DOMAINS.map((domain) => sources.find((source) => source.domain === domain)).filter((source): source is RegistrySource => Boolean(source));
  const rotating = sources.filter((source) => !PRIORITY_DOMAINS.includes(source.domain));
  const start = (tick * Math.max(1, limit - 2)) % rotating.length;
  return [...priority.slice(0, Math.min(2, limit)), ...Array.from({ length: Math.max(0, Math.min(limit - 2, rotating.length)) }, (_, index) => rotating[(start + index) % rotating.length])];
}

async function ingestSource(runId: string, source: RegistrySource) {
  const observations: Observation[] = [];
  const rssResult = await fetchText(source.rss_url, "application/rss+xml, application/atom+xml, application/xml, text/xml");
  const rssItems = rssResult.error ? [] : parseFeed(rssResult.body);
  const rssObservation = await recordObservation(runId, source, "publisher_rss", source.rss_url, rssResult, rssItems.length);
  observations.push(rssObservation);
  if (rssResult.error === null && rssItems.length) return { observations, articles: await articleRows(source, rssObservation, "publisher_rss", source.rss_url, rssItems), success: true };

  const sitemapResult = await fetchText(source.sitemap_url, "application/xml, text/xml");
  const sitemapItems = sitemapResult.error ? [] : parseSitemap(sitemapResult.body);
  const sitemapObservation = await recordObservation(runId, source, "publisher_sitemap", source.sitemap_url, sitemapResult, sitemapItems.length);
  observations.push(sitemapObservation);
  if (sitemapResult.error === null && sitemapItems.length) return { observations, articles: await sitemapRows(source, sitemapObservation, source.sitemap_url, sitemapItems), success: true };

  const googleFeedUrl = googleUrl(source.domain);
  const googleResult = await fetchText(googleFeedUrl, "application/rss+xml, application/xml, text/xml");
  const googleItems = googleResult.error ? [] : parseFeed(googleResult.body);
  const googleObservation = await recordObservation(runId, source, "google_news_rss", googleFeedUrl, googleResult, googleItems.length);
  observations.push(googleObservation);
  return { observations, articles: googleResult.error === null ? await articleRows(source, googleObservation, "google_news_rss", googleFeedUrl, googleItems) : [], success: googleResult.error === null && googleItems.length > 0 };
}

function metric(runId: string, key: string, value: number, unit: string, status: string, start: string, end: string, observationIds: string[], articleIds: string[], urls: string[], definition: string) {
  return { run_id: runId, metric_key: key, metric_value: { value, unit }, unit, status, window_start_utc: start, window_end_utc: end, calculated_at_utc: end, calculation_version: PARSER_VERSION, query_definition: definition, source_observation_ids: observationIds, source_article_ids: articleIds, source_urls: urls, provenance: { proof_type: "derived_from_durable_ingest", run_id: runId, source_observation_ids: observationIds, source_article_ids: articleIds, source_urls: urls, calculated_at_utc: end, calculation_version: PARSER_VERSION } };
}

async function runIngest(requestedDomains: string[] = []) {
  const sourceLimit = Math.min(Math.max(Number(Deno.env.get("INGEST_MAX_SOURCES") || 12), 1), 50);
  const selected = pickSources(sourceLimit, requestedDomains);
  const startedAt = new Date().toISOString();
  const runRows = await admin<{ id: string }[]>("ppg_ingest_runs", { method: "POST", body: JSON.stringify([{ trigger_name: "supabase_edge_cron", started_at: startedAt, status: "running", source_limit: sourceLimit }]) });
  const runId = runRows[0].id;
  const errors: string[] = [];
  const observations: Observation[] = [];
  const articles: Record<string, unknown>[] = [];
  let successes = 0;
  const results = await Promise.all(selected.map(async (source) => {
    try {
      return { source, result: await ingestSource(runId, source), error: null };
    } catch (error) {
      return { source, result: null, error: `${source.domain}: ${error instanceof Error ? error.message.slice(0, 180) : "unknown_error"}` };
    }
  }));
  for (const { result, error } of results) {
    if (error) {
      errors.push(error);
    } else if (result) {
      observations.push(...result.observations);
      articles.push(...result.articles);
      if (result.success) successes += 1;
    }
  }
  const storedArticles = articles.length ? await admin<{ id: string }[]>("ppg_ingest_articles", { method: "POST", body: JSON.stringify(articles.map((article) => ({ ...article, run_id: runId, observation_ids: [article.observation_id] }))) }, "on_conflict=source_url") : [];
  const observationIds = observations.map((observation) => observation.id).filter((id): id is string => Boolean(id));
  const articleIds = storedArticles.map((article) => article.id).filter(Boolean);
  const urls = Array.from(new Set(articles.map((article) => String(article.source_url))));
  const finishedAt = new Date().toISOString();
  const proofStatus = successes === 0 ? "no_data" : errors.length ? "partial" : "observed";
  const coverage = articles.length ? Math.round((articles.filter((article) => article.published_at_utc).length / articles.length) * 1000) / 10 : 0;
  const metrics = [
    metric(runId, "ingest.sources_attempted", selected.length, "sources", proofStatus, startedAt, finishedAt, observationIds, articleIds, urls, "Liczba źródeł wybranych do cyklu rotacyjnego."),
    metric(runId, "ingest.sources_succeeded", successes, "sources", proofStatus, startedAt, finishedAt, observationIds, articleIds, urls, "Źródła z poprawnym RSS/sitemap i elementami do zapisania."),
    metric(runId, "ingest.articles_observed", articles.length, "articles", proofStatus, startedAt, finishedAt, observationIds, articleIds, urls, "Elementy RSS/sitemap po walidacji URL względem domeny źródłowej."),
    metric(runId, "ingest.published_at_coverage_pct", coverage, "percent", proofStatus, startedAt, finishedAt, observationIds, articleIds, urls, "Odsetek elementów z poprawnym published_at_utc; sitemap lastmod nie jest publikacją."),
  ];
  await admin("ppg_ingest_metric_proofs", { method: "POST", body: JSON.stringify(metrics) });
  const status = successes === 0 ? "failed" : errors.length ? "partial" : "success";
  await admin("ppg_ingest_runs", { method: "PATCH", body: JSON.stringify({ finished_at: finishedAt, status, sources_attempted: selected.length, sources_succeeded: successes, source_events_written: observationIds.length, articles_written: articleIds.length, metrics_written: metrics.length, error_count: errors.length, errors }) }, `id=eq.${encodeURIComponent(runId)}`);
  return { run_id: runId, status, sources_attempted: selected.length, sources_succeeded: successes, source_events_written: observationIds.length, articles_written: articleIds.length, metrics_written: metrics.length, errors };
}

async function status() {
  const runs = await admin<Record<string, unknown>[]>("ppg_ingest_runs", {}, "select=id,trigger_name,started_at,finished_at,status,source_limit,sources_attempted,sources_succeeded,source_events_written,articles_written,metrics_written,error_count&order=started_at.desc&limit=1");
  const latest = runs[0] || null;
  const proofs = latest ? await admin<Record<string, unknown>[]>("ppg_ingest_metric_proofs", {}, `select=metric_key,metric_value,unit,status,window_start_utc,window_end_utc,calculated_at_utc,calculation_version,source_urls,provenance&run_id=eq.${encodeURIComponent(String(latest.id))}&order=metric_key.asc`) : [];
  return { configured: true, latest_run: latest, metric_proofs: proofs };
}

async function authorize(request: Request): Promise<boolean> {
  const provided = request.headers.get("x-ppg-cron-secret") || "";
  if (!provided) return false;
  const rows = await admin<{ secret_hash: string }[]>("ppg_ingest_runtime", {}, "select=secret_hash&key=eq.cron&limit=1");
  const expected = rows[0]?.secret_hash;
  return Boolean(expected && (await digest(provided)) === expected);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  if (!supabaseUrl || !serviceRoleKey) return Response.json({ ok: false, error: "Edge function storage is not configured." }, { status: 500 });
  try {
    if (!(await authorize(request))) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const requestedDomains = Array.isArray(body.domains) ? body.domains.filter((domain: unknown): domain is string => typeof domain === "string") : [];
    const result = body.action === "status" ? await status() : await runIngest(requestedDomains);
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Ingest failed." }, { status: 500 });
  }
});
