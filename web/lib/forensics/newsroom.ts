import type { FeedItem } from "./feed.ts";

export interface NewsroomInput {
  portalName: string;
  item: FeedItem;
}

export interface AuthorProfile {
  author: string;
  /** Podpis "opr. Imię Nazwisko": opracowanie cudzego materiału, nie tekst autorski. */
  adaptation: boolean;
  portals: string[];
  articles: number;
  firstPublishedAt: string | null;
  lastPublishedAt: string | null;
  /** Największa liczba tekstów tego autora w jednym oknie czasowym. */
  maxBurstInWindow: number;
  avgLeadChars: number;
}

export interface NewsroomReport {
  sampleSize: number;
  /** Teksty z podpisem imieniem i nazwiskiem, bez opracowań. */
  namedCount: number;
  /** Teksty z podpisem "opr." (opracowanie). */
  adaptationCount: number;
  /** Teksty bez podpisu osobowego (redakcja, agencja, brak). */
  unnamedCount: number;
  cronMinuteCount: number;
  cronMinutePct: number;
  /** Ile wyniosłoby cronMinutePct przy czysto losowych minutach publikacji. */
  cronBaselinePct: number;
  /** Udział trzech najczęstszych autorów podpisanych. Null, gdy próbka jest za mała na wniosek. */
  top3SharePct: number | null;
  top3Reliable: boolean;
  burstWindowMinutes: number;
  burstThreshold: number;
  authors: AuthorProfile[];
}

export interface NewsroomOptions {
  burstWindowMinutes: number;
  burstThreshold: number;
  /** Minimalna liczba podpisanych tekstów, od której podajemy udział top 3. */
  minNamedForTop3: number;
}

export const DEFAULT_NEWSROOM_OPTIONS: NewsroomOptions = {
  burstWindowMinutes: 90,
  burstThreshold: 3,
  minNamedForTop3: 20,
};

const CRON_MINUTES: ReadonlySet<number> = new Set([0, 15, 30, 45]);
const CRON_BASELINE_PCT = Math.round((CRON_MINUTES.size / 60) * 1000) / 10;
const ADAPTATION_PATTERN = /^opr\.?\s+\S/i;
const UNNAMED_PATTERN = /^(?:redakcja|zespół|zespol|red\.?|admin|autor|wydawca|naszemiasto|polska press|pap|materiał partnera)/i;
const MS_PER_MINUTE = 60_000;

type AuthorKind = "named" | "adaptation" | "unnamed";

function classifyAuthor(author: string | null): AuthorKind {
  if (author === null) return "unnamed";
  const trimmed = author.trim();
  if (ADAPTATION_PATTERN.test(trimmed)) return "adaptation";
  return trimmed.split(/\s+/).length >= 2 && !UNNAMED_PATTERN.test(trimmed) ? "named" : "unnamed";
}

function maxBurst(timesMs: readonly number[], windowMinutes: number): number {
  const sorted = [...timesMs].sort((a, b) => a - b);
  const windowMs = windowMinutes * MS_PER_MINUTE;
  let best = 0;
  let start = 0;
  for (let end = 0; end < sorted.length; end += 1) {
    while (sorted[end] - sorted[start] > windowMs) start += 1;
    best = Math.max(best, end - start + 1);
  }
  return best;
}

export function analyzeNewsroom(
  inputs: readonly NewsroomInput[],
  options: NewsroomOptions = DEFAULT_NEWSROOM_OPTIONS,
): NewsroomReport {
  const byAuthor = new Map<string, { kind: AuthorKind; entries: NewsroomInput[] }>();
  let cronMinuteCount = 0;
  let datedCount = 0;
  let unnamedCount = 0;

  for (const input of inputs) {
    if (input.item.publishedAt) {
      datedCount += 1;
      if (CRON_MINUTES.has(new Date(input.item.publishedAt).getUTCMinutes())) cronMinuteCount += 1;
    }
    const kind = classifyAuthor(input.item.author);
    if (kind === "unnamed" || input.item.author === null) {
      unnamedCount += 1;
      continue;
    }
    const key = input.item.author.trim();
    const group = byAuthor.get(key) ?? { kind, entries: [] };
    group.entries.push(input);
    byAuthor.set(key, group);
  }

  const authors: AuthorProfile[] = Array.from(byAuthor, ([author, { kind, entries }]) => {
    const times = entries
      .map((entry) => (entry.item.publishedAt ? Date.parse(entry.item.publishedAt) : Number.NaN))
      .filter((t) => !Number.isNaN(t));
    const leadChars = entries.map((entry) => entry.item.summary.length);
    return {
      author,
      adaptation: kind === "adaptation",
      portals: Array.from(new Set(entries.map((entry) => entry.portalName))),
      articles: entries.length,
      firstPublishedAt: times.length > 0 ? new Date(Math.min(...times)).toISOString() : null,
      lastPublishedAt: times.length > 0 ? new Date(Math.max(...times)).toISOString() : null,
      maxBurstInWindow: maxBurst(times, options.burstWindowMinutes),
      avgLeadChars: Math.round(leadChars.reduce((sum, n) => sum + n, 0) / leadChars.length),
    };
  }).sort((a, b) => b.articles - a.articles || a.author.localeCompare(b.author, "pl"));

  const named = authors.filter((a) => !a.adaptation);
  const namedCount = named.reduce((sum, a) => sum + a.articles, 0);
  const adaptationCount = authors.filter((a) => a.adaptation).reduce((sum, a) => sum + a.articles, 0);
  const top3Reliable = namedCount >= options.minNamedForTop3;
  const top3Sum = named.slice(0, 3).reduce((sum, a) => sum + a.articles, 0);

  return {
    sampleSize: inputs.length,
    namedCount,
    adaptationCount,
    unnamedCount,
    cronMinuteCount,
    cronMinutePct: datedCount === 0 ? 0 : Math.round((cronMinuteCount / datedCount) * 1000) / 10,
    cronBaselinePct: CRON_BASELINE_PCT,
    top3SharePct: top3Reliable && namedCount > 0 ? Math.round((top3Sum / namedCount) * 1000) / 10 : null,
    top3Reliable,
    burstWindowMinutes: options.burstWindowMinutes,
    burstThreshold: options.burstThreshold,
    authors,
  };
}
