import type { FeedItem } from "./feed.ts";
import { contentKeys, overlapCoefficient, sharedCount } from "./text.ts";

export type BlindspotStatus = "POKRYTE" | "BRAK_W_PPG" | "NIEROZSTRZYGALNE";

export interface PpgIndexedItem {
  portalId: string;
  portalName: string;
  item: FeedItem;
}

export interface BlindspotMatch {
  portalName: string;
  title: string;
  link: string;
  publishedAt: string | null;
  /** Dodatnie: PPG opublikował później niż konkurent. */
  lagMinutes: number | null;
}

export interface BlindspotRow {
  title: string;
  link: string;
  publishedAt: string;
  ageMinutes: number;
  status: BlindspotStatus;
  match: BlindspotMatch | null;
  /** Dlaczego nie rozstrzygnęliśmy (tylko dla NIEROZSTRZYGALNE). */
  undecidedReason: string | null;
}

export interface BlindspotOptions {
  nowMs: number;
  maxAgeHours: number;
  /** Młodszych tekstów nie nazywamy przeoczonymi: redakcja ma jeszcze czas. */
  minAgeMinutes: number;
  minSharedKeys: number;
  minOverlap: number;
}

export const DEFAULT_BLINDSPOT_OPTIONS: Omit<BlindspotOptions, "nowMs"> = {
  maxAgeHours: 24,
  minAgeMinutes: 30,
  minSharedKeys: 3,
  minOverlap: 0.5,
};

const MS_PER_MINUTE = 60_000;

function itemText(item: FeedItem): string {
  return `${item.title} ${item.summary}`;
}

function findBestMatch(
  competitorKeys: ReadonlySet<string>,
  ppgItems: readonly PpgIndexedItem[],
  options: BlindspotOptions,
): PpgIndexedItem | null {
  let best: PpgIndexedItem | null = null;
  let bestShared = 0;
  for (const candidate of ppgItems) {
    const keys = contentKeys(itemText(candidate.item));
    const shared = sharedCount(competitorKeys, keys);
    if (shared < options.minSharedKeys || overlapCoefficient(competitorKeys, keys) < options.minOverlap) continue;
    if (shared > bestShared) {
      best = candidate;
      bestShared = shared;
    }
  }
  return best;
}

/**
 * Porównuje świeże teksty konkurenta z tym, co dzienniki PPG miały w kanale RSS.
 *
 * Kanał RSS PPG obejmuje tylko kilkanaście ostatnich tekstów, więc brak dopasowania wolno uznać za
 * przeoczenie wyłącznie wtedy, gdy tekst konkurenta jest nowszy niż najstarszy tekst w próbce PPG.
 * W przeciwnym razie wynik to NIEROZSTRZYGALNE, a nie fałszywy zarzut.
 */
export function detectBlindspots(
  competitorItems: readonly FeedItem[],
  ppgItems: readonly PpgIndexedItem[],
  options: BlindspotOptions,
): BlindspotRow[] {
  const ppgTimes = ppgItems
    .map((p) => (p.item.publishedAt ? Date.parse(p.item.publishedAt) : Number.NaN))
    .filter((t) => !Number.isNaN(t));
  const ppgWindowStartMs = ppgTimes.length > 0 ? Math.min(...ppgTimes) : Number.POSITIVE_INFINITY;
  const maxAgeMs = options.maxAgeHours * 60 * MS_PER_MINUTE;
  const rows: BlindspotRow[] = [];

  for (const item of competitorItems) {
    if (!item.publishedAt) continue;
    const publishedMs = Date.parse(item.publishedAt);
    const ageMs = options.nowMs - publishedMs;
    if (Number.isNaN(publishedMs) || ageMs < 0 || ageMs > maxAgeMs) continue;
    const base = { title: item.title, link: item.link, publishedAt: item.publishedAt, ageMinutes: Math.round(ageMs / MS_PER_MINUTE) };

    const titleKeys = contentKeys(item.title);
    if (titleKeys.size < options.minSharedKeys) {
      rows.push({ ...base, status: "NIEROZSTRZYGALNE", match: null, undecidedReason: "Nagłówek zbyt ogólny do wiarygodnego porównania" });
      continue;
    }

    const competitorKeys = contentKeys(itemText(item));
    const best = findBestMatch(competitorKeys, ppgItems, options);
    if (best) {
      const matchMs = best.item.publishedAt ? Date.parse(best.item.publishedAt) : Number.NaN;
      rows.push({
        ...base,
        status: "POKRYTE",
        undecidedReason: null,
        match: {
          portalName: best.portalName,
          title: best.item.title,
          link: best.item.link,
          publishedAt: best.item.publishedAt,
          lagMinutes: Number.isNaN(matchMs) ? null : Math.round((matchMs - publishedMs) / MS_PER_MINUTE),
        },
      });
      continue;
    }
    if (publishedMs < ppgWindowStartMs) {
      rows.push({ ...base, status: "NIEROZSTRZYGALNE", match: null, undecidedReason: "Tekst starszy niż najstarszy w próbce kanału PPG" });
    } else if (base.ageMinutes < options.minAgeMinutes) {
      rows.push({ ...base, status: "NIEROZSTRZYGALNE", match: null, undecidedReason: "Tekst zbyt świeży, redakcja ma jeszcze czas" });
    } else {
      rows.push({ ...base, status: "BRAK_W_PPG", match: null, undecidedReason: null });
    }
  }
  return rows.sort((a, b) => a.ageMinutes - b.ageMinutes);
}
