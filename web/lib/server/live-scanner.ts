export interface LiveScannedArticle {
  id: string;
  title: string;
  lead: string;
  url: string;
  canonical_url: string;
  published_at: string;
  portal_name: string;
  portal_domain: string;
  region: string;
  domain: string;
  domain_name: string;
  locality: "C" | "CL" | "L";
  locality_name: string;
  confidence: number;
  is_duplicate?: boolean;
}

export const DOMAIN_NAME_MAP: Record<string, string> = {
  wladza: "Władza i polityka",
  zdarzenia: "Bezpieczeństwo i zdarzenia",
  obronnosc: "Obronność",
  gospodarka: "Gospodarka i praca",
  infrastruktura: "Infrastruktura i transport",
  przestrzen: "Przestrzeń i mieszkanie",
  zdrowie: "Zdrowie",
  edukacja: "Edukacja i dzieci",
  srodowisko: "Środowisko i klimat",
  spolecznosc: "Społeczność i ludzie",
  kultura: "Kultura",
  historia: "Historia i pamięć",
  czas_wolny: "Czas wolny i turystyka",
  sport: "Sport",
  rozrywka: "Rozrywka i celebryci",
  styl_zycia: "Styl życia i poradnictwo",
  rolnictwo: "Wieś i rolnictwo",
  swiat: "Świat",
};

export const LOCALITY_NAME_MAP: Record<string, string> = {
  L: "Lokalne",
  CL: "Centralne z rozwinięciem lokalnym",
  C: "Centralne",
};

export const KEY_PPG_DAILIES: Array<{ domain: string; name: string; region: string }> = [
  { domain: "dziennikbaltycki.pl", name: "Dziennik Bałtycki", region: "Pomorskie" },
  { domain: "dziennikzachodni.pl", name: "Dziennik Zachodni", region: "Śląskie" },
  { domain: "gazetakrakowska.pl", name: "Gazeta Krakowska", region: "Małopolskie" },
  { domain: "gazetawroclawska.pl", name: "Gazeta Wrocławska", region: "Dolnośląskie" },
  { domain: "gloswielkopolski.pl", name: "Głos Wielkopolski", region: "Wielkopolskie" },
  { domain: "dzienniklodzki.pl", name: "Dziennik Łódzki", region: "Łódzkie" },
  { domain: "pomorska.pl", name: "Gazeta Pomorska", region: "Kujawsko-Pomorskie" },
  { domain: "i.pl", name: "Portal i.pl", region: "Ogólnopolski" },
  { domain: "nowiny24.pl", name: "Nowiny", region: "Podkarpackie" },
  { domain: "echodnia.eu", name: "Echo Dnia", region: "Świętokrzyskie" },
  { domain: "dziennikpolski24.pl", name: "Dziennik Polski", region: "Małopolskie" },
  { domain: "kurierlubelski.pl", name: "Kurier Lubelski", region: "Lubelskie" },
  { domain: "poranny.pl", name: "Kurier Poranny", region: "Podlaskie" },
  { domain: "nto.pl", name: "Nowa Trybuna Opolska", region: "Opolskie" },
  { domain: "gazetalubuska.pl", name: "Gazeta Lubuska", region: "Lubuskie" },
  { domain: "gp24.pl", name: "Głos Pomorza", region: "Pomorskie" },
  { domain: "gk24.pl", name: "Głos Koszaliński", region: "Zachodniopomorskie" },
  { domain: "gs24.pl", name: "Głos Szczeciński", region: "Zachodniopomorskie" },
  { domain: "expressbydgoski.pl", name: "Express Bydgoski", region: "Kujawsko-Pomorskie" },
  { domain: "expressilustrowany.pl", name: "Express Ilustrowany", region: "Łódzkie" },
  { domain: "nowosci.com.pl", name: "Nowości Toruńskie", region: "Kujawsko-Pomorskie" },
  { domain: "to.com.pl", name: "Tygodnik Ostrołęcki", region: "Mazowieckie" },
  { domain: "wspolczesna.pl", name: "Gazeta Współczesna", region: "Podlaskie" },
];

export function classifyInFlight(title: string, lead: string): { domain: string; locality: "C" | "CL" | "L" } {
  const text = `${title} ${lead}`.toLowerCase();

  let domain = "spolecznosc";
  if (/(wypadek|pożar|zderzenie|policja|straż|areszt|śmierć|zagin|zabój|ranny|sąd|wyrok|złodziej|napad|włamanie|drogówk)/i.test(text)) {
    domain = "zdarzenia";
  } else if (/(sport|mecz|liga|bramka|gol|piłkarz|trener|siatk|kosz|ekstraklasa|remis|derby|tabela|stadion)/i.test(text)) {
    domain = "sport";
  } else if (/(rząd|sejm|senat|premier|prezydent|wybory|partia|radny|radni|burmistrz|prezydent miasta|wójt|urząd|ustawa|koalicj|opozycj|tusk|kaczyńsk|referendum)/i.test(text)) {
    domain = "wladza";
  } else if (/(wojsko|żołnierz|armia|obronność|zbrojeni|ćwiczenia wojskowe|\bmon\b|\bnato\b|tarcza wschód|\bgranic[aeyęąó]\b|\bgranicach\b|\bgranicy\b)/i.test(text)) {
    domain = "obronnosc";
  } else if (/(gospodarka|biznes|inflacja|stopy|nbp|zus|podatki|płace|zarobki|emerytur|praca|ceny|inwestycj|firme|spółk|budżet)/i.test(text)) {
    domain = "gospodarka";
  } else if (/(droga|drogi|kolej|pociąg|remont|korki|tramwaj|autobus|mpk|lotnisko|most|infrastruktura|pkp|gddkia)/i.test(text)) {
    domain = "infrastruktura";
  } else if (/(mieszkani|deweloper|nieruchomości|park|zieleń|rewitalizacja|urbanistyka|architektura|działk|osiedl)/i.test(text)) {
    domain = "przestrzen";
  } else if (/(szpital|lekarz|zdrowie|pacjent|nfz|medycyn|grypa|chorob|leczenie|poradnia|oddział|apteka|leki)/i.test(text)) {
    domain = "zdrowie";
  } else if (/(szkoła|przedszkole|uczniowie|nauczyciel|matura|egzamin|studia|uczelnia|uniwersytet|edukacja|dyrektor szkoły)/i.test(text)) {
    domain = "edukacja";
  } else if (/(pogoda|deszcz|śnieg|wichura|burza|ostrzeżenie imgw|klimat|smog|odpady|rzeka|las|powódź|ochrona środowiska)/i.test(text)) {
    domain = "srodowisko";
  } else if (/(rolnictwo|rolnik|arimr|dopłaty|żniwa|zbiory|wieś|kgw|dożynki|trzoda|krowy|uprawy|zboże)/i.test(text)) {
    domain = "rolnictwo";
  } else if (/(świat|ukraina|rosja|putin|usa|ue|bruksela|watykan|papież|wojna|zagranic|trump|biden|chiny|izrael)/i.test(text)) {
    domain = "swiat";
  } else if (/(historia|prl|rocznica|dawne|archiwalne|nostalgia|przeszłość|zabytek|muzeum pamięci|powstani)/i.test(text)) {
    domain = "historia";
  } else if (/(teatr|kino|film|koncert|wystawa|muzeum|sztuka|malarstwo|premiera|aktor|festiwal)/i.test(text)) {
    domain = "kultura";
  } else if (/(weekend|turystyka|wycieczka|atrakcje|festyn|gdzie zjeść|jarmark|uzdrowisko|spacer|szlak|góry)/i.test(text)) {
    domain = "czas_wolny";
  } else if (/(gwiazdy|celebryci|telewizja|show|taniec|plotki|eurowizja|pudelek|znani)/i.test(text)) {
    domain = "rozrywka";
  } else if (/(auto|samochód|kierowca|mandat|przepisy|kuchnia|przepis|dom|wnętrze|uroda|porady|horoskop|jak zrobić)/i.test(text)) {
    domain = "styl_zycia";
  }

  let locality: "C" | "CL" | "L" = "C";
  const hasLocalClues = /(w regionie|z regionu|lokaln|u nas|mieszkańcy|powiat|miasto|gmina|kraków|gdańsk|wrocław|poznań|łódź|katowice|lublin|rzeszów|szczecin|bydgoszcz|toruń|kielce|opole|zielona góra|białystok|częstochow)/i.test(text);

  if (domain === "swiat" || domain === "styl_zycia") {
    locality = hasLocalClues ? "CL" : "C";
  } else if (hasLocalClues) {
    locality = "L";
  } else if (/(polsce|rząd|sejm|krajow|ogólnopolsk|trybunał|minister|nbp|rpp)/i.test(text)) {
    locality = "C";
  } else {
    locality = "L";
  }

  return { domain, locality };
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
};

export function parseGoogleNewsSitemap(xml: string, domain: string, region: string): LiveScannedArticle[] {
  const articles: LiveScannedArticle[] = [];
  const urlBlockRegex = /<url>([\s\S]*?)<\/url>/gi;
  let match;
  let counter = 1;

  while ((match = urlBlockRegex.exec(xml)) !== null) {
    const block = match[1];
    const locMatch = block.match(/<loc>([\s\S]*?)<\/loc>/i);
    const titleMatch = block.match(/<news:title>([\s\S]*?)<\/news:title>/i) || block.match(/<title>([\s\S]*?)<\/title>/i);
    const dateMatch = block.match(/<news:publication_date>([\s\S]*?)<\/news:publication_date>/i) || block.match(/<lastmod>([\s\S]*?)<\/lastmod>/i);

    const rawUrl = locMatch ? locMatch[1].trim() : "";
    const rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() : "";
    const rawDate = dateMatch ? dateMatch[1].trim() : new Date().toISOString();

    if (rawUrl && rawTitle) {
      const { domain: dSlug, locality: loc } = classifyInFlight(rawTitle, "");
      articles.push({
        id: `sitemap-${domain}-${counter++}`,
        title: rawTitle,
        lead: rawTitle,
        url: rawUrl,
        canonical_url: rawUrl,
        published_at: new Date(rawDate).toISOString(),
        portal_name: domain,
        portal_domain: domain,
        region,
        domain: dSlug,
        domain_name: DOMAIN_NAME_MAP[dSlug] || dSlug,
        locality: loc,
        locality_name: LOCALITY_NAME_MAP[loc] || loc,
        confidence: 0.94,
      });
    }
  }

  return articles;
}

export function parseRssFeed(xml: string, domain: string, region: string): LiveScannedArticle[] {
  const articles: LiveScannedArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  let counter = 1;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) || block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i) || block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
    const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) || block.match(/<description>([\s\S]*?)<\/description>/i);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const rawTitle = titleMatch ? titleMatch[1].trim() : "";
    const rawLink = linkMatch ? linkMatch[1].trim() : "";
    const rawDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    const rawDate = dateMatch ? dateMatch[1].trim() : new Date().toISOString();

    if (rawTitle && rawLink) {
      const { domain: dSlug, locality: loc } = classifyInFlight(rawTitle, rawDesc);
      articles.push({
        id: `rss-${domain}-${counter++}`,
        title: rawTitle,
        lead: rawDesc || rawTitle,
        url: rawLink,
        canonical_url: rawLink,
        published_at: new Date(rawDate).toISOString(),
        portal_name: domain,
        portal_domain: domain,
        region,
        domain: dSlug,
        domain_name: DOMAIN_NAME_MAP[dSlug] || dSlug,
        locality: loc,
        locality_name: LOCALITY_NAME_MAP[loc] || loc,
        confidence: 0.92,
      });
    }
  }

  return articles;
}

export async function fetchLivePortalArticles(
  domain: string,
  region = "Polska",
  timeoutMs = 4000
): Promise<LiveScannedArticle[]> {
  const sitemapUrl = `https://${domain}/google_news/`;
  const rssUrl = `https://${domain}/rss`;
  const gNewsUrl = `https://news.google.com/rss/search?q=site:${domain}&hl=pl&gl=PL&ceid=PL:pl`;

  // 1. Try Google News Sitemap first (richest 48h view, up to 200 real articles)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(sitemapUrl, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (resp.ok) {
      const text = await resp.text();
      if (text.includes("<url>")) {
        const parsed = parseGoogleNewsSitemap(text, domain, region);
        if (parsed.length > 0) return parsed;
      }
    }
  } catch {
    // Fall through to RSS
  }

  // 2. Try direct RSS feed
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(rssUrl, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (resp.ok) {
      const text = await resp.text();
      if (text.includes("<item>")) {
        const parsed = parseRssFeed(text, domain, region);
        if (parsed.length > 0) return parsed;
      }
    }
  } catch {
    // Fall through to Google News RSS
  }

  // 3. Fallback to Google News RSS index
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(gNewsUrl, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (resp.ok) {
      const text = await resp.text();
      if (text.includes("<item>")) {
        return parseRssFeed(text, domain, region);
      }
    }
  } catch {
    // Return empty on complete failure
  }

  return [];
}

// In-Memory Short-Lived Cache (60s) to prevent hammering publisher servers
interface CacheEntry {
  timestamp: number;
  articles: LiveScannedArticle[];
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

export async function scanLiveArticles(targetDomain = "ALL"): Promise<{
  ok: boolean;
  scanned_at: string;
  source: string;
  target: string;
  total_articles: number;
  articles_24h_count: number;
  articles: LiveScannedArticle[];
}> {
  const cacheKey = targetDomain.toLowerCase();
  const cached = memoryCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    const a24h = cached.articles.filter((a) => now - new Date(a.published_at).getTime() <= 24 * 3600 * 1000).length;
    return {
      ok: true,
      scanned_at: new Date(cached.timestamp).toISOString(),
      source: "memory_stream_cache_60s",
      target: targetDomain,
      total_articles: cached.articles.length,
      articles_24h_count: a24h,
      articles: cached.articles,
    };
  }

  let rawArticles: LiveScannedArticle[] = [];

  if (targetDomain !== "ALL") {
    const targetMeta = KEY_PPG_DAILIES.find((d) => d.domain === targetDomain);
    const region = targetMeta?.region || "Polska";
    rawArticles = await fetchLivePortalArticles(targetDomain, region);
  } else {
    // Scan representative sample of top PPG regional dailies + i.pl concurrently
    const selectedDailies = KEY_PPG_DAILIES.slice(0, 14);
    const results = await Promise.allSettled(
      selectedDailies.map((d) => fetchLivePortalArticles(d.domain, d.region, 3500))
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.length > 0) {
        rawArticles.push(...r.value);
      }
    }
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const deduplicated: LiveScannedArticle[] = [];
  for (const art of rawArticles) {
    if (!seenUrls.has(art.url)) {
      seenUrls.add(art.url);
      deduplicated.push(art);
    }
  }

  // Sort descending by publication date
  deduplicated.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  memoryCache.set(cacheKey, { timestamp: now, articles: deduplicated });

  const articles24h = deduplicated.filter(
    (a) => now - new Date(a.published_at).getTime() <= 24 * 3600 * 1000
  ).length;

  return {
    ok: true,
    scanned_at: new Date(now).toISOString(),
    source: "live_network_probe_no_db",
    target: targetDomain,
    total_articles: deduplicated.length,
    articles_24h_count: articles24h,
    articles: deduplicated,
  };
}
