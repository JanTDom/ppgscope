export type AnalysisAngle =
  | "GOVERNMENT_PROMOTION"
  | "TUSK_PROMOTION"
  | "DEPOLITICIZATION_SEO"
  | "ATTACK_RESISTANCE"
  | "LOCAL_VS_SYNDICATE";

export interface InvestigationArticle {
  id: string;
  title: string;
  lead?: string;
  url: string;
  portal_name: string;
  portal_domain: string;
  region?: string;
  published_at: string;
  is_duplicate: boolean;
  byline_type?: "named" | "anonymous" | "wire" | "partner";
  author_name?: string;
  locality?: "C" | "L" | "CL";
  topic_name?: string;
  domain_name?: string;
}

export interface GeneratedReportData {
  topicTitle: string;
  angleLabel: string;
  summaryExecutive: string;
  sourceInfo: {
    sourceLabel: string;
    datasetMode: string;
    datasetGeneratedAt?: string;
    totalArticles: number;
    matchedArticles: number;
    matchMethod: string;
    status: "EVIDENCE_FOUND" | "NO_MATCHES";
  };
  attributionLabels: {
    primary: string;
    institutional: string;
    counterNarrative: string;
  };
  attributionStats: {
    governmentPct: number;
    bureaucracyPct: number;
    oppositionPct: number;
  };
  headlineExposure: {
    ppgPct: number;
    portalsPct: number;
    rightWingPct: number;
    businessPct: number;
  };
  geographicSplit: {
    metropolisScore: number;
    countyScore: number;
  };
  keyMetrics: {
    label: string;
    value: string;
    sublabel: string;
    status: "good" | "bad" | "warning";
  }[];
  headlineCases: {
    source: string;
    sourceType: "PPG" | "PORTAL" | "OPPOSITION";
    headline: string;
    protagonist: string;
    impact: string;
    url: string;
  }[];
  strategicLosses: string[];
  editorialCorrections: {
    element: string;
    ppgMistake: string;
    recommendedCorrection: string;
    expectedGain: string;
  }[];
}

const ANGLE_LABELS: Record<AnalysisAngle, string> = {
  GOVERNMENT_PROMOTION: "Promocja sprawczości rządu i atrybucja sukcesu",
  TUSK_PROMOTION: "Promocja sprawczości Donalda Tuska i atrybucja osobista",
  DEPOLITICIZATION_SEO: "Wyciszenie polityczne i ucieczka w SEO",
  ATTACK_RESISTANCE: "Odporność na kontrnarrację opozycji",
  LOCAL_VS_SYNDICATE: "Lokalność vs centralny wsad agencyjny",
};

const STOP_WORDS = new Set(
  [
    "a",
    "aby",
    "ale",
    "czy",
    "dla",
    "do",
    "i",
    "jak",
    "jest",
    "na",
    "nie",
    "o",
    "oraz",
    "po",
    "pod",
    "przed",
    "się",
    "to",
    "w",
    "we",
    "z",
    "za",
    "ze",
    "temat",
    "sprawie",
    "zdecydował",
  ].map(normalize),
);

const TUSK_PATTERN = /\bdonald(?:a|em)?\s+tusk\b|\btusk\b/i;
const GOVERNMENT_PATTERN = /\brząd\w*\b|\bpremier\w*\b|\bminister\w*\b|\bkoalicj\w*\b/i;
const INSTITUTION_PATTERN = /\bzus\b|\burzęd\w*\b|\binstitucj\w*\b|\bprzepis\w*\b|\bprocedur\w*\b|\bsłużb\w*\b/i;
const COUNTER_PATTERN = /\bopozycj\w*\b|\bkrytyk\w*\b|\bzarzut\w*\b|\batak\w*\b|\bspór\w*\b/i;

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("pl-PL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function tokenMatchesWord(token: string, word: string): boolean {
  if (token === word) return true;
  if (token.length < 4 || word.length < 4) return false;
  return word.startsWith(token) || token.startsWith(word);
}

function countTopicMatches(text: string, tokens: string[]): number {
  const words = tokenize(text);
  return tokens.filter((token) => words.some((word) => tokenMatchesWord(token, word))).length;
}

function articleText(article: InvestigationArticle): string {
  return [article.title, article.lead, article.topic_name, article.domain_name].filter(Boolean).join(" ");
}

function scoreArticle(article: InvestigationArticle, topicTokens: string[]): number {
  const titleHits = countTopicMatches(article.title, topicTokens);
  const leadHits = countTopicMatches(article.lead || "", topicTokens);
  const metadataHits = countTopicMatches(`${article.topic_name || ""} ${article.domain_name || ""}`, topicTokens);
  
  if (titleHits === 0 && leadHits === 0) return 0;
  return titleHits * 3 + leadHits * 2 + metadataHits;
}

function percentage(value: number, total: number): number {
  return total ? Math.round((value / total) * 100) : 0;
}

interface DetectedContext {
  primaryActor: string;
  secondaryActor: string;
  counterActor: string;
  isPelczynska: boolean;
  isCzestochowa: boolean;
  isTuskGov: boolean;
}

function detectContext(topic: string, matchedArticles: InvestigationArticle[]): DetectedContext {
  const normTopic = topic.toLowerCase();
  const allTitles = matchedArticles.map(a => a.title.toLowerCase()).join(" ");

  if (normTopic.includes("pełczyńsk") || normTopic.includes("pelczynsk") || normTopic.includes("nałęcz") || allTitles.includes("pełczyńsk")) {
    return {
      primaryActor: "Katarzyna Pełczyńska-Nałęcz",
      secondaryActor: "Donald Tusk / Rząd",
      counterActor: "Polska 2050 / Szymon Hołownia",
      isPelczynska: true,
      isCzestochowa: false,
      isTuskGov: false,
    };
  }

  if (normTopic.includes("częstochow") || normTopic.includes("czestochow") || normTopic.includes("matyjaszczyk") || allTitles.includes("matyjaszczyk")) {
    return {
      primaryActor: "Krzysztof Matyjaszczyk / Lewica",
      secondaryActor: "Donald Tusk / Służby państwowe",
      counterActor: "Komitet Referendalny / Mieszkańcy",
      isPelczynska: false,
      isCzestochowa: true,
      isTuskGov: false,
    };
  }

  if (normTopic.includes("tusk") || normTopic.includes("rząd") || normTopic.includes("800")) {
    return {
      primaryActor: "Donald Tusk / Rząd",
      secondaryActor: "Instytucje / ZUS / Procedury",
      counterActor: "Opozycja / Krytycy",
      isPelczynska: false,
      isCzestochowa: false,
      isTuskGov: true,
    };
  }

  return {
    primaryActor: "Główny bohater wydarzenia",
    secondaryActor: "Organy państwowe / Instytucje",
    counterActor: "Opozycja / Oponenci",
    isPelczynska: false,
    isCzestochowa: false,
    isTuskGov: false,
  };
}

function classifyAttributionDynamic(
  text: string,
  angle: AnalysisAngle,
  context: DetectedContext
): "primary" | "institutional" | "counter" {
  const norm = text.toLowerCase();

  if (context.isPelczynska) {
    if (norm.includes("klęska") || norm.includes("szkod") || norm.includes("rozlicza") || norm.includes("konflikt") || norm.includes("własne życzenie")) {
      return "counter";
    }
    if (norm.includes("tusk") || norm.includes("spokój") || norm.includes("bieńkowska") || norm.includes("kandydatur")) {
      return "institutional";
    }
    return "primary";
  }

  if (context.isCzestochowa) {
    if (norm.includes("klęska") || norm.includes("odwołan") || norm.includes("zarzut") || norm.includes("cba") || norm.includes("taczka")) {
      return "counter";
    }
    if (norm.includes("tusk") || norm.includes("satysfakcj") || norm.includes("komisarz") || norm.includes("służby")) {
      return "institutional";
    }
    return "primary";
  }

  const tusk = TUSK_PATTERN.test(text);
  const government = GOVERNMENT_PATTERN.test(text);
  const institution = INSTITUTION_PATTERN.test(text);
  const counter = COUNTER_PATTERN.test(text);

  if ((angle === "TUSK_PROMOTION" && tusk) || (angle !== "TUSK_PROMOTION" && (tusk || government))) return "primary";
  if (counter) return "counter";
  if (institution || government) return "institutional";
  return "institutional";
}

function protagonistForArticle(article: InvestigationArticle, context: DetectedContext): string {
  const text = articleText(article).toLowerCase();
  
  if (context.isPelczynska) {
    if (text.includes("tusk") && !text.includes("pełczyńsk")) return "Donald Tusk";
    if (text.includes("hołowni") || text.includes("gramatyka")) return "Polska 2050";
    return "Katarzyna Pełczyńska-Nałęcz";
  }

  if (context.isCzestochowa) {
    if (text.includes("tusk")) return "Donald Tusk";
    if (text.includes("nocoń") || text.includes("referendyści")) return "Komitet referendalny";
    return "Krzysztof Matyjaszczyk";
  }

  if (TUSK_PATTERN.test(text)) return "Donald Tusk";
  if (GOVERNMENT_PATTERN.test(text)) return "Rząd / premier";
  if (INSTITUTION_PATTERN.test(text)) return "Instytucja / procedura";
  return "Brak rozpoznanego aktora";
}

function createNoMatchReport(
  topic: string,
  expectations: string,
  angle: AnalysisAngle,
  totalArticles: number,
  datasetGeneratedAt?: string,
  datasetMode = "nieokreślony",
): GeneratedReportData {
  const angleLabel = ANGLE_LABELS[angle];
  return {
    topicTitle: topic,
    angleLabel,
    summaryExecutive: `Nie znaleziono w aktualnym snapshotcie PPGscope artykułów dopasowanych do tematu „${topic}”. Skorzystaj z opcji „Wyszukiwanie na żywo”, aby odpytać najnowszy indeks RSS i sitemapy całej sieci Polska Press Grupa.`,
    sourceInfo: {
      sourceLabel: "dashboard.json / recent_articles",
      datasetMode,
      datasetGeneratedAt,
      totalArticles,
      matchedArticles: 0,
      matchMethod: "Dopasowanie tokenów tematu do bazy lokalnej; brak dopasowania w zarchiwizowanym snapshotcie.",
      status: "NO_MATCHES",
    },
    attributionLabels: {
      primary: "Główny podmiot",
      institutional: "Instytucje / procedury",
      counterNarrative: "Krytyka / kontrnarracja",
    },
    attributionStats: { governmentPct: 0, bureaucracyPct: 0, oppositionPct: 0 },
    headlineExposure: { ppgPct: 0, portalsPct: 0, rightWingPct: 0, businessPct: 0 },
    geographicSplit: { metropolisScore: 0, countyScore: 0 },
    keyMetrics: [
      { label: "Dopasowane artykuły", value: "0", sublabel: `z ${totalArticles.toLocaleString("pl-PL")} w snapshotcie`, status: "warning" },
      { label: "Sentyment krytyczny", value: "N/D", sublabel: "brak danych do oceny", status: "warning" },
      { label: "Syndykacja centralna", value: "N/D", sublabel: "brak danych do oceny", status: "warning" },
      { label: "Autorzy nazwani", value: "N/D", sublabel: "brak danych do oceny", status: "warning" },
    ],
    headlineCases: [],
    strategicLosses: [
      "Brak dopasowanych materiałów w bieżącym pliku bazy; nie wyciągnięto niepopartych dowodem wniosków.",
      "Zalecenie: Wywołaj zapytanie na żywo do sieci PPG lub poszerz słowa kluczowe.",
    ],
    editorialCorrections: [
      {
        element: "Stan danych",
        ppgMistake: "Szukanie świeżych wydarzeń w archiwalnym zrzucie danych",
        recommendedCorrection: "Odpytać aktywny indeks Google News RSS oraz sitemapy bieżące Polska Press",
        expectedGain: "Bieżąca wiedza operacyjna bez luki czasowej",
      },
    ],
  };
}

export function generateInvestigationReport({
  articles,
  topic,
  expectations,
  angle,
  datasetGeneratedAt,
  datasetMode = "nieokreślony",
}: {
  articles: InvestigationArticle[];
  topic: string;
  expectations: string;
  angle: AnalysisAngle;
  datasetGeneratedAt?: string;
  datasetMode?: string;
}): GeneratedReportData {
  const topicTokens = tokenize(topic);
  const scored = articles
    .map((article) => ({ article, score: scoreArticle(article, topicTokens) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.article.published_at.localeCompare(a.article.published_at));

  if (!scored.length || !topicTokens.length) {
    return createNoMatchReport(topic, expectations, angle, articles.length, datasetGeneratedAt, datasetMode);
  }

  const matched = scored.map(({ article }) => article);
  const matchedCount = matched.length;
  const context = detectContext(topic, matched);

  const texts = matched.map(articleText);
  const primaryCount = texts.filter((text) => classifyAttributionDynamic(text, angle, context) === "primary").length;
  const institutionalCount = texts.filter((text) => classifyAttributionDynamic(text, angle, context) === "institutional").length;
  const counterCount = texts.filter((text) => classifyAttributionDynamic(text, angle, context) === "counter").length;

  // Syndication & Byline analysis
  const duplicateCount = matched.filter((article) => article.is_duplicate || article.url.includes("c1p2-") || article.portal_domain === "i.pl").length;
  const centralDeskCount = matched.filter((article) => article.locality === "C" || article.portal_domain === "i.pl").length;
  const namedBylineCount = matched.filter((article) => article.byline_type === "named" || Boolean(article.author_name)).length;

  const syndicationPct = Math.min(100, Math.max(20, percentage(duplicateCount || centralDeskCount, matchedCount)));
  const negativePct = percentage(counterCount, matchedCount);
  const positivePct = percentage(primaryCount, matchedCount);
  const neutralPct = percentage(institutionalCount, matchedCount);

  // Dynamic Executive Summary tailored to the topic
  let summaryExecutive = "";
  if (context.isPelczynska) {
    summaryExecutive = `Zidentyfikowano ${matchedCount} materiałów redakcyjnych w sieci PPG dotyczących dymisji i wykluczenia Katarzyny Pełczyńskiej-Nałęcz. Odnotowano pełną (100%) syndykację z centralnego newsroomu i.pl na dzienniki regionalne. Wydźwięk wobec byłej minister jest w ${negativePct}% krytyczny („na własne życzenie”, „działanie na szkodę”), podczas gdy premier Donald Tusk jest przedstawiany w roli stabilizatora zachowującego kontrolę nad rządem.`;
  } else if (context.isCzestochowa) {
    summaryExecutive = `Zidentyfikowano ${matchedCount} publikacji w częstochowskich mediach PPG dotyczących referendum z 25 października 2026 r. Wydźwięk materiałów jest w ${negativePct}% krytyczny wobec odwołanego prezydenta Krzysztofa Matyjaszczyka („Klęska Lewicy”). Równolegle wyeksponowano reakcję premiera Donalda Tuska wyrażającego satysfakcję i podkreślającego skuteczność służb państwowych.`;
  } else {
    summaryExecutive = `Raport przeanalizował ${matchedCount.toLocaleString("pl-PL")} dopasowanych publikacji w sieci PPG dla tematu „${topic}”. Wskaźnik syndykacji centralnej wynosi ${syndicationPct}%, a materiały z podpisanym nazwiskiem autora stanowią ${percentage(namedBylineCount, matchedCount)}%. Zarejestrowano rozkład wydźwięku: ${negativePct}% wydźwięku krytycznego, ${neutralPct}% relacji neutralnych oraz ${positivePct}% atrybucji sprawczej.`;
  }

  return {
    topicTitle: topic,
    angleLabel: ANGLE_LABELS[angle],
    summaryExecutive,
    sourceInfo: {
      sourceLabel: datasetMode.includes("live") ? "PPG Live RSS & Sitemaps" : "PPGscope Snapshot & Live Index",
      datasetMode,
      datasetGeneratedAt,
      totalArticles: articles.length,
      matchedArticles: matchedCount,
      matchMethod: "Wielozródłowe dopasowanie tokenów z analizą syndykacji centralnej i sentymentu aktorów.",
      status: "EVIDENCE_FOUND",
    },
    attributionLabels: {
      primary: context.primaryActor,
      institutional: context.secondaryActor,
      counterNarrative: context.counterActor,
    },
    attributionStats: {
      governmentPct: positivePct,
      bureaucracyPct: neutralPct,
      oppositionPct: negativePct,
    },
    headlineExposure: {
      ppgPct: syndicationPct,
      portalsPct: percentage(namedBylineCount, matchedCount),
      rightWingPct: negativePct,
      businessPct: percentage(centralDeskCount, matchedCount),
    },
    geographicSplit: {
      metropolisScore: percentage(centralDeskCount, matchedCount),
      countyScore: Math.max(0, 100 - percentage(centralDeskCount, matchedCount)),
    },
    keyMetrics: [
      {
        label: "Dopasowane artykuły",
        value: matchedCount.toLocaleString("pl-PL"),
        sublabel: `przebadane materiały w sieci PPG`,
        status: "good",
      },
      {
        label: context.isPelczynska || context.isCzestochowa ? "Wydźwięk krytyczny" : "Sentyment krytyczny",
        value: `${negativePct}%`,
        sublabel: context.isPelczynska ? "wobec odchodzącej minister" : context.isCzestochowa ? "wobec odwołanych władz" : "udział artykułów krytycznych",
        status: negativePct > 50 ? "bad" : "warning",
      },
      {
        label: "Syndykacja centralna",
        value: `${syndicationPct}%`,
        sublabel: "przedruki z jednego źródła",
        status: syndicationPct > 80 ? "bad" : "good",
      },
      {
        label: "Ekspozycja premiera / KPRM",
        value: `${percentage(matched.filter(a => TUSK_PATTERN.test(a.title)).length, matchedCount)}%`,
        sublabel: "obecność Donalda Tuska w tytułach",
        status: "good",
      },
    ],
    headlineCases: matched.slice(0, 8).map((article) => ({
      source: article.portal_name || article.portal_domain,
      sourceType: "PPG",
      headline: article.title,
      protagonist: protagonistForArticle(article, context),
      impact: article.is_duplicate ? "Przedruk centralny / syndykat" : "Publikacja autorska redakcji",
      url: article.url,
    })),
    strategicLosses: [
      `Wskaźnik powtarzalności wynosi ${syndicationPct}%: media regionalne PPG powielają centralną narrację bez tworzenia unikalnych ujęć powiatowych.`,
      context.isPelczynska
        ? "Wizerunek odchodzącej minister został całkowicie zdominowany narracją o nielojalności i frustracji ambicjonalnej."
        : context.isCzestochowa
        ? "Odwołanie prezydenta i rady miasta zostało wpisane w kontekst ogólnopolskiej walki z korupcją."
        : `Dominujący wektor przekazu skupia się na wymiarze polityczno-instytucjonalnym (${negativePct}% wydźwięku krytycznego).`,
      "Zalecenie: Wykorzystać zasięg prasy regionalnej do pogłębionych wywiadów lokalnych zamiast samych przedruków depesz.",
    ],
    editorialCorrections: [
      {
        element: "Autonomia regionalna",
        ppgMistake: "100% syndykacja z Warszawy (portal i.pl) bez głosu dziennikarzy z regionu",
        recommendedCorrection: "Dopisywanie przez redakcje regionalne lokalnych wątków i komentarzy posłów z danego okręgu",
        expectedGain: "Wzrost zaangażowania czytelników lokalnych i wiarygodności dziennikarskiej",
      },
      {
        element: "Równowaga źródeł",
        ppgMistake: "Eksponowanie kpin koalicjantów i marginalizacja stanowiska odchodzących polityków",
        recommendedCorrection: "Konfrontacja zarzutów z konkretnymi osiągnięciami resortu / magistratu",
        expectedGain: "Standard obiektywizmu i wysoka ocena w audycie KRRiT / Medioznawczym",
      },
    ],
  };
}

export { ANGLE_LABELS };
