import { FORENSICS_USER_AGENT, type FeedSource } from "./sources.ts";

export interface FeedItem {
  title: string;
  link: string;
  /** ISO 8601 (UTC) albo null, gdy kanał nie podaje poprawnej daty. */
  publishedAt: string | null;
  author: string | null;
  /** Lead z kanału, bez HTML. Pełnej treści artykułu kanały RSS nie zawierają. */
  summary: string;
  /** Surowy zwiastun/opis z kanału przed oczyszczeniem tagów HTML (do analizy linków). */
  rawSummary?: string;
}

export interface FeedFetchResult {
  sourceId: string;
  sourceName: string;
  url: string;
  ok: boolean;
  httpStatus: number;
  latencyMs: number;
  items: FeedItem[];
  error: string | null;
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", oacute: "ó", Oacute: "Ó",
  ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", bdquo: "„", rdquo: "”",
  ldquo: "“", rsquo: "’", lsquo: "‘",
};

const MIN_VALID_YEAR = 2000;
const FETCH_TIMEOUT_MS = 9000;
export const MAX_FEED_ITEMS = 60;
const MAX_FEED_BYTES = 1_500_000;

function decodeOnce(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      return String.fromCodePoint(parseInt(body.slice(2), 16));
    }
    if (body.startsWith("#")) return String.fromCodePoint(parseInt(body.slice(1), 10));
    return NAMED_ENTITIES[body] ?? match;
  });
}

/** Kanały PPG podwójnie kodują encje w CDATA (np. "&amp;oacute;"), więc dekodujemy dwa razy. */
export function decodeEntities(text: string): string {
  return decodeOnce(decodeOnce(text));
}

function unwrapCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanText(raw: string): string {
  return stripTags(decodeEntities(stripTags(decodeEntities(unwrapCdata(raw)))));
}

function readTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1] : null;
}

function readAllTags(block: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
  return Array.from(block.matchAll(regex), (m) => m[1]);
}

function readAtomLink(block: string): string | null {
  const alternate = Array.from(block.matchAll(/<link\b([^>]*)>/gi)).find((match) => {
    const attributes = match[1];
    return !/\brel\s*=\s*["'](?:self|related)["']/i.test(attributes);
  });
  const href = alternate?.[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
  return href ? cleanText(href) : null;
}

/**
 * Niektóre kanały (np. LoveKraków) podają dwie daty, jedną z dwucyfrowym rokiem, który JavaScript
 * czyta jako 1926. Bierzemy pierwszą datę z rokiem >= 2000.
 */
function parsePublishedAt(block: string): string | null {
  const candidates = [
    ...readAllTags(block, "pubDate"),
    ...readAllTags(block, "dc:date"),
    ...readAllTags(block, "published"),
    ...readAllTags(block, "updated"),
  ];
  for (const raw of candidates) {
    const parsed = new Date(unwrapCdata(raw).trim());
    if (!Number.isNaN(parsed.getTime()) && parsed.getUTCFullYear() >= MIN_VALID_YEAR) {
      return parsed.toISOString();
    }
  }
  return null;
}

/** Zwraca samo imię i nazwisko: adresów e-mail z pola <author> świadomie nie przenosimy dalej. */
function parseAuthor(block: string): string | null {
  const creator = readTag(block, "dc:creator");
  if (creator) {
    const name = cleanText(creator);
    if (name.length > 0 && !name.includes("@")) return name;
  }
  const author = readTag(block, "author");
  const atomName = author ? readTag(author, "name") : null;
  const value = cleanText(atomName ?? author ?? "");
  if (!value) return null;
  const inParentheses = value.match(/\(([^)]+)\)/);
  if (inParentheses) return inParentheses[1].trim();
  return value.includes("@") || value.length === 0 ? null : value;
}

export function parseFeed(xml: string): FeedItem[] {
  const blocks = [
    ...(xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? []).map((block) => ({ block, atom: false })),
    ...(xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) ?? []).map((block) => ({ block, atom: true })),
  ];
  const items: FeedItem[] = [];
  for (const { block, atom } of blocks.slice(0, MAX_FEED_ITEMS)) {
    const title = readTag(block, "title");
    const link = atom ? readAtomLink(block) : readTag(block, "link");
    if (title === null || link === null) continue;
    const rawDesc = readTag(block, atom ? "summary" : "description") ?? readTag(block, "content") ?? "";
    items.push({
      title: cleanText(title),
      link: cleanText(link),
      publishedAt: parsePublishedAt(block),
      author: parseAuthor(block),
      summary: cleanText(rawDesc),
      rawSummary: rawDesc,
    });
  }
  return items;
}

async function fetchSingleUrl(url: string): Promise<{ ok: boolean; httpStatus: number; body?: string; error: string | null }> {
  try {
    const parsedUrl = new URL(url);
    if (!/^https?:$/.test(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
      return { ok: false, httpStatus: 0, error: "Adres źródła nie jest publicznym adresem HTTP(S)" };
    }
    const response = await fetch(url, {
      headers: {
        "User-Agent": FORENSICS_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml;q=0.8,*/*;q=0.7",
        "Accept-Language": "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!response.ok) {
      return { ok: false, httpStatus: response.status, error: `HTTP ${response.status}` };
    }
    const body = await response.text();
    if (body.length > MAX_FEED_BYTES) {
      return { ok: false, httpStatus: response.status, error: `Kanał przekracza limit ${MAX_FEED_BYTES} bajtów` };
    }
    return { ok: true, httpStatus: response.status, body, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nieznany błąd sieci";
    return { ok: false, httpStatus: 0, error: message };
  }
}

export async function fetchFeed(source: FeedSource): Promise<FeedFetchResult> {
  const startedAt = Date.now();
  const base = { sourceId: source.id, sourceName: source.name, url: source.url };

  let attempt = await fetchSingleUrl(source.url);
  let effectiveUrl = source.url;

  if ((!attempt.ok || !attempt.body) && source.fallbackUrl) {
    const fallbackAttempt = await fetchSingleUrl(source.fallbackUrl);
    if (fallbackAttempt.ok && fallbackAttempt.body) {
      attempt = fallbackAttempt;
      effectiveUrl = source.fallbackUrl;
    }
  }

  const latencyMs = Date.now() - startedAt;
  if (!attempt.ok || !attempt.body) {
    return { ...base, url: effectiveUrl, ok: false, httpStatus: attempt.httpStatus, latencyMs, items: [], error: attempt.error };
  }

  const items = parseFeed(attempt.body);
  if (items.length === 0) {
    if (effectiveUrl === source.url && source.fallbackUrl) {
      const fallbackAttempt = await fetchSingleUrl(source.fallbackUrl);
      if (fallbackAttempt.ok && fallbackAttempt.body) {
        const fallbackItems = parseFeed(fallbackAttempt.body);
        if (fallbackItems.length > 0) {
          return {
            ...base,
            url: source.fallbackUrl,
            ok: true,
            httpStatus: fallbackAttempt.httpStatus,
            latencyMs: Date.now() - startedAt,
            items: fallbackItems,
            error: null,
          };
        }
      }
    }
    return { ...base, url: effectiveUrl, ok: false, httpStatus: attempt.httpStatus, latencyMs, items, error: "Kanał nie zawiera elementów <item>" };
  }

  return { ...base, url: effectiveUrl, ok: true, httpStatus: attempt.httpStatus, latencyMs, items, error: null };
}
