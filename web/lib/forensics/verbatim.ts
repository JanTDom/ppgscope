import type { FeedItem } from "./feed.ts";
import { containment, shingles, tokens } from "./text.ts";

export type VerbatimLevel = "PRZEPISANY_KOMUNIKAT" | "CZESCIOWE_PRZEJECIE";

export interface VerbatimInput {
  portalName: string;
  item: FeedItem;
}

export interface OfficialInput {
  institutionName: string;
  item: FeedItem;
}

export interface VerbatimRow {
  portalName: string;
  title: string;
  link: string;
  author: string | null;
  level: VerbatimLevel;
  /** Odsetek 4-wyrazowych fraz z leadu, które występują w komunikacie instytucji. */
  verbatimPct: number;
  institutionName: string;
  officialTitle: string;
  officialLink: string;
}

export interface VerbatimReport {
  checkedLeads: number;
  skippedShortLeads: number;
  rows: VerbatimRow[];
}

export interface VerbatimOptions {
  shingleSize: number;
  /** Krótszych leadów nie oceniamy: kilka fraz nie daje wiarygodnego odsetka. */
  minLeadTokens: number;
  partialThreshold: number;
  strongThreshold: number;
}

export const DEFAULT_VERBATIM_OPTIONS: VerbatimOptions = {
  shingleSize: 4,
  minLeadTokens: 14,
  partialThreshold: 0.3,
  strongThreshold: 0.6,
};

/**
 * Sprawdza, ile leadu tekstu PPG jest dosłownie w komunikacie urzędu lub policji.
 * Porównujemy wyłącznie lead z kanału RSS (pełnej treści nie pobieramy), więc wynik opisuje
 * początek tekstu, nie cały artykuł.
 */
export function detectVerbatim(
  ppgItems: readonly VerbatimInput[],
  officialItems: readonly OfficialInput[],
  options: VerbatimOptions = DEFAULT_VERBATIM_OPTIONS,
): VerbatimReport {
  const officialShingles = officialItems.map((o) => ({
    official: o,
    set: shingles(`${o.item.title} ${o.item.summary}`, options.shingleSize),
  }));
  const rows: VerbatimRow[] = [];
  let checkedLeads = 0;
  let skippedShortLeads = 0;

  for (const { portalName, item } of ppgItems) {
    if (tokens(item.summary).length < options.minLeadTokens) {
      skippedShortLeads += 1;
      continue;
    }
    checkedLeads += 1;
    const leadShingles = shingles(item.summary, options.shingleSize);
    let bestScore = 0;
    let bestOfficial: OfficialInput | null = null;
    for (const { official, set } of officialShingles) {
      const score = containment(leadShingles, set);
      if (score > bestScore) {
        bestScore = score;
        bestOfficial = official;
      }
    }
    if (!bestOfficial || bestScore < options.partialThreshold) continue;
    rows.push({
      portalName,
      title: item.title,
      link: item.link,
      author: item.author,
      level: bestScore >= options.strongThreshold ? "PRZEPISANY_KOMUNIKAT" : "CZESCIOWE_PRZEJECIE",
      verbatimPct: Math.round(bestScore * 1000) / 10,
      institutionName: bestOfficial.institutionName,
      officialTitle: bestOfficial.item.title,
      officialLink: bestOfficial.item.link,
    });
  }
  return { checkedLeads, skippedShortLeads, rows: rows.sort((a, b) => b.verbatimPct - a.verbatimPct) };
}
