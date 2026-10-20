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

export interface ForensicsModuleStatus {
  id: string;
  title: string;
  status: "AKTYWNY_STRUMIEN_PUBLICZNY" | "OGRANICZONY_BRAKIEM_HTML";
  description: string;
  sourceType: string;
}

/** Moduły zasilane publicznymi strumieniami RSS/Sitemap zamiast bezpośredniego pobierania HTML. */
export const FORENSICS_MODULES: readonly ForensicsModuleStatus[] = [
  {
    id: "dead-hero",
    title: "Rotacja czołówki i zastój publikacji",
    status: "AKTYWNY_STRUMIEN_PUBLICZNY",
    description:
      "Zasilany publicznymi strumieniami RSS dzienników PPG i konkurencji. Analizuje świeżość najnowszego materiału, medianę odstępów i wykrywa przestoje.",
    sourceType: "Kanały RSS / syndykacja na żywo",
  },
  {
    id: "paywall-leak",
    title: "Obecność i syndykacja Strefy Plus w RSS",
    status: "AKTYWNY_STRUMIEN_PUBLICZNY",
    description:
      "Analizuje otwarty strumień RSS pod kątem obecności materiałów płatnych (/ar/c1-, [PLUS]) i weryfikuje zakres ujawnianych leadów.",
    sourceType: "Publiczne strumienie RSS PPG",
  },
  {
    id: "seo-links",
    title: "Audyt linków i oznaczeń komercyjnych w strumieniu",
    status: "AKTYWNY_STRUMIEN_PUBLICZNY",
    description:
      "Weryfikuje występowanie odnośników zewnętrznych w leadach, artykułów sponsorowanych/partnerskich oraz atrybucji agencyjnej.",
    sourceType: "Zwiastuny i opisy w strumieniach RSS",
  },
];

/** Dla kompatybilności wstecznej z dotychczasowym interfejsem. */
export const BLOCKED_MODULES: readonly { id: string; title: string; reason: string; status?: string }[] =
  FORENSICS_MODULES.map((m) => ({
    id: m.id,
    title: m.title,
    reason: m.description,
    status: m.status,
  }));
