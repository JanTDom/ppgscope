import type { FeedItem } from "./feed.ts";
import { tokens } from "./text.ts";
import type { BlindspotRow } from "./blindspot.ts";

const MAX_QUERY_WORDS = 4;
const MIN_QUERY_WORD_LENGTH = 5;

/**
 * Zapytanie do Google News ograniczone do domeny dziennika. Słowa łączymy przez OR, a o tym, czy
 * wynik jest ten sam temat, decyduje potem nasze dopasowanie (zapytanie AND byłoby zbyt kruche przy
 * innym sformułowaniu nagłówka).
 */
export function buildGoogleNewsQuery(title: string, domain: string): string {
  const stop = new Set(tokens("oraz który która które przez jako przy tylko jeszcze będzie wideo zdjęcia"));
  const words = Array.from(
    new Set(
      title
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length >= MIN_QUERY_WORD_LENGTH && !stop.has(word.toLowerCase())),
    ),
  )
    .sort((a, b) => b.length - a.length)
    .slice(0, MAX_QUERY_WORDS);
  return `site:${domain} (${words.join(" OR ")}) when:2d`;
}

export function googleNewsUrl(query: string): string {
  const params = new URLSearchParams({ q: query, hl: "pl", gl: "PL", ceid: "PL:pl" });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

/** Google News dokleja do tytułu " - Nazwa serwisu"; usuwamy to przed porównaniem. */
export function cleanGoogleNewsItem(item: FeedItem): FeedItem {
  return { ...item, title: item.title.replace(/\s+-\s+[^-]+$/, "").trim(), summary: "" };
}

/**
 * Wiersze BRAK_W_PPG, których nie zdążyliśmy sprawdzić w Google News, nie mogą zostać zarzutem.
 * Zamieniamy je na NIEROZSTRZYGALNE z jawnym powodem.
 */
export function limitToVerified(rows: readonly BlindspotRow[], verifiedLinks: ReadonlySet<string>): BlindspotRow[] {
  return rows.map((row) =>
    row.status === "BRAK_W_PPG" && !verifiedLinks.has(row.link)
      ? { ...row, status: "NIEROZSTRZYGALNE", undecidedReason: "Poza limitem weryfikacji w Google News" }
      : row,
  );
}
