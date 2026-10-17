import { NextRequest, NextResponse } from "next/server";

const TAXONOMY_V2_DEFINITIONS = `
Dozwolone dziedziny tematyczne (wybierz dokładnie jedną domenę główną i opcjonalnie maksymalnie jedną poboczną domain_secondary):
01 wladza – Władza i polityka – samorząd, budżety gmin, rząd, Sejm, partie, wybory, urzędy, ustrój i sądy jako ustrój.
02 zdarzenia – Bezpieczeństwo i zdarzenia – wypadki, pożary, katastrofy, przestępczość, policja, zaginięcia, wyroki karne, służby ratunkowe.
03 obronnosc – Obronność – wojsko, ćwiczenia, szkolenia cywilów, przemysł zbrojeniowy, obrona cywilna.
04 gospodarka – Gospodarka i praca – firmy, wyniki, rynek pracy, płace, podatki, kredyty, emerytury, energetyka, górnictwo, przemysł, handel, makroekonomia.
05 infrastruktura – Infrastruktura i transport – drogi, mosty, kolej, komunikacja miejska, lotniska, korki, parkowanie, sieci wodne i ciepłownicze.
06 przestrzen – Przestrzeń i mieszkanie – urbanistyka, parki, zieleń miejska, rewitalizacja, mieszkania komunalne, nieruchomości, zabytki jako remont lub spór.
07 zdrowie – Zdrowie – szpitale, finansowanie i płace w ochronie zdrowia, dostęp do leczenia, profilaktyka, porady medyczne.
08 edukacja – Edukacja i dzieci – szkoły, przedszkola, bezpieczeństwo w szkołach, nauczyciele, egzaminy, uczelnie, wychowanie, dzieci w sieci.
09 srodowisko – Środowisko i klimat – susza, woda, powodzie, lasy, rezerwaty, smog, odpady, pogoda, przyroda, zwierzęta.
10 spolecznosc – Społeczność i ludzie – lokalni bohaterowie, seniorzy, jubilaci, parafie, NGO, zbiórki, nekrologi, problemy socjalne.
11 kultura – Kultura – teatr, opera, koncerty, literatura, film, sztuka, murale, muzea.
12 historia – Historia i pamięć – PRL, nostalgia, historia miejscowości, archiwalne zdjęcia, rocznice.
13 czas_wolny – Czas wolny i turystyka – atrakcje, uzdrowiska, wycieczki, wydarzenia weekendowe, festyny, jarmarki, gastronomia, zabytki jako atrakcja.
14 sport – Sport – sport zawodowy, amatorski i młodzieżowy, kibice, obiekty sportowe.
15 rozrywka – Rozrywka i celebryci – telewizja, gwiazdy, plotki. (Tylko C i L).
16 styl_zycia – Styl życia i poradnictwo – dom i wnętrze, moto, technologie, gry, zakupy, okazje, kuchnia, uroda. (Tylko C i CL).
17 rolnictwo – Wieś i rolnictwo – produkcja rolna, ceny skupu, dopłaty, konkursy agro, KGW, życie wsi.
18 swiat – Świat – polityka międzynarodowa, Ukraina i Rosja, USA, UE, Watykan. (Tylko C i CL).

Warianty lokalności:
- L: podmiotem w tytule lub leadzie jest miejscowość, osoba albo instytucja z obszaru danego tytułu prasowego, a sprawa ma źródło lokalne.
- CL: sprawa krajowa lub światowa (ustawa, decyzja rządu, trend, dane ogólnopolskie) pokazana na przykładzie, danych albo ludziach z obszaru tytułu.
- C: w tekście nie ma lokalnego podmiotu z obszaru tytułu.
Jeśli sprawa dotyczy innego regionu Polski niż obszar tytułu (np. Śląsk w Gazecie Pomorskiej): ustaw locality="C", other_region=true.

Reguły rozstrzygania:
1. O dziedzinie decyduje instytucja lub system, którego dotyczy sprawa, a nie miejsce akcji. "Szpital nie wypłaca pensji" to domain="zdrowie", domain_secondary="gospodarka".
2. Spór polityczny o inwestycję to "wladza". Sama inwestycja to "infrastruktura" albo "przestrzen".
3. Zdarzenie losowe zawsze trafia do "zdarzenia", niezależnie od miejsca: stadion, szkoła, las, hurtownia.
4. Zabytek jako atrakcja to "czas_wolny", jako przeszłość to "historia", jako remont lub spór to "przestrzen".
5. Format nie jest dziedziną. Quiz, galeria i ranking dostają dziedzinę według treści.
`;

export async function POST(req: NextRequest) {
  try {
    const { title, lead, body, outlet, apiKey } = await req.json();
    const effectiveKey =
      apiKey ||
      process.env.PPGSCOPE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY;

    if (!title && !body) {
      return NextResponse.json(
        { ok: false, error: "Brak treści artykułu do klasyfikacji." },
        { status: 400 }
      );
    }

    const promptText = `Jesteś rygorystycznym silnikiem klasyfikacji dziedzinowej i lokalności dla mediów Polska Press Grupa (PPGscope).
Twoim zadaniem jest sklasyfikować artykuł prasowy zgodnie z poniższą taksonomią.

${TAXONOMY_V2_DEFINITIONS}

Tytuł prasowy publikujący artykuł: ${outlet || "Portal regionalny PPG"}

ZASADY ODPOWIEDZI:
1. Zwróć wyłącznie poprawny obiekt JSON o schemacie:
{
  "domain": "<slug_dziedziny>",
  "domain_secondary": "<slug_dziedziny_lub_null>",
  "locality": "C|L|CL",
  "other_region": false,
  "confidence": 0.95,
  "rationale": "Uzasadnienie klasyfikacji"
}
2. Jeśli confidence < 0.60, nie zgaduj.
3. domain_secondary to maksymalnie jedna dziedzina poboczna lub null.

TREŚĆ DO SKLASYFIKOWANIA:
Tytuł: ${title || ""}
Lead: ${lead || ""}
Fragment treści: ${(body || "").substring(0, 1500)}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${effectiveKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { ok: false, error: `Błąd Gemini API (${response.status}): ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch {
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJson);
    }

    const conf = Number(parsedResult.confidence) || 0.5;
    const needsReview = conf < 0.60;

    // Legacy fallback mapping
    const LEGACY_MAP: Record<string, string> = {
      wladza: "POLITYKA",
      zdarzenia: "PRAWO_BEZPIECZENSTWO",
      obronnosc: "POLITYKA",
      gospodarka: "GOSPODARKA",
      infrastruktura: "LOKALNE_REGIONALNE",
      przestrzen: "LOKALNE_REGIONALNE",
      zdrowie: "ZDROWIE_STYL_ZYCIA",
      edukacja: "EDUKACJA",
      srodowisko: "SRODOWISKO_ROLNICTWO",
      spolecznosc: "SPOLECZENSTWO",
      kultura: "KULTURA_ROZRYWKA",
      historia: "KULTURA_ROZRYWKA",
      czas_wolny: "KULTURA_ROZRYWKA",
      sport: "SPORT",
      rozrywka: "KULTURA_ROZRYWKA",
      styl_zycia: "MOTORYZACJA",
      rolnictwo: "SRODOWISKO_ROLNICTWO",
      swiat: "POLITYKA",
    };

    return NextResponse.json({
      ok: true,
      classification: {
        domain: parsedResult.domain || "spolecznosc",
        domain_secondary: parsedResult.domain_secondary || null,
        locality: parsedResult.locality || "C",
        other_region: Boolean(parsedResult.other_region),
        needs_review: needsReview,
        confidence: conf,
        rationale: parsedResult.rationale || "",
        // Backward-compatibility deprecated fields
        primary_topic: LEGACY_MAP[parsedResult.domain] || "INNE/NIEOKREŚLONE",
        secondary_topics: parsedResult.domain_secondary ? [LEGACY_MAP[parsedResult.domain_secondary] || "INNE/NIEOKREŚLONE"] : [],
        model_version: "gemini-3.8-flash",
        taxonomy_version: "2.0.0",
        classified_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Wystąpił błąd klasyfikacji" },
      { status: 500 }
    );
  }
}
