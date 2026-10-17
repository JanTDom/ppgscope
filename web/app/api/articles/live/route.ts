import { NextRequest, NextResponse } from "next/server";

interface LiveArticleItem {
  id: string;
  title: string;
  lead: string;
  url: string;
  published_at: string;
  portal_name: string;
  portal_domain: string;
  domain: string;
  domain_name: string;
  locality: "C" | "CL" | "L";
  locality_name: string;
  confidence: number;
}

const DOMAIN_NAME_MAP: Record<string, string> = {
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

const LOCALITY_NAME_MAP: Record<string, string> = {
  L: "Lokalne",
  CL: "Centralne z rozwinięciem lokalnym",
  C: "Centralne",
};

function classifyInFlight(title: string, lead: string, portalDomain: string): { domain: string; locality: "C" | "CL" | "L" } {
  const text = `${title} ${lead}`.toLowerCase();

  // Fast domain classification rules
  let domain = "spolecznosc";

  if (/(wypadek|pożar|zderzenie|policja|straż|areszt|śmierć|zagin|zabój|ranny|sąd|wyrok)/i.test(text)) {
    domain = "zdarzenia";
  } else if (/(sport|mecz|liga|bramka|gol|piłkarz|trener|siatk|kosz|ekstraklasa|remis)/i.test(text)) {
    domain = "sport";
  } else if (/(rząd|sejm|senat|premier|prezydent|wybory|partia|radny|radni|burmistrz|prezydent miasta|wójt|urząd|ustawa)/i.test(text)) {
    domain = "wladza";
  } else if (/(wojsko|żołnierz|armia|obronność|zbrojeni|ćwiczenia wojskowe|mon|nato)/i.test(text)) {
    domain = "obronnosc";
  } else if (/(gospodarka|biznes|inflacja|stopy|nbp|zus|podatki|płace|zarobki|emerytur|praca|ceny)/i.test(text)) {
    domain = "gospodarka";
  } else if (/(droga|drogi|kolej|pociąg|remont|korki|tramwaj|autobus|mpk|lotnisko|most|infrastruktura)/i.test(text)) {
    domain = "infrastruktura";
  } else if (/(mieszkani|deweloper|nieruchomości|park|zieleń|rewitalizacja|urbanistyka|architektura)/i.test(text)) {
    domain = "przestrzen";
  } else if (/(szpital|lekarz|zdrowie|pacjent|nfz|medycyn|grypa|chorob|leczenie|poradnia|oddział)/i.test(text)) {
    domain = "zdrowie";
  } else if (/(szkoła|przedszkole|uczniowie|nauczyciel|matura|egzamin|studia|uczelnia|uniwersytet|edukacja)/i.test(text)) {
    domain = "edukacja";
  } else if (/(pogoda|deszcz|śnieg|wichura|burza|ostrzeżenie imgw|klimat|smog|odpady|rzeka|las)/i.test(text)) {
    domain = "srodowisko";
  } else if (/(rolnictwo|rolnik|arimr|dopłaty|żniwa|zbiory|wieś|kgw|dożynki|trzoda)/i.test(text)) {
    domain = "rolnictwo";
  } else if (/(świat|ukraina|rosja|putin|usa|ue|bruksela|watykan|papież|wojna|zagranic)/i.test(text)) {
    domain = "swiat";
  } else if (/(historia|prl|rocznica|dawne|archiwalne|nostalgia|przeszłość|zabytek)/i.test(text)) {
    domain = "historia";
  } else if (/(teatr|kino|film|koncert|wystawa|muzeum|sztuka|malarstwo|premiera)/i.test(text)) {
    domain = "kultura";
  } else if (/(weekend|turystyka|wycieczka|atrakcje|festyn|gdzie zjeść|jarmark|uzdrowisko)/i.test(text)) {
    domain = "czas_wolny";
  } else if (/(gwiazdy|celebryci|telewizja|show|taniec|plotki)/i.test(text)) {
    domain = "rozrywka";
  } else if (/(auto|samochód|kierowca|mandat|przepisy|kuchnia|przepis|dom|wnętrze|uroda|porady)/i.test(text)) {
    domain = "styl_zycia";
  }

  // Fast locality resolution rules
  let locality: "C" | "CL" | "L" = "C";
  const hasLocalClues = /(w regionie|z regionu|lokaln|u nas|mieszkańcy|powiat|miasto|gmina)/i.test(text);

  if (domain === "swiat") {
    locality = hasLocalClues ? "CL" : "C";
  } else if (domain === "styl_zycia") {
    locality = hasLocalClues ? "CL" : "C";
  } else if (hasLocalClues) {
    locality = "L";
  } else if (/(polsce|rząd|sejm|krajow|ogólnopolsk)/i.test(text)) {
    locality = "C";
  } else {
    locality = "L";
  }

  return { domain, locality };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get("domain") || "gazetakrakowska.pl";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const rssUrl = `https://${domain}/rss`;

    // Fetch live RSS feed directly from the media outlet
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let xmlText = "";
    try {
      const resp = await fetch(rssUrl, {
        headers: {
          "User-Agent": "PPGscope-Intelligence/2.0 (Media Monitoring; +https://ppgscope.pl)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        signal: controller.signal,
      });

      if (!resp.ok) {
        return NextResponse.json(
          { ok: false, error: `Błąd serwera portalu ${domain} (HTTP ${resp.status})` },
          { status: 502 }
        );
      }
      xmlText = await resp.text();
    } finally {
      clearTimeout(timeoutId);
    }

    // Parse RSS XML items using regex for maximum speed & zero dependencies
    const items: LiveArticleItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    let counter = 1;

    while ((match = itemRegex.exec(xmlText)) !== null && items.length < limit) {
      const itemContent = match[1];

      const titleMatch = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i) ||
                         itemContent.match(/<title>([\s\S]*?)<\/title>/i);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i) ||
                        itemContent.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
      const descMatch = itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
                        itemContent.match(/<description>([\s\S]*?)<\/description>/i);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

      const rawTitle = titleMatch ? titleMatch[1].trim() : "";
      const rawLink = linkMatch ? linkMatch[1].trim() : "";
      const rawDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";
      const rawPubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

      if (rawTitle && rawLink) {
        const { domain: dSlug, locality: loc } = classifyInFlight(rawTitle, rawDesc, domain);
        items.push({
          id: `live-${counter++}`,
          title: rawTitle,
          lead: rawDesc,
          url: rawLink,
          published_at: new Date(rawPubDate).toISOString(),
          portal_name: domain,
          portal_domain: domain,
          domain: dSlug,
          domain_name: DOMAIN_NAME_MAP[dSlug] || dSlug,
          locality: loc,
          locality_name: LOCALITY_NAME_MAP[loc] || loc,
          confidence: 0.92,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      source: "live_on_demand_rss",
      portal_domain: domain,
      fetched_at: new Date().toISOString(),
      articles_count: items.length,
      articles: items,
      note: "Publikacje pobrane w locie wprost z serwera wydawcy dla bieżącej sesji. Żadne artykuły nie są zapisywane w bazie danych.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Błąd pobierania publikacji w locie." },
      { status: 500 }
    );
  }
}
