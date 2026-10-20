// =========================================================================
// PPGscope Political Sentiment Suite (Standard KRRiT / Medioznawczy)
// Covers: KO / PO, PiS, PSL, Polska 2050, Lewica, Konfederacja, Karol Nawrocki, Rozwój Plus
// Cross-Domain Monitoring: Władza, Gospodarka, Infrastruktura, Rolnictwo, Zdrowie, Edukacja, Obronność
// =========================================================================

export type PoliticalActorId =
  | "ko"
  | "pis"
  | "psl"
  | "polska2050"
  | "lewica"
  | "konfederacja"
  | "nawrocki"
  | "rozwoj_plus";

export interface PoliticianSentimentItem {
  name: string;
  role: string;
  mentions: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
}

export interface SamplePoliticalArticle {
  id: string;
  actor_id: PoliticalActorId;
  title: string;
  lead: string;
  portal_name: string;
  portal_domain: string;
  published_at: string;
  sentiment: "positive" | "neutral" | "negative";
  sentiment_ko?: "positive" | "neutral" | "negative";
  sentiment_label: string;
  politicians: string[];
  sentiment_rationale: string;
  url: string;
  domain?: string;
  domain_label?: string;
}

export interface PoliticalSentimentData {
  actor_id: PoliticalActorId;
  actor_name: string;
  scope: string;
  domain_scope?: string;
  total_political_articles: number;
  mentions_count: number;
  mentions_pct: number;
  // KO-specific aliases for backward compatibility:
  ko_mentions_count?: number;
  ko_mentions_pct?: number;
  breakdown: {
    positive: { count: number; pct: number };
    neutral: { count: number; pct: number };
    negative: { count: number; pct: number };
  };
  net_sentiment_score: number;
  top_politicians: PoliticianSentimentItem[];
  sample_articles?: SamplePoliticalArticle[];
}

// Backward-compatible alias
export type KOSentimentData = PoliticalSentimentData;
export type SampleKOArticle = SamplePoliticalArticle;

export interface EntityPattern {
  name: string;
  pattern: RegExp;
  rawPattern?: RegExp; // Case-sensitive or exact pattern for uppercase acronyms (e.g. PO, KO)
}

export interface PoliticalActorConfig {
  id: PoliticalActorId;
  name: string;
  shortName: string;
  badge: string;
  themeColor: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  description: string;
  entitiesMap: EntityPattern[];
  defaultShare: number; // baseline share of political articles
  basePosRatio: number;
  baseNegRatio: number;
  topPoliticiansTemplate: {
    name: string;
    role: string;
    share: number;
    baseP: number;
    baseN: number;
  }[];
  curatedSampleArticles: Omit<SamplePoliticalArticle, "actor_id">[];
}

export const DOMAIN_SCOPE_OPTIONS = [
  { id: "all_political", label: "Wszystkie dziedziny z wątkiem politycznym (Cross-domain)" },
  { id: "wladza", label: "01 Władza i polityka (Sejm, rząd, samorząd)" },
  { id: "gospodarka", label: "04 Gospodarka i praca (Podatki, budżet, KPO, energetyka)" },
  { id: "infrastruktura", label: "05 Infrastruktura i transport (CPK, kolej, drogi, porty)" },
  { id: "rolnictwo", label: "17 Wieś i rolnictwo (Zielony Ład, dopłaty, protesty)" },
  { id: "zdrowie", label: "07 Zdrowie (Szpitale, NFZ, porodówki)" },
  { id: "edukacja", label: "08 Edukacja i dzieci (Szkoły, lektury, pensje)" },
  { id: "obronnosc", label: "03 Obronność (Tarcza Wschód, wojsko, zbrojenia)" },
];

export const POLITICAL_ACTORS: Record<PoliticalActorId, PoliticalActorConfig> = {
  ko: {
    id: "ko",
    name: "Koalicja Obywatelska / Platforma Obywatelska",
    shortName: "KO / PO",
    badge: "KO / PO",
    themeColor: "teal",
    badgeBg: "bg-teal-500/15",
    badgeText: "text-teal-300",
    borderClass: "border-teal-500/30",
    description: "Publikacje z obecnością Koalicji Obywatelskiej, Platformy Obywatelskiej oraz ministrów konstytucyjnych z ramienia KO.",
    entitiesMap: [
      { name: "Donald Tusk", pattern: /\b(donald[a-z]*\s+)?tusk[a-z]*/i },
      { name: "Rafał Trzaskowski", pattern: /\b(rafa[łl][a-z]*\s+)?trzaskowsk[a-z]*/i },
      { name: "Radosław Sikorski", pattern: /\b(rados[łl]aw[a-z]*\s+)?sikorsk[a-z]*/i },
      { name: "Adam Bodnar", pattern: /\b(adam[a-z]*\s+)?bodnar[a-z]*/i },
      { name: "Barbara Nowacka", pattern: /\b(barbar[a-z]*\s+)?nowack[a-z]*/i },
      { name: "Izabela Leszczyna", pattern: /\b(izabel[a-z]*\s+)?leszczyn[a-z]*/i },
      {
        name: "Koalicja Obywatelska",
        pattern: /\bkoalicj[a-z]*\s+obywatelsk[a-z]*|\b(parti[a-z]*|klub[a-z]*|koalicj[a-z]*|pos[łl][a-z]*|senator[a-z]*|radn[a-z]*|lider[a-z]*|dzia[łl]acz[a-z]*|polityk[a-z]*)\s+ko\b/i,
        rawPattern: /\bKO\b/,
      },
      {
        name: "Platforma Obywatelska",
        pattern: /\bplatform[a-z]*\s+obywatelsk[a-z]*|\b(parti[a-z]*|klub[a-z]*|pos[łl][a-z]*|senator[a-z]*|radn[a-z]*|lider[a-z]*|dzia[łl]acz[a-z]*|polityk[a-z]*|opozycj[a-z]*)\s+po\b/i,
        rawPattern: /\bPO\b/,
      },
      { name: "Rząd Tuska", pattern: /\brz[aą]d[a-z]*\s+tuska|\bpremier\s+tusk/i },
    ],
    defaultShare: 0.412,
    basePosRatio: 0.186,
    baseNegRatio: 0.274,
    topPoliticiansTemplate: [
      { name: "Donald Tusk", role: "Prezes Rady Ministrów / Przewodniczący PO", share: 0.431, baseP: 15.8, baseN: 32.8 },
      { name: "Rafał Trzaskowski", role: "Wiceprzewodniczący PO / Prezydent Warszawy", share: 0.196, baseP: 24.5, baseN: 19.4 },
      { name: "Radosław Sikorski", role: "Minister Spraw Zagranicznych", share: 0.120, baseP: 22.9, baseN: 19.3 },
      { name: "Adam Bodnar", role: "Minister Sprawiedliwości", share: 0.105, baseP: 15.2, baseN: 35.5 },
      { name: "Barbara Nowacka", role: "Minister Edukacji", share: 0.086, baseP: 17.8, baseN: 29.2 },
      { name: "Izabela Leszczyna", role: "Minister Zdrowia", share: 0.062, baseP: 12.6, baseN: 36.4 },
    ],
    curatedSampleArticles: [
      {
        id: "ko_art_1",
        title: "Tusk w Gdańsku: Dodatkowe miliardy na obwodnicę i ochronę wybrzeża",
        lead: "Rząd zatwierdził harmonogram strategicznych inwestycji dla Pomorza. Premier zadeklarował pełne wsparcie finansowe z funduszy europejskich.",
        portal_name: "Dziennik Bałtycki",
        portal_domain: "dziennikbaltycki.pl",
        published_at: "2024-04-12T10:15:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Donald Tusk", "Koalicja Obywatelska"],
        sentiment_rationale: "Eksponowanie sukcesu inwestycyjnego, gwarancji funduszy unijnych i korzyści dla mieszkańców regionu bez krytyki w narracji autorskiej.",
        url: "https://dziennikbaltycki.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "ko_art_2",
        title: "Wakacje składkowe dla mikroprzedsiębiorców wchodzą w życie. 'Spełniamy kluczową obietnicę wyborczą'",
        lead: "Od początku miesiąca drobni przedsiębiorcy mogą składać wnioski o zwolnienie ze składek ZUS za jeden miesiąc w roku. Przedstawiciele Koalicji Obywatelskiej wskazują na ulgę dla tysięcy firm.",
        portal_name: "Dziennik Bałtycki",
        portal_domain: "dziennikbaltycki.pl",
        published_at: "2024-11-01T08:00:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Koalicja Obywatelska", "Donald Tusk"],
        sentiment_rationale: "Pozytywne kadrowanie realizacji obietnicy programowej rządu z naciskiem na korzyści dla przedsiębiorców.",
        url: "https://dziennikbaltycki.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
      {
        id: "ko_art_3",
        title: "Konferencja prasowa Bodnara w Krakowie ws. reformy sądownictwa regionalnego",
        lead: "Minister Sprawiedliwości przedstawił sędziom z Małopolski projekt nowelizacji ustawy o sądach powszechnych. Głos zabrali także przedstawiciele palestry.",
        portal_name: "Gazeta Krakowska",
        portal_domain: "gazetakrakowska.pl",
        published_at: "2024-05-18T14:30:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Adam Bodnar"],
        sentiment_rationale: "Rzetelna, sprawozdawcza relacja z oficjalnego spotkania bez wartościujących komentarzy odautorskich i z przedstawieniem racji obu stron.",
        url: "https://gazetakrakowska.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "ko_art_4",
        title: "Barbara Nowacka zapowiada zmiany w kanonie lektur i odciążenie uczniów od nowego roku",
        lead: "Ministerstwo Edukacji Narodowej opublikowało zaktualizowaną listę lektur dla szkół podstawowych i ponadpodstawowych. Zredukowano liczbę pozycji obowiązkowych.",
        portal_name: "Kurier Lubelski",
        portal_domain: "kurierlubelski.pl",
        published_at: "2024-05-14T09:10:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Barbara Nowacka"],
        sentiment_rationale: "Suchy komunikat o decyzjach resortu edukacji, prezentacja faktów i zestawień tabelarycznych zmian programowych.",
        url: "https://kurierlubelski.pl",
        domain: "edukacja",
        domain_label: "08 Edukacja i dzieci",
      },
      {
        id: "ko_art_5",
        title: "Awantura o finansowanie szpitali powiatowych. Samorządowcy zarzucają minister Leszczynie brak dialogu",
        lead: "Brak porozumienia w sprawie tabeli płac i finansowania oddziałów wywołał falę oburzenia wśród personelu medycznego. Opozycja żąda dymisji szefowej resortu.",
        portal_name: "Echo Dnia",
        portal_domain: "echodnia.eu",
        published_at: "2024-08-22T13:50:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Izabela Leszczyna"],
        sentiment_rationale: "Wyeksponowanie pretensji środowisk lokalnych, zarzutów braku dialogu i żądań dymisji członkini rządu KO.",
        url: "https://echodnia.eu",
        domain: "zdrowie",
        domain_label: "07 Zdrowie",
      },
      {
        id: "ko_art_6",
        title: "Czarne chmury nad kwotą wolną 60 tys. zł. Przedsiębiorcy rozczarowani postawą rządu",
        lead: "Eksperci podatkowi nie mają złudzeń: flagowy postulat Koalicji Obywatelskiej ze '100 konkretów' nie wejdzie w życie w zapowiadanym terminie. Wypowiedzi polityków PO wywołały falę krytyki.",
        portal_name: "Dziennik Polski",
        portal_domain: "dziennikpolski24.pl",
        published_at: "2024-02-16T11:20:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Koalicja Obywatelska", "Platforma Obywatelska"],
        sentiment_rationale: "Pejoratywna metafora w tytule ('Czarne chmury'), wyeksponowanie niespełnienia obietnicy wyborczej i rozczarowania podatników.",
        url: "https://dziennikpolski24.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
    ],
  },

  pis: {
    id: "pis",
    name: "Prawo i Sprawiedliwość",
    shortName: "PiS",
    badge: "PiS",
    themeColor: "blue",
    badgeBg: "bg-blue-500/15",
    badgeText: "text-blue-300",
    borderClass: "border-blue-500/30",
    description: "Publikacje dotyczące partii Prawo i Sprawiedliwość, klubu parlamentarnego PiS, kierownictwa partii oraz byłych ministrów.",
    entitiesMap: [
      { name: "Jarosław Kaczyński", pattern: /\b(jaros[łl]aw[a-z]*\s+)?kaczy[nń]sk[a-z]*/i },
      { name: "Mateusz Morawiecki", pattern: /\b(mateusz[a-z]*\s+)?morawieck[a-z]*/i },
      { name: "Mariusz Błaszczak", pattern: /\b(mariusz[a-z]*\s+)?b[łl]aszczak[a-z]*/i },
      { name: "Przemysław Czarnek", pattern: /\b(przemys[łl]aw[a-z]*\s+)?czarnek[a-z]*/i },
      { name: "Jacek Sasin", pattern: /\b(jacek[a-z]*\s+)?sasin[a-z]*/i },
      { name: "Elżbieta Witek", pattern: /\b(el[żz]biet[a-z]*\s+)?witek[a-z]*/i },
      { name: "Prawo i Sprawiedliwość", pattern: /\bpraw[a-z]*\s+i\s+sprawiedliwo[sś][cć]|\bpis\b/i },
      { name: "Zjednoczona Prawica", pattern: /\bzjednoczon[a-z]*\s+prawic[a-z]*/i },
      { name: "Klub PiS", pattern: /\bklub[a-z]*\s+pis\b|\bopozycj[a-z]*\s+pis\b/i },
    ],
    defaultShare: 0.364,
    basePosRatio: 0.162,
    baseNegRatio: 0.342,
    topPoliticiansTemplate: [
      { name: "Jarosław Kaczyński", role: "Prezes PiS", share: 0.380, baseP: 14.1, baseN: 38.6 },
      { name: "Mateusz Morawiecki", role: "Wiceprezes PiS / b. Premier", share: 0.245, baseP: 18.2, baseN: 31.4 },
      { name: "Mariusz Błaszczak", role: "Szef Klubu PiS / b. szef MON", share: 0.142, baseP: 16.5, baseN: 33.1 },
      { name: "Przemysław Czarnek", role: "Poseł PiS / b. minister edukacji", share: 0.118, baseP: 13.9, baseN: 39.5 },
      { name: "Jacek Sasin", role: "Poseł PiS / b. minister aktywów", share: 0.065, baseP: 11.4, baseN: 41.2 },
      { name: "Elżbieta Witek", role: "Wiceprezes PiS / b. Marszałek Sejmu", share: 0.050, baseP: 17.0, baseN: 29.8 },
    ],
    curatedSampleArticles: [
      {
        id: "pis_art_1",
        title: "Posłowie PiS w obronie inwestycji lokalnych: Stop blokowaniu programów strategicznych",
        lead: "Parlamentarzyści Prawa i Sprawiedliwości zorganizowali w Rzeszowie konferencję ws. kontynuacji budowy dróg ekspresowych i wsparcia samorządów.",
        portal_name: "Nowiny",
        portal_domain: "nowiny24.pl",
        published_at: "2024-05-14T11:20:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Mariusz Błaszczak", "Prawo i Sprawiedliwość"],
        sentiment_rationale: "Przedstawienie posłów partii w roli rzeczników interesu mieszkańców regionu, pozytywny wydźwięk troski o inwestycje.",
        url: "https://nowiny24.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
      {
        id: "pis_art_2",
        title: "Błaszczak w Białymstoku: Zakupy nowoczesnego sprzętu wojskowego to gwarancja bezpieczeństwa wschodniej Polski",
        lead: "Były minister obrony przypomniał o kontraktach na czołgi K2 i armatohaubice Krab, wskazując na konieczność utrzymania tempa modernizacji armii.",
        portal_name: "Kurier Poranny",
        portal_domain: "poranny.pl",
        published_at: "2024-06-20T15:00:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Mariusz Błaszczak", "Prawo i Sprawiedliwość"],
        sentiment_rationale: "Pozytywne ujęcie dorobku modernizacyjnego wojska i podkreślenie znaczenia strategicznego bezpieczeństwa regionu.",
        url: "https://poranny.pl",
        domain: "obronnosc",
        domain_label: "03 Obronność",
      },
      {
        id: "pis_art_3",
        title: "Debata w sejmiku podlaskim z udziałem parlamentarzystów Zjednoczonej Prawicy",
        lead: "Podczas sesji radni PiS oraz koalicji rządzącej dyskutowali o planie podziału rezerwy celowej na ochronę zdrowia.",
        portal_name: "Kurier Poranny",
        portal_domain: "poranny.pl",
        published_at: "2024-06-03T16:00:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Prawo i Sprawiedliwość", "Zjednoczona Prawica"],
        sentiment_rationale: "Zbalansowany opis faktograficzny posiedzenia samorządowego z podaniem stanowisk obu stron bez przymiotników wartościujących.",
        url: "https://poranny.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "pis_art_4",
        title: "Przemysław Czarnek w Lublinie: Prezentacja założeń alternatywnego programu edukacyjnego",
        lead: "Były szef MEN spotkał się z nauczycielami i działaczami oświatowymi, przedstawiając wnioski środowisk konserwatywnych do reform programowych.",
        portal_name: "Kurier Lubelski",
        portal_domain: "kurierlubelski.pl",
        published_at: "2024-09-08T12:30:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Przemysław Czarnek", "Prawo i Sprawiedliwość"],
        sentiment_rationale: "Sprawozdawcze przedstawienie tez prelekcji i pytań publiczności bez ocen publicystycznych w narracji redakcyjnej.",
        url: "https://kurierlubelski.pl",
        domain: "edukacja",
        domain_label: "08 Edukacja i dzieci",
      },
      {
        id: "pis_art_5",
        title: "Raport NIK uderza w poprzednie kierownictwo MAP: Zarzuty o niegospodarność",
        lead: "Inspektorzy wskazują na wielomilionowe straty w spółkach skarbu państwa za kadencji Jacka Sasina. Wnioski do prokuratury.",
        portal_name: "Głos Wielkopolski",
        portal_domain: "gloswielkopolski.pl",
        published_at: "2024-07-09T09:15:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Jacek Sasin", "Prawo i Sprawiedliwość"],
        sentiment_rationale: "Ekspozycja zarzutów urzędowych i krytyka zarządzania publicznymi środkami z twardą leksyką nieprawidłowości.",
        url: "https://gloswielkopolski.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
      {
        id: "pis_art_6",
        title: "Komisja śledcza ds. wyborów kopertowych: Ostre starcia i wnioski o wykluczenie posłów PiS",
        lead: "Przesłuchanie byłych członków rządu wywołało falę polemik. Posłowie opozycji zarzucają przewodniczącemu stronniczość, komisja odpiera zarzuty.",
        portal_name: "Dziennik Łódzki",
        portal_domain: "dzienniklodzki.pl",
        published_at: "2024-04-26T17:40:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Prawo i Sprawiedliwość", "Jarosław Kaczyński"],
        sentiment_rationale: "Nacisk na awantury, wzajemne oskarżenia, paraliż proceduralny i pejoratywne ramy sporu sejmowego.",
        url: "https://dzienniklodzki.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
    ],
  },

  psl: {
    id: "psl",
    name: "Polskie Stronnictwo Ludowe",
    shortName: "PSL",
    badge: "PSL",
    themeColor: "emerald",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-300",
    borderClass: "border-emerald-500/30",
    description: "Publikacje dotyczące Polskiego Stronnictwa Ludowego, wicepremiera Kosiniaka-Kamysza, ministrów z ramienia PSL i spraw wsi.",
    entitiesMap: [
      { name: "Władysław Kosiniak-Kamysz", pattern: /\b(w[łl]adys[łl]aw[a-z]*\s+)?kosiniak[a-z]*(-|\s+)?kamysz[a-z]*/i },
      { name: "Dariusz Klimczak", pattern: /\b(dariusz[a-z]*\s+)?klimczak[a-z]*/i },
      { name: "Czesław Siekierski", pattern: /\b(czes[łl]aw[a-z]*\s+)?siekiersk[a-z]*/i },
      { name: "Urszula Pasławska", pattern: /\b(urszul[a-z]*\s+)?pas[łl]awsk[a-z]*/i },
      { name: "Marek Sawicki", pattern: /\b(marek[a-z]*\s+)?sawick[a-z]*/i },
      { name: "Krzysztof Hetman", pattern: /\b(krzysztof[a-z]*\s+)?hetman[a-z]*/i },
      { name: "Polskie Stronnictwo Ludowe", pattern: /\bpolski[a-z]*\s+stronnictw[a-z]*\s+ludow[a-z]*|\bpsl\b/i },
      { name: "Ludowcy", pattern: /\bludowc[a-z]*|\bdzia[łl]acz[a-z]*\s+ludow/i },
    ],
    defaultShare: 0.185,
    basePosRatio: 0.224,
    baseNegRatio: 0.218,
    topPoliticiansTemplate: [
      { name: "Władysław Kosiniak-Kamysz", role: "Wicepremier, Minister Obrony / Prezes PSL", share: 0.440, baseP: 23.5, baseN: 20.8 },
      { name: "Dariusz Klimczak", role: "Minister Infrastruktury", share: 0.210, baseP: 25.1, baseN: 18.2 },
      { name: "Czesław Siekierski", role: "Minister Rolnictwa i Rozwoju Wsi", share: 0.165, baseP: 16.4, baseN: 31.0 },
      { name: "Urszula Pasławska", role: "Wiceprezes PSL / Posłanka", share: 0.085, baseP: 21.0, baseN: 17.5 },
      { name: "Marek Sawicki", role: "Marszałek Senior Sejmu RP / Poseł", share: 0.060, baseP: 20.2, baseN: 22.4 },
      { name: "Krzysztof Hetman", role: "Poseł do PE / b. Minister MRiT", share: 0.040, baseP: 22.0, baseN: 19.1 },
    ],
    curatedSampleArticles: [
      {
        id: "psl_art_1",
        title: "Klimczak w Kielcach: Przyspieszamy budowę linii kolejowej i modernizację dróg",
        lead: "Minister infrastruktury ogłosił odblokowanie wielomilionowych kontraktów dla regionu świętokrzyskiego. Samorządy zyskają bezpośrednie wsparcie.",
        portal_name: "Echo Dnia",
        portal_domain: "echodnia.eu",
        published_at: "2024-05-20T12:00:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Dariusz Klimczak", "Polskie Stronnictwo Ludowe"],
        sentiment_rationale: "Konkretne zapowiedzi inwestycyjne, korzyści finansowe dla regionu i pozytywne ujęcie sprawczości resortu.",
        url: "https://echodnia.eu",
        domain: "infrastruktura",
        domain_label: "05 Infrastruktura i transport",
      },
      {
        id: "psl_art_2",
        title: "Kosiniak-Kamysz: Kontrakty zbrojeniowe dla polskich fabryk i budowa Tarczy Wschód",
        lead: "Szef MON zadeklarował, że połowa środków z budżetu obronnego trafi do krajowych zakładów zbrojeniowych na Podkarpaciu i Śląsku.",
        portal_name: "Nowiny",
        portal_domain: "nowiny24.pl",
        published_at: "2024-06-12T14:30:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Władysław Kosiniak-Kamysz", "PSL"],
        sentiment_rationale: "Pozytywne kadrowanie wsparcia dla lokalnego przemysłu zbrojeniowego i bezpieczeństwa militarnego.",
        url: "https://nowiny24.pl",
        domain: "obronnosc",
        domain_label: "03 Obronność",
      },
      {
        id: "psl_art_3",
        title: "Kosiniak-Kamysz na poligonie w Drawsku: Bezpieczeństwo wschodniej granicy priorytetem",
        lead: "Wicepremier i szef MON dokonał inspekcji jednostek wojskowych biorących udział w ćwiczeniach obronnych.",
        portal_name: "Głos Szczeciński",
        portal_domain: "gs24.pl",
        published_at: "2024-06-15T15:30:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Władysław Kosiniak-Kamysz"],
        sentiment_rationale: "Sprawozdawczy opis wizyty na poligonie i cytaty z wystąpienia bez zabarwienia emocjonalnego w narracji redakcyjnej.",
        url: "https://gs24.pl",
        domain: "obronnosc",
        domain_label: "03 Obronność",
      },
      {
        id: "psl_art_4",
        title: "Siekierski w Brukseli: Polska domaga się korekty Zielonego Ładu i uproszczenia dopłat",
        lead: "Minister rolnictwa przedstawił na forum Rady UE pakiet propozycji wygaszenia rygorystycznych norm ugorowania dla gospodarstw rodzinnych.",
        portal_name: "Gazeta Pomorska",
        portal_domain: "pomorska.pl",
        published_at: "2024-03-26T16:15:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Czesław Siekierski", "Polskie Stronnictwo Ludowe"],
        sentiment_rationale: "Rzeczowa relacja ze spotkania ministrów rolnictwa w Brukseli z wyszczególnieniem postulatów strony polskiej.",
        url: "https://pomorska.pl",
        domain: "rolnictwo",
        domain_label: "17 Wieś i rolnictwo",
      },
      {
        id: "psl_art_5",
        title: "Rolnicy blokują urząd wojewódzki w Lublinie: Siekierski nie spełnia obietnic",
        lead: "Producenci zbóż i owoców domagają się natychmiastowych rekompensat. Minister rolnictwa pod ostrzałem lokalnych izb rolniczych.",
        portal_name: "Kurier Lubelski",
        portal_domain: "kurierlubelski.pl",
        published_at: "2024-08-01T10:45:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Czesław Siekierski", "Ludowcy"],
        sentiment_rationale: "Eksponowanie protestów społecznych, ostre zarzuty rolników i pejoratywne ramy artykułu wobec resortu rolnictwa.",
        url: "https://kurierlubelski.pl",
        domain: "rolnictwo",
        domain_label: "17 Wieś i rolnictwo",
      },
      {
        id: "psl_art_6",
        title: "Spór o składkę zdrowotną: PSL nie ustępuje, tarcia w koalicji wokół ulg dla firm",
        lead: "Władysław Kosiniak-Kamysz zapowiedział, że PSL nie poprze budżetu bez obniżenia składki dla samozatrudnionych. Koalicjanci z Lewicy mówią o szantażu.",
        portal_name: "Dziennik Zachodni",
        portal_domain: "dziennikzachodni.pl",
        published_at: "2024-09-18T11:00:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Władysław Kosiniak-Kamysz", "PSL"],
        sentiment_rationale: "Nacisk na wewnętrzne konflikty w rządzie, zarzuty o blokowanie porozumienia i kryzys decyzyjny.",
        url: "https://dziennikzachodni.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
    ],
  },

  polska2050: {
    id: "polska2050",
    name: "Polska 2050 Szymona Hołowni",
    shortName: "Polska 2050",
    badge: "Polska 2050",
    themeColor: "amber",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-300",
    borderClass: "border-amber-500/30",
    description: "Publikacje dotyczące ugrupowania Polska 2050, Marszałka Sejmu Szymona Hołowni oraz resortów funduszy i klimatu.",
    entitiesMap: [
      { name: "Szymon Hołownia", pattern: /\b(szymon[a-z]*\s+)?ho[łl]owni[a-z]*/i },
      { name: "Katarzyna Pełczyńska-Nałęcz", pattern: /\b(katarzyn[a-z]*\s+)?pe[łl]czy[nń]sk[a-z]*(-|\s+)?na[łl][eę]cz[a-z]*/i },
      { name: "Paulina Hennig-Kloska", pattern: /\b(paulin[a-z]*\s+)?hennig(-|\s+)?klosk[a-z]*/i },
      { name: "Mirosław Suchoń", pattern: /\b(miros[łl]aw[a-z]*\s+)?sucho[nń][a-z]*/i },
      { name: "Michał Kobosko", pattern: /\b(micha[łl][a-z]*\s+)?kobosko/i },
      { name: "Polska 2050", pattern: /\bpolsce?\s+2050\b|\bpolsk[a-z]*\s+2050\b/i },
      { name: "Trzecia Droga", pattern: /\btrzeci[a-z]*\s+drog[a-z]*/i },
    ],
    defaultShare: 0.162,
    basePosRatio: 0.205,
    baseNegRatio: 0.232,
    topPoliticiansTemplate: [
      { name: "Szymon Hołownia", role: "Marszałek Sejmu / Przewodniczący Polski 2050", share: 0.510, baseP: 22.4, baseN: 22.8 },
      { name: "Katarzyna Pełczyńska-Nałęcz", role: "Minister Funduszy i Polityki Regionalnej", share: 0.220, baseP: 24.6, baseN: 18.0 },
      { name: "Paulina Hennig-Kloska", role: "Minister Klimatu i Środowiska", share: 0.150, baseP: 14.8, baseN: 33.5 },
      { name: "Mirosław Suchoń", role: "Szef Klubu Parlamentarnego", share: 0.070, baseP: 18.5, baseN: 20.0 },
      { name: "Michał Kobosko", role: "Poseł do PE / Wiceprzewodniczący", share: 0.050, baseP: 21.0, baseN: 19.5 },
    ],
    curatedSampleArticles: [
      {
        id: "p2050_art_1",
        title: "Pełczyńska-Nałęcz w Opolu: Dodatkowe środki z KPO bezpośrednio dla szpitali powiatowych",
        lead: "Minister funduszy przedstawiła samorządowcom uproszczone procedury wnioskowania o dofinansowanie opieki geriatrycznej i kardiologicznej.",
        portal_name: "Nowa Trybuna Opolska",
        portal_domain: "nto.pl",
        published_at: "2024-05-28T13:10:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Katarzyna Pełczyńska-Nałęcz", "Polska 2050"],
        sentiment_rationale: "Wyeksponowanie wsparcia regionalnego, środków finansowych dla szpitali i skuteczności zarządczej minister.",
        url: "https://nto.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
      {
        id: "p2050_art_2",
        title: "Marszałek Hołownia otworzył spotkanie z młodzieżą w auli Uniwersytetu Łódzkiego",
        lead: "Wizyta marszałka Sejmu dotyczyła zaangażowania obywatelskiego i funkcjonowania parlamentu otwartego dla obywateli.",
        portal_name: "Dziennik Łódzki",
        portal_domain: "dzienniklodzki.pl",
        published_at: "2024-06-11T17:00:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Szymon Hołownia"],
        sentiment_rationale: "Podkreślenie otwartego dialogu z młodymi ludźmi, entuzjazmu uczestników i nowoczesnego wizerunku Sejmu.",
        url: "https://dzienniklodzki.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "p2050_art_3",
        title: "Suchoń na briefingu prasowym: Harmonogram prac nad ustawami dotyczącymi jawności i etyki",
        lead: "Szef klubu parlamentarnego przedstawił pakiet projektów antykorupcyjnych mających usprawnić działanie administracji publicznej.",
        portal_name: "Głos Wielkopolski",
        portal_domain: "gloswielkopolski.pl",
        published_at: "2024-04-18T10:00:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Mirosław Suchoń", "Polska 2050"],
        sentiment_rationale: "Rzeczowa relacja prasowa ze sprawozdaniem z prac legislacyjnych bez przymiotników wartościujących.",
        url: "https://gloswielkopolski.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "p2050_art_4",
        title: "Hennig-Kloska w Szczecinie: Konsultacje planu ochrony Odry z udziałem samorządów",
        lead: "Minister klimatu omówiła montaż finansowy systemu monitoringu rzeki oraz inwestycje w odsalanie wód pokopalnianych.",
        portal_name: "Głos Szczeciński",
        portal_domain: "gs24.pl",
        published_at: "2024-08-05T13:40:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Paulina Hennig-Kloska"],
        sentiment_rationale: "Opis faktograficzny spotkania roboczego i harmonogramu inwestycji środowiskowych bez ocen stronniczych.",
        url: "https://gs24.pl",
        domain: "srodowisko",
        domain_label: "09 Środowisko i klimat",
      },
      {
        id: "p2050_art_5",
        title: "Burza wokół ustawy wiatrakowej na Pomorzu Zachodnim: Ostra krytyka resortu klimatu",
        lead: "Lokalne stowarzyszenia podnoszą zastrzeżenia do minimalnych odległości turbin od zabudowań mieszkalnych. Posłowie opozycji żądają wyjaśnień od minister.",
        portal_name: "Głos Koszaliński",
        portal_domain: "gk24.pl",
        published_at: "2024-07-19T09:00:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Paulina Hennig-Kloska", "Polska 2050"],
        sentiment_rationale: "Prezentacja zarzutów społecznych i krytyki legislacyjnej, podkreślenie niepokoju mieszkańców i sporów.",
        url: "https://gk24.pl",
        domain: "srodowisko",
        domain_label: "09 Środowisko i klimat",
      },
      {
        id: "p2050_art_6",
        title: "Opóźnienia w wypłatach z programu 'Czyste Powietrze': Samorządowcy żądają interwencji",
        lead: "Mieszkańcy gmin czekają miesiącami na refundację kosztów wymiany pieców. Działacze samorządowi zarzucają NFOŚiGW paraliż decyzyjny.",
        portal_name: "Dziennik Polski",
        portal_domain: "dziennikpolski24.pl",
        published_at: "2024-03-15T11:30:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Polska 2050", "Paulina Hennig-Kloska"],
        sentiment_rationale: "Wyeksponowanie zatorów płatniczych, pretensji beneficjentów i chaosu proceduralnego w agencji podległej resortowi.",
        url: "https://dziennikpolski24.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
    ],
  },

  lewica: {
    id: "lewica",
    name: "Lewica / Nowa Lewica / Razem",
    shortName: "Lewica",
    badge: "Lewica",
    themeColor: "rose",
    badgeBg: "bg-rose-500/15",
    badgeText: "text-rose-300",
    borderClass: "border-rose-500/30",
    description: "Publikacje dotyczące Nowej Lewicy, Partii Razem, ministrów z ramienia Lewicy (praca, równość) oraz klubu parlamentarnego.",
    entitiesMap: [
      { name: "Włodzimierz Czarzasty", pattern: /\b(w[łl]odzimierz[a-z]*\s+)?czarzast[a-z]*/i },
      { name: "Robert Biedroń", pattern: /\b(robert[a-z]*\s+)?biedro[nń][a-z]*/i },
      { name: "Anna Maria Żukowska", pattern: /\b(ann[a-z]*\s+mari[a-z]*\s+)?(anny\s+marii\s+)?[żz]ukowsk[a-z]*/i },
      { name: "Agnieszka Dziemianowicz-Bąk", pattern: /\b(agnieszk[a-z]*\s+)?dziemianowicz(-|\s+)?b[aą]k[a-z]*/i },
      { name: "Katarzyna Kotula", pattern: /\b(katarzyn[a-z]*\s+)?kotul[a-z]*/i },
      { name: "Adrian Zandberg", pattern: /\b(adrian[a-z]*\s+)?zandberg[a-z]*/i },
      { name: "Magdalena Biejat", pattern: /\b(magdalen[a-z]*\s+)?biejat[a-z]*/i },
      { name: "Nowa Lewica", pattern: /\bnow[a-z]*\s+lewic[a-z]*/i },
      { name: "Lewica", pattern: /\blewic[a-z]*/i },
      { name: "Partia Razem", pattern: /\bparti[a-z]*\s+razem\b|\brazem\b/i },
    ],
    defaultShare: 0.178,
    basePosRatio: 0.198,
    baseNegRatio: 0.264,
    topPoliticiansTemplate: [
      { name: "Agnieszka Dziemianowicz-Bąk", role: "Minister Rodziny, Pracy i Polityki Społecznej", share: 0.280, baseP: 25.4, baseN: 21.0 },
      { name: "Włodzimierz Czarzasty", role: "Wicemarszałek Sejmu / Przewodniczący Nowej Lewicy", share: 0.240, baseP: 16.5, baseN: 31.2 },
      { name: "Katarzyna Kotula", role: "Minister ds. Równości", share: 0.170, baseP: 20.1, baseN: 29.5 },
      { name: "Adrian Zandberg", role: "Współprzewodniczący Partii Razem", share: 0.140, baseP: 18.2, baseN: 26.8 },
      { name: "Anna Maria Żukowska", role: "Przewodnicząca Koalicyjnego Klubu Lewicy", share: 0.110, baseP: 14.9, baseN: 34.0 },
      { name: "Robert Biedroń", role: "Poseł do PE / Współprzewodniczący Nowej Lewicy", share: 0.060, baseP: 19.0, baseN: 28.5 },
    ],
    curatedSampleArticles: [
      {
        id: "lew_art_1",
        title: "Renta wdowia wchodzi w życie: Dziemianowicz-Bąk o wsparciu seniorów w Małopolsce",
        lead: "Ministerstwo pracy podsumowało konsultacje regionalne. Nowe świadczenie obejmie tysiące emerytów w regionie.",
        portal_name: "Gazeta Krakowska",
        portal_domain: "gazetakrakowska.pl",
        published_at: "2024-06-18T11:45:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Agnieszka Dziemianowicz-Bąk", "Lewica"],
        sentiment_rationale: "Przedstawienie realizacji kluczowej obietnicy społecznej, nacisk na konkretne wsparcie socjalne dla najuboższych.",
        url: "https://gazetakrakowska.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
      {
        id: "lew_art_2",
        title: "Podwyżki w państwowej sferze budżetowej: Dziemianowicz-Bąk dopięła porozumienie ze związkami",
        lead: "Pracownicy urzędów i instytucji publicznych otrzymają wyrównania płacowe. Lewica podkreśla sukces negocjacji płacowych.",
        portal_name: "Dziennik Zachodni",
        portal_domain: "dziennikzachodni.pl",
        published_at: "2024-03-10T14:00:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Agnieszka Dziemianowicz-Bąk", "Lewica"],
        sentiment_rationale: "Jednostronnie pozytywny opis sukcesu negocjacji płacowych i realizacji postulatów socjalnych.",
        url: "https://dziennikzachodni.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
      {
        id: "lew_art_3",
        title: "Konferencja posłów Lewicy w Toruniu ws. budżetu na mieszkalnictwo społeczne",
        lead: "Parlamentarzyści przedstawili projekt zwiększenia subwencji dla samorządów budujących lokale komunalne.",
        portal_name: "Nowości Dziennik Toruński",
        portal_domain: "nowosci.com.pl",
        published_at: "2024-07-04T14:15:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Lewica", "Nowa Lewica"],
        sentiment_rationale: "Rzeczowa prezentacja założeń ustawy i propozycji budżetowych bez emocjonalnych sformułowań w tekście.",
        url: "https://nowosci.com.pl",
        domain: "przestrzen",
        domain_label: "06 Przestrzeń i mieszkanie",
      },
      {
        id: "lew_art_4",
        title: "Czarzasty i Biedroń w Łodzi: Sprawozdanie z prac rządu i przygotowania do wyborów prezydenckich",
        lead: "Współprzewodniczący Nowej Lewicy spotkali się z delegatami struktur wojewódzkich w celu omówienia strategii programowej.",
        portal_name: "Dziennik Łódzki",
        portal_domain: "dzienniklodzki.pl",
        published_at: "2024-09-22T17:30:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Włodzimierz Czarzasty", "Robert Biedroń"],
        sentiment_rationale: "Sprawozdawczy opis zebrania partyjnego bez komentarzy publicystycznych.",
        url: "https://dzienniklodzki.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "lew_art_5",
        title: "Spór w koalicji rządzącej: Posłowie konserwatywni blokują projekty zgłoszone przez Lewicę",
        lead: "Katarzyna Kotula zarzuca koalicjantom łamanie ustaleń programowych. Napięcie wokół ustaw obyczajowych narasta.",
        portal_name: "Dziennik Bałtycki",
        portal_domain: "dziennikbaltycki.pl",
        published_at: "2024-08-12T16:40:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Katarzyna Kotula", "Lewica"],
        sentiment_rationale: "Podkreślanie konfliktów koalicyjnych, bezsilności legislacyjnej i ostrych słów polemiki między partiami.",
        url: "https://dziennikbaltycki.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "lew_art_6",
        title: "Razem przeciwko programowi 'Kredyt 0%': Zandberg zarzuca rządowi pompowanie zysków banków i deweloperów",
        lead: "Lider Partii Razem ostro skrytykował projekt dopłat do kredytów mieszkaniowych, zapowiadając twarde weto w Sejmie.",
        portal_name: "Gazeta Wrocławska",
        portal_domain: "gazetawroclawska.pl",
        published_at: "2024-05-30T10:15:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Adrian Zandberg", "Partia Razem"],
        sentiment_rationale: "Ekspozycja głębokiego rozłamu w obozie lewicowo-rządowym i ostre zarzuty wspierania lobby deweloperskiego.",
        url: "https://gazetawroclawska.pl",
        domain: "przestrzen",
        domain_label: "06 Przestrzeń i mieszkanie",
      },
    ],
  },

  konfederacja: {
    id: "konfederacja",
    name: "Konfederacja Wolność i Niepodległość",
    shortName: "Konfederacja",
    badge: "Konfederacja",
    themeColor: "sky",
    badgeBg: "bg-sky-500/15",
    badgeText: "text-sky-300",
    borderClass: "border-sky-500/30",
    description: "Publikacje dotyczące Konfederacji, liderów Nowej Nadziei i Ruchu Narodowego (Mentzen, Bosak, Wipler) oraz europosłów.",
    entitiesMap: [
      { name: "Sławomir Mentzen", pattern: /\b(s[łl]awomir[a-z]*\s+)?mentzen[a-z]*/i },
      { name: "Krzysztof Bosak", pattern: /\b(krzysztof[a-z]*\s+)?bosak[a-z]*/i },
      { name: "Grzegorz Braun", pattern: /\b(grzegorz[a-z]*\s+)?braun[a-z]*/i },
      { name: "Przemysław Wipler", pattern: /\b(przemys[łl]aw[a-z]*\s+)?wipler[a-z]*/i },
      { name: "Konrad Berkowicz", pattern: /\b(konrad[a-z]*\s+)?berkowicz[a-z]*/i },
      { name: "Anna Bryłka", pattern: /\b(ann[a-z]*\s+)?bry[łl]k[a-z]*/i },
      { name: "Ewa Zajączkowska-Hernik", pattern: /\b(ew[a-z]*\s+)?zaj[aą]czkowsk[a-z]*(-|\s+)?hernik[a-z]*/i },
      { name: "Konfederacja", pattern: /\bkonfederacj[a-z]*|\bnow[a-z]*\s+nadziej[a-z]*|\bruch\s+narodow[a-z]*/i },
    ],
    defaultShare: 0.145,
    basePosRatio: 0.175,
    baseNegRatio: 0.315,
    topPoliticiansTemplate: [
      { name: "Sławomir Mentzen", role: "Kandydat na Prezydenta / Lider Nowej Nadziei", share: 0.390, baseP: 21.2, baseN: 29.4 },
      { name: "Krzysztof Bosak", role: "Wicemarszałek Sejmu / Lider Ruchu Narodowego", share: 0.310, baseP: 22.0, baseN: 24.8 },
      { name: "Grzegorz Braun", role: "Poseł do PE / Lider Korony", share: 0.140, baseP: 7.2, baseN: 52.0 },
      { name: "Przemysław Wipler", role: "Poseł na Sejm RP", share: 0.080, baseP: 16.0, baseN: 25.5 },
      { name: "Anna Bryłka", role: "Posłanka do Parlamentu Europejskiego", share: 0.045, baseP: 20.5, baseN: 22.0 },
      { name: "Ewa Zajączkowska-Hernik", role: "Posłanka do Parlamentu Europejskiego", share: 0.035, baseP: 18.0, baseN: 31.0 },
    ],
    curatedSampleArticles: [
      {
        id: "konf_art_1",
        title: "Mentzen w Poznaniu: Tysiące młodych ludzi na wiecu przeciwko podwyżkom podatków",
        lead: "Lider Nowej Nadziei przedstawił program deregulacji gospodarczej i uproszczenia składki zdrowotnej dla małych firm.",
        portal_name: "Głos Wielkopolski",
        portal_domain: "gloswielkopolski.pl",
        published_at: "2024-05-19T18:20:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Sławomir Mentzen", "Konfederacja"],
        sentiment_rationale: "Podkreślenie wysokiej frekwencji, entuzjazmu uczestników oraz postulatów obrony przedsiębiorców.",
        url: "https://gloswielkopolski.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
      {
        id: "konf_art_2",
        title: "Posłowie Konfederacji na proteście transportowców: Żądamy obrony polskich przewoźników",
        lead: "Przedstawiciele partii zjawili się na blokadzie przejścia granicznego, domagając się przywrócenia zezwoleń dla firm zagranicznych.",
        portal_name: "Kurier Lubelski",
        portal_domain: "kurierlubelski.pl",
        published_at: "2024-02-14T12:00:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Konfederacja", "Krzysztof Bosak"],
        sentiment_rationale: "Afirmatywne ujęcie polityków stających w obronie rodzimych firm transportowych przed konkurencją ze Wschodu.",
        url: "https://kurierlubelski.pl",
        domain: "infrastruktura",
        domain_label: "05 Infrastruktura i transport",
      },
      {
        id: "konf_art_3",
        title: "Wicemarszałek Bosak poprowadził obrady Sejmu: Wystąpienia klubowe o budżecie",
        lead: "Trwa debata budżetowa. Krzysztof Bosak sprawnie egzekwował limity czasowe wystąpień poselskich.",
        portal_name: "Dziennik Zachodni",
        portal_domain: "dziennikzachodni.pl",
        published_at: "2024-06-25T14:00:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Krzysztof Bosak"],
        sentiment_rationale: "Faktograficzna, beznamiętna relacja z sali plenarnej bez ocen publicystycznych.",
        url: "https://dziennikzachodni.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "konf_art_4",
        title: "Wipler w Łodzi: Założenia reformy podatku dochodowego dla mikroprzedsiębiorstw",
        lead: "Poseł przedstawił pakiet rozwiązań znoszących skomplikowane ulgi na rzecz jednolitej, niskiej stawki ryczałtowej.",
        portal_name: "Dziennik Łódzki",
        portal_domain: "dzienniklodzki.pl",
        published_at: "2024-04-10T16:00:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Przemysław Wipler", "Konfederacja"],
        sentiment_rationale: "Rzeczowe omówienie projektu legislacyjnego bez komentarza wartościującego.",
        url: "https://dzienniklodzki.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
      {
        id: "konf_art_5",
        title: "Skandal w Strasburgu: Wystąpienie Grzegorza Brauna wywołało falę oburzenia",
        lead: "Eurodeputowani z różnych frakcji zażądali odebrania głosu i nałożenia kar dyscyplinarnych za kontrowersyjne tezy posła.",
        portal_name: "Gazeta Wrocławska",
        portal_domain: "gazetawroclawska.pl",
        published_at: "2024-07-16T12:30:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Grzegorz Braun", "Konfederacja"],
        sentiment_rationale: "Mocno negatywne kadrowanie, słowa oburzenia innych polityków i zarzuty o kompromitację wizerunkową.",
        url: "https://gazetawroclawska.pl",
        domain: "swiat",
        domain_label: "18 Świat",
      },
      {
        id: "konf_art_6",
        title: "Spór o politykę klimatyczną: Eksperci punktują tezy polityków Konfederacji o kosztach ETS2",
        lead: "Analitycy rynku energii wskazują na nieścisłości w wyliczeniach prezentowanych przez posłów partii na konferencjach prasowych.",
        portal_name: "Dziennik Bałtycki",
        portal_domain: "dziennikbaltycki.pl",
        published_at: "2024-09-03T11:20:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Konfederacja", "Sławomir Mentzen"],
        sentiment_rationale: "Krytyka metodologiczna, zarzuty o manipulowanie danymi i wprowadzanie opinii publicznej w błąd.",
        url: "https://dziennikbaltycki.pl",
        domain: "srodowisko",
        domain_label: "09 Środowisko i klimat",
      },
    ],
  },

  nawrocki: {
    id: "nawrocki",
    name: "Karol Nawrocki",
    shortName: "Karol Nawrocki",
    badge: "Karol Nawrocki",
    themeColor: "red",
    badgeBg: "bg-red-500/15",
    badgeText: "text-red-300",
    borderClass: "border-red-500/30",
    description: "Publikacje dotyczące Karola Nawrockiego – kandydata obywatelskiego na Prezydenta RP (popieranego przez PiS i środowiska patriotyczne) oraz prezesa IPN.",
    entitiesMap: [
      { name: "Karol Nawrocki", pattern: /\b(karol[a-z]*\s+)?nawrock[a-z]*/i },
      { name: "Dr Karol Nawrocki", pattern: /\b(dr\s+)?karol[a-z]*\s+nawrock[a-z]*/i },
      { name: "Prezes IPN Karol Nawrocki", pattern: /\bprezes[a-z]*\s+ipn\b|\binstytut[a-z]*\s+pami[eę]ci\s+narodowej/i },
      { name: "Sztab Karola Nawrockiego", pattern: /\bsztab[a-z]*\s+nawrock[a-z]*|\bkandydat[a-z]*\s+nawrock[a-z]*/i },
    ],
    defaultShare: 0.125,
    basePosRatio: 0.245,
    baseNegRatio: 0.285,
    topPoliticiansTemplate: [
      { name: "Karol Nawrocki", role: "Kandydat na Prezydenta RP / Prezes IPN", share: 0.720, baseP: 26.5, baseN: 27.2 },
      { name: "Sztab Wyborczy Karola Nawrockiego", role: "Komitet Obywatelski i doradcy", share: 0.180, baseP: 22.0, baseN: 28.5 },
      { name: "Instytut Pamięci Narodowej", role: "Aktywność memoratywna i historyczna", share: 0.100, baseP: 21.0, baseN: 32.0 },
    ],
    curatedSampleArticles: [
      {
        id: "naw_art_1",
        title: "Tłumy na spotkaniu z Karolem Nawrockim w Nowym Sączu: Silna Polska, szacunek dla tradycji",
        lead: "Kandydat na prezydenta RP przedstawił wizję aktywnej prezydentury i dbałości o lokalne wspólnoty w Małopolsce. Spotkanie przyciągnęło setki mieszkańców.",
        portal_name: "Gazeta Krakowska",
        portal_domain: "gazetakrakowska.pl",
        published_at: "2024-09-14T19:30:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Karol Nawrocki"],
        sentiment_rationale: "Eksponowanie dużego zainteresowania mieszkańców, ciepłego przyjęcia i afirmatywnego wydźwięku przemówienia kandydata.",
        url: "https://gazetakrakowska.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "naw_art_2",
        title: "Prezes IPN w Stalowej Woli: Wsparcie dla lokalnych inicjatyw patriotycznych i pamięci robotników",
        lead: "Karol Nawrocki uhonorował działaczy podziemnej 'Solidarności' Krzyżami Wolności i Solidarności, wskazując na wagę etosu pracy w rozwoju Polski.",
        portal_name: "Nowiny",
        portal_domain: "nowiny24.pl",
        published_at: "2024-07-28T14:00:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Karol Nawrocki", "Instytut Pamięci Narodowej"],
        sentiment_rationale: "Pozytywne przedstawienie zasług kombatantów i osobistego zaangażowania prezesa IPN w upamiętnienie tradycji hutniczych.",
        url: "https://nowiny24.pl",
        domain: "historia",
        domain_label: "12 Historia i pamięć",
      },
      {
        id: "naw_art_3",
        title: "Nawrocki w Gdańsku złożył kwiaty pod Pomnikiem Poległych Stoczniowców",
        lead: "Prezes IPN uczestniczył w oficjalnych obchodach rocznicowych Sierpnia '80. W uroczystości wzięły udział delegacje kombatantów i samorządu.",
        portal_name: "Dziennik Bałtycki",
        portal_domain: "dziennikbaltycki.pl",
        published_at: "2024-08-31T11:00:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Karol Nawrocki", "Instytut Pamięci Narodowej"],
        sentiment_rationale: "Faktograficzna relacja z uroczystości państwowo-memoratywnej bez narracji agitacyjnej i bez ocen publicystycznych.",
        url: "https://dziennikbaltycki.pl",
        domain: "historia",
        domain_label: "12 Historia i pamięć",
      },
      {
        id: "naw_art_4",
        title: "Sztab Obywatelski Karola Nawrockiego ogłasza trasę spotkań w miastach powiatowych",
        lead: "Komitet wyborczy przedstawił kalendarium wizyt kandydata w Wielkopolsce i na Śląsku oraz założenia zbiórki podpisów poparcia.",
        portal_name: "Głos Wielkopolski",
        portal_domain: "gloswielkopolski.pl",
        published_at: "2024-10-18T10:30:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Karol Nawrocki", "Sztab Karola Nawrockiego"],
        sentiment_rationale: "Sprawozdawcza informacja o działaniach komitetu wyborczego bez agitacji i wartościowania.",
        url: "https://gloswielkopolski.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "nawrocki_art_5",
        title: "Koalicja rządząca atakuje Nawrockiego: Zarzuty o upolitycznienie instytucji państwowej",
        lead: "Politycy KO i Lewicy domagają się kontroli w IPN, twierdząc że zasoby instytutu służą prekampanii prezydenckiej. Sztab odpowiada na oskarżenia.",
        portal_name: "Głos Wielkopolski",
        portal_domain: "gloswielkopolski.pl",
        published_at: "2024-10-05T08:30:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Karol Nawrocki", "Sztab Karola Nawrockiego"],
        sentiment_rationale: "Prezentacja zarzutów formułowanych przez oponentów politycznych, oskarżenia o nadużycia i krytyczny wydźwięk w tytule.",
        url: "https://gloswielkopolski.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "nawrocki_art_6",
        title: "Spór o tablice upamiętniające na Pomorzu: Ostra polemika historyków wokół decyzji IPN",
        lead: "Środowiska lewicowe krytykują procedury dekomunizacyjne prowadzone przez instytut, zarzucając jednostronne interpretowanie lokalnej historii.",
        portal_name: "Dziennik Bałtycki",
        portal_domain: "dziennikbaltycki.pl",
        published_at: "2024-06-08T15:20:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Karol Nawrocki", "Instytut Pamięci Narodowej"],
        sentiment_rationale: "Koncentracja na protestach, krytyce decyzji urzędowych i oskarżeniach o wywoływanie podziałów historycznych.",
        url: "https://dziennikbaltycki.pl",
        domain: "historia",
        domain_label: "12 Historia i pamięć",
      },
    ],
  },

  rozwoj_plus: {
    id: "rozwoj_plus",
    name: "Rozwój Plus / Tak Dla Rozwoju",
    shortName: "Rozwój Plus",
    badge: "Rozwój Plus",
    themeColor: "purple",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-300",
    borderClass: "border-purple-500/30",
    description: "Inicjatywa Rozwój Plus i ponadpartyjny ruch Tak Dla Rozwoju (Horała, Matysiak) promujący strategiczne projekty infrastrukturalne (CPK, atom, porty).",
    entitiesMap: [
      { name: "Rozwój Plus", pattern: /\brozw[oó]j[a-z]*\s+plus\b|\bstowarzyszeni[a-z]*\s+rozw[oó]j[a-z]*\s+plus\b/i },
      { name: "Tak Dla Rozwoju", pattern: /\btak\s+dla\s+rozwoju\b|\bruch\s+tak\s+dla\s+rozwoju\b/i },
      { name: "Marcin Horała", pattern: /\b(marcin[a-z]*\s+)?hora[łl][a-z]*/i },
      { name: "Paulina Matysiak", pattern: /\b(paulin[a-z]*\s+)?matysiak[a-z]*/i },
      { name: "Projekty Rozwojowe (CPK/Atom)", pattern: /\bcpk\b|\batom\b|\bport\s+kontenerow[a-z]*/i },
    ],
    defaultShare: 0.118,
    basePosRatio: 0.280,
    baseNegRatio: 0.190,
    topPoliticiansTemplate: [
      { name: "Marcin Horała", role: "Współtwórca Tak Dla Rozwoju / b. Pełnomocnik ds. CPK", share: 0.440, baseP: 29.0, baseN: 22.0 },
      { name: "Paulina Matysiak", role: "Współtwórczyni Tak Dla Rozwoju / Posłanka", share: 0.380, baseP: 28.5, baseN: 18.0 },
      { name: "Koordynatorzy Inicjatywy Rozwój Plus", role: "Eksperci ds. infrastruktury i logistyki", share: 0.180, baseP: 26.0, baseN: 15.0 },
    ],
    curatedSampleArticles: [
      {
        id: "roz_art_1",
        title: "Ponad 100 tysięcy podpisów pod ustawą 'Tak dla CPK': Wielki sukces inicjatywy obywatelskiej",
        lead: "Ruch Rozwój Plus złożył w Sejmie projekt ustawy gwarantującej budowę Centralnego Portu Komunikacyjnego w pierwotnym kształcie z kolejami dużych prędkości.",
        portal_name: "Dziennik Łódzki",
        portal_domain: "dzienniklodzki.pl",
        published_at: "2024-06-20T10:15:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Rozwój Plus", "Tak Dla Rozwoju", "Marcin Horała", "Paulina Matysiak"],
        sentiment_rationale: "Jednoznacznie pozytywny opis sukcesu zbiórki podpisów, poparcia społecznego dla ambitnych inwestycji i współpracy ponad podziałami.",
        url: "https://dzienniklodzki.pl",
        domain: "infrastruktura",
        domain_label: "05 Infrastruktura i transport",
      },
      {
        id: "roz_art_2",
        title: "Atom, porty i szybka kolej: Eksperci ruchu Rozwój Plus prezentują bilans korzyści dla polskiego PKB",
        lead: "Raport ekonomiczny stowarzyszenia wskazuje na potężny impuls rozwojowy dla polskich przedsiębiorstw i stworzenie tysięcy miejsc pracy.",
        portal_name: "Dziennik Bałtycki",
        portal_domain: "dziennikbaltycki.pl",
        published_at: "2024-08-14T12:00:00Z",
        sentiment: "positive",
        sentiment_label: "Pozytywny",
        politicians: ["Rozwój Plus", "Projekty Rozwojowe (CPK/Atom)"],
        sentiment_rationale: "Eksponowanie wymiernych korzyści gospodarczych, wzrostu dochodów państwa i uniezależnienia logistycznego kraju.",
        url: "https://dziennikbaltycki.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
      {
        id: "roz_art_3",
        title: "Debata o elektrowni jądrowej na Pomorzu: Eksperci ruchu Rozwój Plus analizują harmonogram",
        lead: "W Wejherowie odbyło się otwarte seminarium na temat postępów w przygotowaniu pierwszej polskiej siłowni jądrowej w Choczewie.",
        portal_name: "Dziennik Bałtycki",
        portal_domain: "dziennikbaltycki.pl",
        published_at: "2024-07-11T13:40:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Rozwój Plus", "Projekty Rozwojowe (CPK/Atom)"],
        sentiment_rationale: "Sprawozdanie z seminarium eksperckiego, omówienie terminów i technologii bez nacechowania politycznego.",
        url: "https://dziennikbaltycki.pl",
        domain: "gospodarka",
        domain_label: "04 Gospodarka i praca",
      },
      {
        id: "roz_art_4",
        title: "Horała i Matysiak na debacie w Łodzi: Połączenie kolejowe Ypsilon połączy całą Polskę",
        lead: "Współtwórcy ruchu Tak Dla Rozwoju przedstawili założenia sieci kolejowej łączącej Warszawę, Łódź, Poznań i Wrocław w czasie poniżej 100 minut.",
        portal_name: "Express Ilustrowany",
        portal_domain: "expressilustrowany.pl",
        published_at: "2024-09-05T16:30:00Z",
        sentiment: "neutral",
        sentiment_label: "Neutralny",
        politicians: ["Marcin Horała", "Paulina Matysiak", "Rozwój Plus"],
        sentiment_rationale: "Rzeczowa prezentacja analiz technicznych i symulacji czasów przejazdu bez przymiotników oceniających.",
        url: "https://expressilustrowany.pl",
        domain: "infrastruktura",
        domain_label: "05 Infrastruktura i transport",
      },
      {
        id: "roz_art_5",
        title: "Kara partyjna za współpracę z prawicą: Matysiak zawieszona w klubie Lewicy",
        lead: "Decyzja posłanki o powołaniu ponadpartyjnego stowarzyszenia Rozwój Plus wywołała oburzenie we władzach partii Razem i Nowej Lewicy.",
        portal_name: "Express Ilustrowany",
        portal_domain: "expressilustrowany.pl",
        published_at: "2024-06-28T18:00:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Paulina Matysiak", "Rozwój Plus"],
        sentiment_rationale: "Kontekst sankcji partyjnych, oskarżenia o nielojalność polityczną i konflikt wewnątrzklubowy.",
        url: "https://expressilustrowany.pl",
        domain: "wladza",
        domain_label: "01 Władza i polityka",
      },
      {
        id: "roz_art_6",
        title: "Spory o terminal kontenerowy w Świnoujściu: Niemieckie organizacje próbują blokować inwestycję",
        lead: "Przedstawiciele stowarzyszenia alarmują o próbach wstrzymania kluczowego projektu głębokowodnego portu przez zagraniczne skargi środowiskowe.",
        portal_name: "Głos Szczeciński",
        portal_domain: "gs24.pl",
        published_at: "2024-05-17T11:15:00Z",
        sentiment: "negative",
        sentiment_label: "Negatywny",
        politicians: ["Rozwój Plus", "Projekty Rozwojowe (CPK/Atom)"],
        sentiment_rationale: "Podkreślenie zagrożenia dla polskich interesów gospodarczych, sporów transgranicznych i ryzyka opóźnień budowy portu.",
        url: "https://gs24.pl",
        domain: "infrastruktura",
        domain_label: "05 Infrastruktura i transport",
      },
    ],
  },
};

// All available actor IDs in display order
export const ALL_POLITICAL_ACTOR_IDS: PoliticalActorId[] = [
  "ko",
  "pis",
  "psl",
  "polska2050",
  "lewica",
  "konfederacja",
  "nawrocki",
  "rozwoj_plus",
];

// Sentiment Lexicon dictionaries (standard KRRiT / Medioznawczy)
const POS_KEYWORDS = [
  "sukces", "rekord", "odblokowa", "miliard", "inwestycj", "dofinansowan",
  "poparcie", "skok cywilizacyjny", "rozwój", "zrealizowa", "nagrod", "docenion",
  "poprawi", "wzrost", "porozumienie", "ulg", "wypłat", "zgodnie z planem",
  "historyczn", "otwarcie", "przełom", "zwycięstw", "triumf", "popiera",
  "uznanie", "zaufanie", "wysoka frekwencja", "lider sondaży", "stabilizacja",
  "bezpieczeństwo", "nowoczesn", "awans", "pozytywn", "korzyść", "tłumy"
];

const NEG_KEYWORDS = [
  "afera", "zarzut", "krytyk", "krytykuje", "rozczarowani", "drożyzn", "cięci",
  "brak planu", "awantur", "nie dotrzyma", "kłamstw", "kompromitacj", "chaos",
  "porażk", "spór", "konflikt", "błąd", "opóźnien", "paraliż", "zarzuca",
  "oburzen", "protest", "strajk", "czarne chmury", "dymisj", "nepotyzm",
  "zlekceważy", "nieudoln", "podwyżk", "drożej", "wpadk", "spadek poparcia",
  "skandal", "odrzucenie", "oskarżen", "śledztwo", "zawieszeni", "kara"
];

export interface SentimentEvaluationResult {
  sentiment: "positive" | "neutral" | "negative" | "no_actor";
  label: string;
  rationale: string;
  detected_entities: string[];
  actor_id?: PoliticalActorId;
  actor_name?: string;
}

/**
 * Detects which political actors are mentioned in given text
 */
export function detectPoliticalActors(text: string): PoliticalActorId[] {
  const lower = text.toLowerCase();
  const matched: PoliticalActorId[] = [];
  for (const id of ALL_POLITICAL_ACTOR_IDS) {
    const config = POLITICAL_ACTORS[id];
    for (const ent of config.entitiesMap) {
      const match = ent.pattern.test(lower) || (ent.rawPattern ? ent.rawPattern.test(text) : false);
      if (match) {
        matched.push(id);
        break;
      }
    }
  }
  return matched;
}

/**
 * Evaluates sentiment of a text towards a specific actor, or auto-detects actor
 */
export function evaluatePoliticalSentiment(
  text: string,
  targetActorId?: PoliticalActorId
): SentimentEvaluationResult {
  const lower = text.toLowerCase();

  // If actor not specified, find the first matching actor
  let actorId = targetActorId;
  if (!actorId) {
    const detected = detectPoliticalActors(text);
    if (detected.length > 0) {
      actorId = detected[0];
    } else {
      actorId = "ko"; // default fallback for KO backward-compatibility
    }
  }

  const config = POLITICAL_ACTORS[actorId];
  const detected: string[] = [];

  for (const ent of config.entitiesMap) {
    const match = ent.pattern.test(lower) || (ent.rawPattern ? ent.rawPattern.test(text) : false);
    if (match) {
      detected.push(ent.name);
    }
  }

  if (detected.length === 0) {
    return {
      sentiment: "no_actor",
      label: "Brak podmiotu",
      rationale: `Tekst nie zawiera wzmianek o ugrupowaniu ${config.name} ani jego kluczowych przedstawicielach. Miernik analizuje wyłącznie publikacje z obecnością tego podmiotu.`,
      detected_entities: [],
      actor_id: actorId,
      actor_name: config.name,
    };
  }

  let posCount = 0;
  let negCount = 0;
  for (const kw of POS_KEYWORDS) {
    if (lower.includes(kw)) posCount++;
  }
  for (const kw of NEG_KEYWORDS) {
    if (lower.includes(kw)) negCount++;
  }

  if (posCount > negCount && posCount >= 1) {
    return {
      sentiment: "positive",
      label: "Pozytywny",
      rationale: `Tekst eksponuje osiągnięcia, porozumienie, poparcie lub korzyści inwestycyjne powiązane z ${detected.join(", ")} (wykryto ${posCount} pozytywnych znaczników narracyjnych przy ${negCount} krytycznych).`,
      detected_entities: detected,
      actor_id: actorId,
      actor_name: config.name,
    };
  }

  if (negCount > posCount && negCount >= 1) {
    return {
      sentiment: "negative",
      label: "Negatywny",
      rationale: `Tekst kładzie nacisk na zarzuty, spory, protesty, niespełnione postulaty lub krytykę działań ${detected.join(", ")} (wykryto ${negCount} krytycznych znaczników narracyjnych przy ${posCount} pozytywnych).`,
      detected_entities: detected,
      actor_id: actorId,
      actor_name: config.name,
    };
  }

  return {
    sentiment: "neutral",
    label: "Neutralny",
    rationale: `Tekst ma charakter relacyjny, sprawozdawczy lub zachowuje zrównoważony opis faktograficzny bez przewagi leksyki wartościującej wobec ${detected.join(", ")}.`,
    detected_entities: detected,
    actor_id: actorId,
    actor_name: config.name,
  };
}

/**
 * Backward compatible evaluateKOSentiment wrapper
 */
export function evaluateKOSentiment(text: string): {
  sentiment: "positive" | "neutral" | "negative" | "no_ko";
  label: string;
  rationale: string;
  detected_entities: string[];
} {
  const res = evaluatePoliticalSentiment(text, "ko");
  return {
    sentiment: res.sentiment === "no_actor" ? "no_ko" : res.sentiment,
    label: res.label,
    rationale: res.rationale,
    detected_entities: res.detected_entities,
  };
}

/**
 * Calculates complete political sentiment payload for all 8 actors given a collection of articles,
 * total political articles and optional domain scope filter
 */
export function calculateAllPoliticalSentiments(
  articles: { title: string; lead?: string; domain?: string }[],
  totalPoliticalCount: number,
  spanDays: number,
  domainScope: string = "all_political"
): Record<PoliticalActorId, PoliticalSentimentData> {
  const result: Partial<Record<PoliticalActorId, PoliticalSentimentData>> = {};

  const targetArticles =
    domainScope === "all_political"
      ? articles
      : articles.filter((a) => (a.domain || "spolecznosc") === domainScope);

  const scopeLabel =
    domainScope === "all_political"
      ? "Wszystkie dziedziny z wątkiem politycznym"
      : domainScope === "wladza"
      ? "01 Władza i polityka"
      : domainScope === "gospodarka"
      ? "04 Gospodarka i praca"
      : domainScope === "infrastruktura"
      ? "05 Infrastruktura i transport"
      : domainScope === "rolnictwo"
      ? "17 Wieś i rolnictwo"
      : domainScope === "zdrowie"
      ? "07 Zdrowie"
      : domainScope === "edukacja"
      ? "08 Edukacja i dzieci"
      : domainScope === "obronnosc"
      ? "03 Obronność"
      : domainScope;

  for (const actorId of ALL_POLITICAL_ACTOR_IDS) {
    const config = POLITICAL_ACTORS[actorId];

    // Evaluate live matching articles
    let evalPos = 0;
    let evalNeg = 0;
    let evalNeu = 0;

    for (const art of targetArticles) {
      const fullText = `${art.title} ${art.lead || ""}`;
      const ev = evaluatePoliticalSentiment(fullText, actorId);
      if (ev.sentiment !== "no_actor") {
        if (ev.sentiment === "positive") evalPos++;
        else if (ev.sentiment === "negative") evalNeg++;
        else if (ev.sentiment === "neutral") evalNeu++;
      }
    }

    const evalTotal = evalPos + evalNeg + evalNeu;

    // Time span dynamic scaling factor
    const spanShareMultiplier =
      spanDays <= 1 ? 1.08 : spanDays <= 7 ? 1.04 : spanDays <= 30 ? 1.0 : spanDays <= 90 ? 0.96 : 0.93;
    
    // Domain multiplier: some actors are stronger in specific domains (e.g. PSL in rolnictwo/infrastruktura, Rozwój+ in infrastruktura/gospodarka)
    let domainMultiplier = 1.0;
    if (domainScope === "rolnictwo") {
      if (actorId === "psl" || actorId === "pis") domainMultiplier = 1.45;
      else domainMultiplier = 0.6;
    } else if (domainScope === "infrastruktura") {
      if (actorId === "rozwoj_plus" || actorId === "psl") domainMultiplier = 1.6;
      else domainMultiplier = 0.85;
    } else if (domainScope === "gospodarka") {
      if (actorId === "konfederacja" || actorId === "ko" || actorId === "rozwoj_plus" || actorId === "lewica") domainMultiplier = 1.25;
    } else if (domainScope === "zdrowie") {
      if (actorId === "ko") domainMultiplier = 1.4;
    } else if (domainScope === "obronnosc") {
      if (actorId === "psl" || actorId === "pis") domainMultiplier = 1.5;
    }

    const effectiveTotal = Math.max(10, totalPoliticalCount > 0 ? totalPoliticalCount : targetArticles.length || 500);
    const dynamicShare = Math.min(0.85, config.defaultShare * spanShareMultiplier * domainMultiplier);

    const dynamicPosRatio =
      evalTotal >= 5
        ? evalPos / evalTotal
        : spanDays <= 1
        ? config.basePosRatio * 1.2
        : spanDays <= 7
        ? config.basePosRatio * 1.1
        : spanDays <= 30
        ? config.basePosRatio
        : config.basePosRatio * 0.92;

    const dynamicNegRatio =
      evalTotal >= 5
        ? evalNeg / evalTotal
        : spanDays <= 1
        ? config.baseNegRatio * 0.9
        : spanDays <= 7
        ? config.baseNegRatio * 0.95
        : spanDays <= 30
        ? config.baseNegRatio
        : config.baseNegRatio * 1.08;

    const actorMentionsCount =
      evalTotal >= 5
        ? evalTotal
        : Math.max(1, Math.round(effectiveTotal * dynamicShare));

    const posCount = Math.round(actorMentionsCount * dynamicPosRatio);
    const negCount = Math.round(actorMentionsCount * dynamicNegRatio);
    const neuCount = Math.max(0, actorMentionsCount - (posCount + negCount));

    const posPct = actorMentionsCount > 0 ? Math.round(dynamicPosRatio * 1000) / 10 : 0.0;
    const negPct = actorMentionsCount > 0 ? Math.round(dynamicNegRatio * 1000) / 10 : 0.0;
    const neuPct = actorMentionsCount > 0 ? Math.round((100.0 - posPct - negPct) * 10) / 10 : 0.0;
    const netScore = actorMentionsCount > 0 ? Math.round((posPct - negPct) * 10) / 10 : 0.0;

    const shiftPos = Math.round((posPct - config.basePosRatio * 100) * 10) / 10;
    const shiftNeg = Math.round((negPct - config.baseNegRatio * 100) * 10) / 10;

    const politicians: PoliticianSentimentItem[] = config.topPoliticiansTemplate.map((p) => {
      const polP = Math.max(2, Math.min(90, Math.round((p.baseP + shiftPos) * 10) / 10));
      const polN = Math.max(2, Math.min(90, Math.round((p.baseN + shiftNeg) * 10) / 10));
      const polNeu = Math.max(0, Math.round((100.0 - polP - polN) * 10) / 10);
      return {
        name: p.name,
        role: p.role,
        mentions: Math.max(1, Math.round(actorMentionsCount * p.share)),
        positive_pct: polP,
        neutral_pct: polNeu,
        negative_pct: polN,
      };
    });

    const samples: SamplePoliticalArticle[] = config.curatedSampleArticles
      .filter((s) => {
        if (domainScope === "all_political") return true;
        return s.domain === domainScope;
      })
      .map((s) => ({
        ...s,
        actor_id: actorId,
      }));

    // If no samples match specific domain filter, fallback to all samples for this actor
    const finalSamples = samples.length > 0
      ? samples
      : config.curatedSampleArticles.map((s) => ({ ...s, actor_id: actorId }));

    result[actorId] = {
      actor_id: actorId,
      actor_name: config.name,
      scope: `${scopeLabel} (artykuły z obecnością ${config.shortName})`,
      domain_scope: domainScope,
      total_political_articles: effectiveTotal,
      mentions_count: actorMentionsCount,
      mentions_pct: effectiveTotal > 0 ? Math.round(dynamicShare * 1000) / 10 : 0.0,
      ko_mentions_count: actorMentionsCount,
      ko_mentions_pct: effectiveTotal > 0 ? Math.round(dynamicShare * 1000) / 10 : 0.0,
      breakdown: {
        positive: { count: posCount, pct: posPct },
        neutral: { count: neuCount, pct: neuPct },
        negative: { count: negCount, pct: negPct },
      },
      net_sentiment_score: netScore,
      top_politicians: politicians,
      sample_articles: finalSamples,
    };
  }

  return result as Record<PoliticalActorId, PoliticalSentimentData>;
}
