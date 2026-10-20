import {
  DEFAULT_BLINDSPOT_OPTIONS,
  detectBlindspots,
  type BlindspotRow,
  type BlindspotStatus,
  type PpgIndexedItem,
} from "./blindspot.ts";
import { buildGoogleNewsQuery, cleanGoogleNewsItem, googleNewsUrl, limitToVerified } from "./coverage.ts";
import { fetchFeed, type FeedFetchResult, type FeedItem } from "./feed.ts";
import { analyzeNewsroom, type NewsroomReport } from "./newsroom.ts";
import {
  analyzeStreamRotation,
  analyzeStreamPaywall,
  analyzeStreamLinks,
  type StreamIntelligence,
} from "./streams.ts";
import {
  BLOCKED_MODULES,
  COMPETITOR_FEEDS,
  OFFICIAL_FEEDS,
  PPG_FEEDS,
  VERIFIED_ON,
  type CompetitorFeedSource,
} from "./sources.ts";
import { detectVerbatim, type VerbatimReport } from "./verbatim.ts";

export const METHODOLOGY_VERSION = "v3.0.0-live";
export const MAX_VERIFIED_PER_COMPETITOR = 8;
const ROWS_PER_COMPETITOR = 12;

export type GoogleNewsSearch = (query: string) => Promise<FeedItem[]>;

export interface SourceStatus {
  id: string;
  name: string;
  role: "PPG" | "KONKURENT" | "INSTYTUCJA";
  url: string;
  ok: boolean;
  httpStatus: number;
  items: number;
  latencyMs: number;
  error: string | null;
}

export interface BlindspotComparison {
  competitorId: string;
  competitorName: string;
  region: string;
  ppgNames: string[];
  feedOk: boolean;
  ppgSampleSize: number;
  counts: Record<BlindspotStatus, number>;
  rows: BlindspotRow[];
}

export interface ForensicsPayload {
  measuredAt: string;
  methodologyVersion: string;
  /** Wszystkie wskaźniki tego modułu to PRZYBLIŻENIE (kanały RSS, nie pełna treść stron). */
  proofStatus: "PRZYBLIŻENIE";
  verifiedSourcesOn: string;
  sources: SourceStatus[];
  blindspot: BlindspotComparison[];
  verbatim: VerbatimReport & { officialItems: number };
  newsroom: NewsroomReport;
  streamIntelligence: StreamIntelligence;
  blocked: typeof BLOCKED_MODULES;
}

const EMPTY_COUNTS = (): Record<BlindspotStatus, number> => ({ POKRYTE: 0, BRAK_W_PPG: 0, NIEROZSTRZYGALNE: 0 });

function hostnameOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export async function searchGoogleNews(query: string): Promise<FeedItem[]> {
  const result = await fetchFeed({ id: "google-news", name: "Google News", url: googleNewsUrl(query) });
  return result.ok ? result.items.map(cleanGoogleNewsItem) : [];
}

/**
 * Porównuje kanał konkurenta z dziennikami PPG, a każdy tekst pozornie nieobecny w kanale RSS
 * sprawdza drugim źródłem (Google News z ograniczeniem do domeny dziennika). Kanał główny PPG nie
 * obejmuje wszystkich działów (np. sportu), więc sam kanał nie wystarcza na zarzut przeoczenia.
 */
export async function compareWithVerification(
  competitor: CompetitorFeedSource,
  competitorFeed: FeedFetchResult,
  ppgItems: readonly PpgIndexedItem[],
  nowMs: number,
  search: GoogleNewsSearch,
): Promise<BlindspotComparison> {
  const ppgNames = Array.from(new Set(ppgItems.map((p) => p.portalName)));
  const base = { competitorId: competitor.id, competitorName: competitor.name, region: competitor.region, ppgNames };
  if (!competitorFeed.ok) {
    return { ...base, feedOk: false, ppgSampleSize: ppgItems.length, counts: EMPTY_COUNTS(), rows: [] };
  }
  const options = { nowMs, ...DEFAULT_BLINDSPOT_OPTIONS };
  const firstPass = detectBlindspots(competitorFeed.items, ppgItems, options);
  const candidates = firstPass.filter((row) => row.status === "BRAK_W_PPG").slice(0, MAX_VERIFIED_PER_COMPETITOR);
  const domains = PPG_FEEDS.filter((feed) => competitor.ppgIds.includes(feed.id)).map((feed) => hostnameOf(feed.url));

  const found = await Promise.all(
    candidates.flatMap((row) => domains.map((domain) => search(buildGoogleNewsQuery(row.title, domain)))),
  );
  const extra: PpgIndexedItem[] = found.flat().map((item) => ({ portalId: "google-news", portalName: "Google News", item }));
  const secondPass = detectBlindspots(competitorFeed.items, [...ppgItems, ...extra], options);
  const rows = limitToVerified(secondPass, new Set(candidates.map((row) => row.link)));

  const counts = EMPTY_COUNTS();
  for (const row of rows) counts[row.status] += 1;
  return { ...base, feedOk: true, ppgSampleSize: ppgItems.length, counts, rows: rows.slice(0, ROWS_PER_COMPETITOR) };
}

function toStatus(result: FeedFetchResult, role: SourceStatus["role"]): SourceStatus {
  return {
    id: result.sourceId,
    name: result.sourceName,
    role,
    url: result.url,
    ok: result.ok,
    httpStatus: result.httpStatus,
    items: result.items.length,
    latencyMs: result.latencyMs,
    error: result.error,
  };
}

export async function runForensics(nowMs: number = Date.now()): Promise<ForensicsPayload> {
  const [ppgResults, competitorResults, officialResults] = await Promise.all([
    Promise.all(PPG_FEEDS.map(fetchFeed)),
    Promise.all(COMPETITOR_FEEDS.map(fetchFeed)),
    Promise.all(OFFICIAL_FEEDS.map(fetchFeed)),
  ]);

  const ppgIndexed: PpgIndexedItem[] = ppgResults.flatMap((result) =>
    result.items.map((item) => ({ portalId: result.sourceId, portalName: result.sourceName, item })),
  );

  const blindspot = await Promise.all(
    COMPETITOR_FEEDS.map((competitor, index) =>
      compareWithVerification(
        competitor,
        competitorResults[index],
        ppgIndexed.filter((p) => competitor.ppgIds.includes(p.portalId)),
        nowMs,
        searchGoogleNews,
      ),
    ),
  );

  const officialItems = officialResults.flatMap((result) =>
    result.items.map((item) => ({ institutionName: result.sourceName, item })),
  );
  const verbatim = detectVerbatim(
    ppgIndexed.map((p) => ({ portalName: p.portalName, item: p.item })),
    officialItems,
  );
  const newsroom = analyzeNewsroom(ppgIndexed.map((p) => ({ portalName: p.portalName, item: p.item })));

  const streamRotation = analyzeStreamRotation(
    ppgResults,
    competitorResults,
    PPG_FEEDS,
    COMPETITOR_FEEDS,
    nowMs,
  );

  const streamPaywall = analyzeStreamPaywall(
    ppgIndexed.map((p) => ({ portalName: p.portalName, item: p.item })),
  );

  const streamLinks = analyzeStreamLinks(
    ppgIndexed.map((p) => ({ portalName: p.portalName, item: p.item })),
  );

  return {
    measuredAt: new Date(nowMs).toISOString(),
    methodologyVersion: METHODOLOGY_VERSION,
    proofStatus: "PRZYBLIŻENIE",
    verifiedSourcesOn: VERIFIED_ON,
    sources: [
      ...ppgResults.map((r) => toStatus(r, "PPG")),
      ...competitorResults.map((r) => toStatus(r, "KONKURENT")),
      ...officialResults.map((r) => toStatus(r, "INSTYTUCJA")),
    ],
    blindspot,
    verbatim: { ...verbatim, officialItems: officialItems.length },
    newsroom,
    streamIntelligence: {
      rotation: streamRotation,
      paywall: streamPaywall,
      links: streamLinks,
    },
    blocked: BLOCKED_MODULES,
  };
}
