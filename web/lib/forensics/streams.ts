import type { FeedFetchResult, FeedItem } from "./feed.ts";
import type { CompetitorFeedSource, PpgFeedSource } from "./sources.ts";

export type RotationStatus = "AKTYWNA_ROTACJA" | "SPOWOLNIONA" | "ZASTYGLA_CZOLOWKA" | "BRAK_DANYCH";

export interface FeedRotationMetric {
  sourceId: string;
  sourceName: string;
  region?: string;
  itemCount: number;
  latestPublishedAt: string | null;
  ageMinutes: number | null;
  status: RotationStatus;
  medianIntervalMinutes: number | null;
}

export interface RegionalRotationComparison {
  region: string;
  ppgSourceId: string;
  ppgSourceName: string;
  ppgAgeMinutes: number | null;
  competitorSourceId: string;
  competitorSourceName: string;
  competitorAgeMinutes: number | null;
  /** Ujemne: PPG świeższe o X min; Dodatnie: Konkurent świeższy o X min; null: brak danych */
  freshnessGapMinutes: number | null;
  fasterMedium: "PPG" | "KONKURENT" | "REMIS" | "BRAK_DANYCH";
}

export interface StreamRotationReport {
  sampleSize: number;
  sources: FeedRotationMetric[];
  regionalComparisons: RegionalRotationComparison[];
  staleFeedsCount: number;
  activeFeedsCount: number;
}

export interface PaywallStreamItem {
  portalName: string;
  title: string;
  link: string;
  publishedAt: string | null;
  indicators: string[];
  leadLength: number;
}

export interface StreamPaywallReport {
  checkedCount: number;
  paywallCount: number;
  paywallSharePct: number;
  items: PaywallStreamItem[];
  methodologyNote: string;
}

export interface StreamLinkItem {
  portalName: string;
  title: string;
  link: string;
  publishedAt: string | null;
  type: "LINK_ZEWNETRZNY" | "SPONSOROWANY" | "AGENCYJNY";
  detail: string;
  targetUrl?: string;
}

export interface StreamLinksReport {
  checkedCount: number;
  externalLinksCount: number;
  sponsoredCount: number;
  agencyCount: number;
  items: StreamLinkItem[];
  methodologyNote: string;
}

export interface StreamIntelligence {
  rotation: StreamRotationReport;
  paywall: StreamPaywallReport;
  links: StreamLinksReport;
}

function calculateMedian(numbers: number[]): number | null {
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Analiza rotacji czołówki strumieni RSS (odpowiednik modułu dead-hero w oparciu o publiczne strumienie).
 * Wylicza wiek najnowszego materiału, medianę przerw między publikacjami oraz porównuje tempo z konkurentami.
 */
export function analyzeStreamRotation(
  ppgResults: readonly FeedFetchResult[],
  competitorResults: readonly FeedFetchResult[],
  ppgSources: readonly PpgFeedSource[],
  competitors: readonly CompetitorFeedSource[],
  nowMs: number = Date.now(),
): StreamRotationReport {
  const ppgSourcesMap = new Map(ppgSources.map((s) => [s.id, s]));

  const metrics: FeedRotationMetric[] = ppgResults.map((result) => {
    const ppgSource = ppgSourcesMap.get(result.sourceId);
    const validItems = result.items
      .filter((i) => i.publishedAt !== null)
      .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());

    if (validItems.length === 0) {
      return {
        sourceId: result.sourceId,
        sourceName: result.sourceName,
        region: ppgSource?.region,
        itemCount: result.items.length,
        latestPublishedAt: null,
        ageMinutes: null,
        status: "BRAK_DANYCH",
        medianIntervalMinutes: null,
      };
    }

    const latest = validItems[0];
    const latestMs = new Date(latest.publishedAt!).getTime();
    const ageMinutes = Math.max(0, Math.round((nowMs - latestMs) / 60_000));

    let status: RotationStatus = "AKTYWNA_ROTACJA";
    if (ageMinutes > 360) {
      status = "ZASTYGLA_CZOLOWKA";
    } else if (ageMinutes >= 120) {
      status = "SPOWOLNIONA";
    }

    const intervals: number[] = [];
    for (let i = 0; i < validItems.length - 1; i++) {
      const diffMinutes = Math.max(
        0,
        Math.round((new Date(validItems[i].publishedAt!).getTime() - new Date(validItems[i + 1].publishedAt!).getTime()) / 60_000),
      );
      intervals.push(diffMinutes);
    }

    return {
      sourceId: result.sourceId,
      sourceName: result.sourceName,
      region: ppgSource?.region,
      itemCount: result.items.length,
      latestPublishedAt: latest.publishedAt,
      ageMinutes,
      status,
      medianIntervalMinutes: calculateMedian(intervals),
    };
  });

  const competitorMetricsMap = new Map<string, { ageMinutes: number | null; sourceName: string }>();
  for (const compResult of competitorResults) {
    const validItems = compResult.items
      .filter((i) => i.publishedAt !== null)
      .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());
    const ageMinutes = validItems.length > 0
      ? Math.max(0, Math.round((nowMs - new Date(validItems[0].publishedAt!).getTime()) / 60_000))
      : null;
    competitorMetricsMap.set(compResult.sourceId, { ageMinutes, sourceName: compResult.sourceName });
  }

  const ppgMetricsMap = new Map(metrics.map((m) => [m.sourceId, m]));

  const regionalComparisons: RegionalRotationComparison[] = competitors.map((comp) => {
    const compData = competitorMetricsMap.get(comp.id);
    const ppgId = comp.ppgIds[0] ?? "";
    const ppgData = ppgMetricsMap.get(ppgId);

    const ppgAge = ppgData?.ageMinutes ?? null;
    const compAge = compData?.ageMinutes ?? null;

    let freshnessGapMinutes: number | null = null;
    let fasterMedium: RegionalRotationComparison["fasterMedium"] = "BRAK_DANYCH";

    if (ppgAge !== null && compAge !== null) {
      freshnessGapMinutes = compAge - ppgAge; // Ujemne = PPG świeższe (mniej minut temu)
      if (ppgAge < compAge) {
        fasterMedium = "PPG";
      } else if (compAge < ppgAge) {
        fasterMedium = "KONKURENT";
      } else {
        fasterMedium = "REMIS";
      }
    }

    return {
      region: comp.region,
      ppgSourceId: ppgId,
      ppgSourceName: ppgData?.sourceName ?? ppgId,
      ppgAgeMinutes: ppgAge,
      competitorSourceId: comp.id,
      competitorSourceName: compData?.sourceName ?? comp.name,
      competitorAgeMinutes: compAge,
      freshnessGapMinutes,
      fasterMedium,
    };
  });

  const staleFeedsCount = metrics.filter((m) => m.status === "ZASTYGLA_CZOLOWKA").length;
  const activeFeedsCount = metrics.filter((m) => m.status === "AKTYWNA_ROTACJA").length;

  return {
    sampleSize: ppgResults.reduce((acc, r) => acc + r.items.length, 0),
    sources: metrics,
    regionalComparisons,
    staleFeedsCount,
    activeFeedsCount,
  };
}

/**
 * Wykrywanie wzorców płatnych treści / Strefy Plus w publicznym strumieniu syndykacji (odpowiednik paywall-leak).
 */
export function analyzeStreamPaywall(
  ppgItems: readonly { portalName: string; item: FeedItem }[],
): StreamPaywallReport {
  const paywallItems: PaywallStreamItem[] = [];

  const PAYWALL_URL_PATTERNS = [
    /\/ar\/c1-/i,
    /\/strefa-plus\//i,
    /\/plus\//i,
    /\/premium\//i,
  ];

  const PAYWALL_TEXT_PATTERNS = [
    /(?:^|\s|\[|\()PLUS(?:\b|\]|\))/i,
    /(?:^|\s|\[|\()STREFA PLUS(?:\b|\]|\))/i,
    /\b(?:tylko w plusie|dla subskrybentów|tekst premium|dostępne w subskrypcji)\b/i,
  ];

  for (const { portalName, item } of ppgItems) {
    const indicators: string[] = [];

    for (const pattern of PAYWALL_URL_PATTERNS) {
      if (pattern.test(item.link)) {
        indicators.push(`Ścieżka URL: ${pattern.source}`);
        break;
      }
    }

    for (const pattern of PAYWALL_TEXT_PATTERNS) {
      if (pattern.test(item.title)) {
        indicators.push("Oznaczenie w tytule");
        break;
      } else if (pattern.test(item.summary)) {
        indicators.push("Oznaczenie w leadzie");
        break;
      }
    }

    if (indicators.length > 0) {
      paywallItems.push({
        portalName,
        title: item.title,
        link: item.link,
        publishedAt: item.publishedAt,
        indicators,
        leadLength: item.summary.length,
      });
    }
  }

  const checkedCount = ppgItems.length;
  const paywallCount = paywallItems.length;
  const paywallSharePct = checkedCount > 0 ? Math.round((paywallCount / checkedCount) * 100) : 0;

  return {
    checkedCount,
    paywallCount,
    paywallSharePct,
    items: paywallItems,
    methodologyNote: "Weryfikacja występowania oznaczonych artykułów Strefy Plus (/ar/c1-, [PLUS]) w otwartym strumieniu syndykacji RSS.",
  };
}

/**
 * Audyt linków zewnętrznych i oznaczeń komercyjnych w leadach strumienia RSS (odpowiednik seo-links).
 */
export function analyzeStreamLinks(
  ppgItems: readonly { portalName: string; item: FeedItem }[],
): StreamLinksReport {
  const items: StreamLinkItem[] = [];
  let externalLinksCount = 0;
  let sponsoredCount = 0;
  let agencyCount = 0;

  const SPONSORED_PATTERNS = [
    /\b(?:materiał|artykuł|tekst)\s+(?:partnera|sponsorowany|promocyjny)\b/i,
    /\b(?:płatna współpraca|reklama|we współpracy z)\b/i,
    /\b(?:artykuł zewnętrzny|partnerem publikacji jest)\b/i,
    /\b(?:autopromocja)\b/i,
  ];

  const AGENCY_PATTERNS = [
    /\b(?:PAP|IAR|Reuters|KAI|Katolicka Agencja Informacyjna)\b/i,
  ];

  for (const { portalName, item } of ppgItems) {
    const rawContent = item.rawSummary ?? item.summary;

    // 1. Sprawdzenie linków HTML lub URL-i
    const hrefMatches = Array.from(rawContent.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi));
    const urlMatches = Array.from(rawContent.matchAll(/https?:\/\/[^\s<>"')]+/gi));

    const foundUrls = new Set<string>();
    for (const match of hrefMatches) foundUrls.add(match[1]);
    for (const match of urlMatches) foundUrls.add(match[0]);

    for (const url of foundUrls) {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        // Filtrujemy serwery wewnętrzne PPG i cdn
        const isInternal = host.includes("ppstatic.pl") ||
          host.includes("polskapress.pl") ||
          host.includes("naszemiasto.pl") ||
          host.includes("gratka.pl") ||
          host.includes("telemagazyn.pl") ||
          host.includes("strefabiznesu.pl") ||
          host.includes("strefaobrony.pl") ||
          (item.link && host === new URL(item.link).hostname.toLowerCase());

        if (!isInternal) {
          externalLinksCount++;
          items.push({
            portalName,
            title: item.title,
            link: item.link,
            publishedAt: item.publishedAt,
            type: "LINK_ZEWNETRZNY",
            detail: `Odnośnik zewnętrzny w leadzie: ${host}`,
            targetUrl: url,
          });
        }
      } catch {
        // Ignoruj niepoprawny URL
      }
    }

    // 2. Sprawdzenie oznaczeń sponsorowanych
    let isSponsored = false;
    for (const pattern of SPONSORED_PATTERNS) {
      if (pattern.test(item.title) || pattern.test(item.summary) || (item.author && pattern.test(item.author))) {
        isSponsored = true;
        break;
      }
    }
    if (isSponsored) {
      sponsoredCount++;
      items.push({
        portalName,
        title: item.title,
        link: item.link,
        publishedAt: item.publishedAt,
        type: "SPONSOROWANY",
        detail: "Wykryto oznaczenie materiału partnerskiego lub reklamowego",
      });
    }

    // 3. Sprawdzenie atrybucji agencyjnej
    let isAgency = false;
    for (const pattern of AGENCY_PATTERNS) {
      if ((item.author && pattern.test(item.author)) || /\((?:PAP|IAR|Reuters|KAI)\)/i.test(item.summary)) {
        isAgency = true;
        break;
      }
    }
    if (isAgency) {
      agencyCount++;
      items.push({
        portalName,
        title: item.title,
        link: item.link,
        publishedAt: item.publishedAt,
        type: "AGENCYJNY",
        detail: `Atrybucja agencji prasowej (${item.author ?? "w tekście"})`,
      });
    }
  }

  return {
    checkedCount: ppgItems.length,
    externalLinksCount,
    sponsoredCount,
    agencyCount,
    items,
    methodologyNote: "Audyt leadów i opisów RSS pod kątem odnośników zewnętrznych (dofollow), oznaczeń materiałów sponsorowanych oraz źródeł agencyjnych.",
  };
}
