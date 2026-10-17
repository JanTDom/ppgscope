import { NextRequest, NextResponse } from "next/server";

const TAXONOMY_DEFINITIONS = `
Dozwolone kategorie tematyczne (wybierz dokładnie jedną kategorię główną i opcjonalnie do 2 pobocznych):
- POLITYKA: Wydarzenia polityczne, wybory, rząd, parlament, partie, samorząd polityczny, relacje międzynarodowe.
- GOSPODARKA: Gospodarka, finanse, rynek pracy, podatki, inflacja, stopy procentowe, inwestycje, przedsiębiorstwa, energetyka, nieruchomości komercyjne.
- SPOLECZENSTWO: Życie społeczne, demografia, relacje, pomoc społeczna, strajki, protesty, kościół i religia, inicjatywy obywatelskie.
- SPORT: Wydarzenia sportowe, mecze, ligi, turnieje, piłka nożna, siatkówka, sylwetki sportowców.
- KULTURA_ROZRYWKA: Film, teatr, muzyka, literatura, sztuka, koncerty, festiwale, telewizja, życie gwiazd.
- PRAWO_BEZPIECZENSTWO: Wypadki, przestępczość, interwencje policji i straży pożarnej, sądownictwo, prokuratura, służby.
- ZDROWIE_STYL_ZYCIA: Ochrona zdrowia, medycyna, szpitale, leki, profilaktyka, dietetyka, uroda, psychologia.
- NAUKA_TECHNOLOGIE: Odkrycia, badania, innowacje, sztuczna inteligencja, smartfony, komputery, cyberbezpieczeństwo.
- EDUKACJA: Szkoły, przedszkola, nauczyciele, matury, egzaminy, uniwersytety, oświata.
- SRODOWISKO_ROLNICTWO: Klimat, ochrona przyrody, pogoda, kataklizmy, ekologia, rolnictwo, uprawy, plony.
- MOTORYZACJA: Samochody, motocykle, testy pojazdów, przepisy drogowe, mandaty, rynek motoryzacyjny.
- LOKALNE_REGIONALNE: Wydarzenia samorządowe, remonty dróg, inwestycje miejskie, komunikacja miejska, życie dzielnic i gmin.
- INNE/NIEOKREŚLONE: Obowiązkowa kategoria zapasowa dla artykułów, które nie pasują wyraźnie do powyższych kategorii lub gdy brak pewności.
`;

export async function POST(req: NextRequest) {
  try {
    const { title, lead, body, apiKey } = await req.json();
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

    const promptText = `Jesteś rygorystycznym silnikiem klasyfikacji tematycznej dla mediów Polska Press Grupa (PPGscope).
Twoim zadaniem jest sklasyfikować artykuł prasowy zgodnie ze ścisłą taksonomią.

${TAXONOMY_DEFINITIONS}

ZASADY:
1. Zwróć wyłącznie poprawny obiekt JSON, bez znaczników markdown i bez zbędnego tekstu.
2. Schemat odpowiedzi JSON:
{
  "primary_topic": "ID_KATEGORII",
  "secondary_topics": ["ID_KATEGORII"],
  "confidence": 0.95,
  "rationale": "Krótkie wyjaśnienie dlaczego wybrano tę kategorię"
}
3. Jeśli artykuł nie pasuje jednoznacznie lub pewność jest niska (< 0.40), ustaw "primary_topic" na "INNE/NIEOKREŚLONE".
4. "confidence" to liczba zmiennoprzecinkowa od 0.0 do 1.0.

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
      // Clean possible fences
      const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleanJson);
    }

    return NextResponse.json({
      ok: true,
      classification: {
        primary_topic: parsedResult.primary_topic || "INNE/NIEOKREŚLONE",
        secondary_topics: parsedResult.secondary_topics || [],
        confidence: Number(parsedResult.confidence) || 0.5,
        rationale: parsedResult.rationale || "",
        model_version: "gemini-3.8-flash",
        taxonomy_version: "1.0.0",
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
