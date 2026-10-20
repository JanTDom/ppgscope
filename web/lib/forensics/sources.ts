/**
 * Rejestr źródeł szyby śledczej. Każdy adres został sprawdzony zapytaniem HTTP (odpowiedź 200,
 * poprawny XML z elementami <item>) w dniu VERIFIED_ON. Zgodnie z ADR-001 nie dopisujemy adresów
 * "na oko": nowy wpis wymaga najpierw takiego sprawdzenia.
 */

export const VERIFIED_ON = "2026-10-18";

export const FORENSICS_USER_AGENT = "PPGscope/1.0 (+https://ppgscope.pl)";

export interface FeedSource {
  id: string;
  name: string;
  url: string;
}

export interface PpgFeedSource extends FeedSource {
  region: string;
}

export interface CompetitorFeedSource extends FeedSource {
  region: string;
  /** Dzienniki PPG, z którymi porównujemy ten kanał (to samo miasto lub region). */
  ppgIds: readonly string[];
}

export const PPG_FEEDS: readonly PpgFeedSource[] = [
  { id: "gazetakrakowska", name: "Gazeta Krakowska", url: "https://gazetakrakowska.pl/rss", region: "Małopolskie" },
  { id: "gloswielkopolski", name: "Głos Wielkopolski", url: "https://gloswielkopolski.pl/rss", region: "Wielkopolskie" },
  { id: "gazetawroclawska", name: "Gazeta Wrocławska", url: "https://gazetawroclawska.pl/rss", region: "Dolnośląskie" },
  { id: "dziennikbaltycki", name: "Dziennik Bałtycki", url: "https://dziennikbaltycki.pl/rss", region: "Pomorskie" },
  { id: "dziennikzachodni", name: "Dziennik Zachodni", url: "https://dziennikzachodni.pl/rss", region: "Śląskie" },
];

export const COMPETITOR_FEEDS: readonly CompetitorFeedSource[] = [
  { id: "lovekrakow", name: "LoveKraków.pl", url: "https://lovekrakow.pl/rss.xml", region: "Małopolskie", ppgIds: ["gazetakrakowska"] },
  { id: "epoznan", name: "ePoznan.pl", url: "https://epoznan.pl/rss", region: "Wielkopolskie", ppgIds: ["gloswielkopolski"] },
  { id: "tuwroclaw", name: "TuWrocław.com", url: "https://tuwroclaw.com/rss", region: "Dolnośląskie", ppgIds: ["gazetawroclawska"] },
];

export const OFFICIAL_FEEDS: readonly FeedSource[] = [
  { id: "policja-malopolska", name: "Policja Małopolska", url: "https://malopolska.policja.gov.pl/dokumenty/rss/386-rss-157.rss" },
  { id: "um-wroclaw", name: "Urząd Miejski Wrocławia", url: "https://www.wroclaw.pl/dla-mieszkanca/rss/" },
];

/** Moduły z zamówienia, których nie da się uruchomić, i konkretny powód (stan z VERIFIED_ON). */
export const BLOCKED_MODULES: readonly { id: string; title: string; reason: string }[] = [
  {
    id: "dead-hero",
    title: "Martwa jedynka kontra najczęściej czytane",
    reason:
      "Wymaga pobrania HTML strony głównej dziennika. Strona główna PPG zwraca wyzwanie Cloudflare (HTTP 403, „Just a moment…”) także przy jawnym nagłówku User-Agent.",
  },
  {
    id: "paywall-leak",
    title: "Wyciek paywalla Strefa Plus",
    reason:
      "Wymaga pobrania HTML artykułów (flaga isAccessibleForFree w JSON-LD). Artykuły i mapy witryn PPG są za tym samym wyzwaniem Cloudflare.",
  },
  {
    id: "seo-links",
    title: "Nieoznaczone linki dofollow w tekstach redakcyjnych",
    reason: "Wymaga pełnego HTML artykułu. Kanały RSS zawierają tylko lead, bez linków z treści.",
  },
];
