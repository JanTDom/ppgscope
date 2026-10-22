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
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function tokenMatchesWord(token: string, word: string): boolean {
  if (token === word) return true;
  if (token.length < 5 || word.length < 5) return false;
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
  const requiredHits = topicTokens.length >= 3 ? 2 : 1;
  const totalHits = titleHits + leadHits + metadataHits;

  // Metadata may help rank a candidate, but it cannot create evidence by itself.
  // This prevents a broad taxonomy label such as "dzieci" from matching an
  // unrelated query about "dzieciństwo".
  if (titleHits + leadHits === 0 || (titleHits + leadHits < requiredHits && totalHits < requiredHits + 1)) return 0;
  return titleHits * 3 + leadHits * 2 + metadataHits;
}

function percentage(value: number, total: number): number {
  return total ? Math.round((value / total) * 100) : 0;
}

function formatEvidenceValue(value: number, hasEvidence: boolean, suffix = "%"): string {
  return hasEvidence ? `${value}${suffix}` : "N/D";
}

function classifyAttribution(text: string, angle: AnalysisAngle): "primary" | "institutional" | "counter" {
  const tusk = TUSK_PATTERN.test(text);
  const government = GOVERNMENT_PATTERN.test(text);
  const institution = INSTITUTION_PATTERN.test(text);
  const counter = COUNTER_PATTERN.test(text);

  if ((angle === "TUSK_PROMOTION" && tusk) || (angle !== "TUSK_PROMOTION" && (tusk || government))) return "primary";
  if (counter) return "counter";
  if (institution || government) return "institutional";
  return "institutional";
}

function protagonistFor(article: InvestigationArticle): string {
  const text = articleText(article);
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
    summaryExecutive: `Nie znaleziono w aktualnym zbiorze PPGscope artykułów dopasowanych do tematu „${topic}”. Raport nie przypisuje więc zasługi Donaldowi Tuskowi, rządowi ani instytucjom: przy tym stanie danych nie ma podstaw do wyliczenia atrybucji, ekspozycji nagłówkowej ani strat wizerunkowych. Brief użytkownika został zachowany jako kryterium analizy: „${expectations || "brak dodatkowego briefu"}”.`,
    sourceInfo: {
      sourceLabel: "dashboard.json / recent_articles",
      datasetMode,
      datasetGeneratedAt,
      totalArticles,
      matchedArticles: 0,
      matchMethod: "Dopasowanie tokenów tematu do tytułu, leadu i metadanych artykułu; bez dopasowania nie wykonywano ekstrapolacji.",
      status: "NO_MATCHES",
    },
    attributionLabels: {
      primary: angle === "TUSK_PROMOTION" ? "Donald Tusk" : "Rząd / Donald Tusk",
      institutional: "Instytucje / procedury",
      counterNarrative: "Krytyka / kontrnarracja",
    },
    attributionStats: { governmentPct: 0, bureaucracyPct: 0, oppositionPct: 0 },
    headlineExposure: { ppgPct: 0, portalsPct: 0, rightWingPct: 0, businessPct: 0 },
    geographicSplit: { metropolisScore: 0, countyScore: 0 },
    keyMetrics: [
      { label: "Dopasowane artykuły", value: "0", sublabel: `z ${totalArticles.toLocaleString("pl-PL")} w snapshotcie`, status: "warning" },
      { label: "Donald Tusk w nagłówkach", value: "N/D", sublabel: "brak materiału do oceny", status: "warning" },
      { label: "Autorzy nazwani", value: "N/D", sublabel: "brak materiału do oceny", status: "warning" },
      { label: "Powtarzalność treści", value: "N/D", sublabel: "brak materiału do oceny", status: "warning" },
    ],
    headlineCases: [],
    strategicLosses: [
      "Nie wyciągnięto wniosku o skuteczności komunikacji: brak dopasowanych materiałów nie jest dowodem porażki ani sukcesu.",
      "Do wykonania: podłączyć źródła obejmujące to wydarzenie albo zmienić temat na taki, który występuje w aktualnym zbiorze.",
    ],
    editorialCorrections: [
      {
        element: "Zakres dowodowy",
        ppgMistake: "Prezentowanie stałych procentów mimo braku dopasowanych artykułów",
        recommendedCorrection: "Najpierw pozyskać i zarchiwizować artykuły dotyczące wydarzenia, potem policzyć atrybucję Donalda Tuska i rządu",
        expectedGain: "Rozdzielenie danych od hipotezy i audytowalny raport",
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
  const texts = matched.map(articleText);
  const primaryCount = texts.filter((text) => classifyAttribution(text, angle) === "primary").length;
  const institutionalCount = texts.filter((text) => classifyAttribution(text, angle) === "institutional").length;
  const counterCount = texts.filter((text) => classifyAttribution(text, angle) === "counter").length;
  const tuskHeadlineCount = matched.filter((article) => TUSK_PATTERN.test(article.title)).length;
  const governmentHeadlineCount = matched.filter((article) => GOVERNMENT_PATTERN.test(article.title)).length;
  const institutionalHeadlineCount = matched.filter((article) => INSTITUTION_PATTERN.test(article.title)).length;
  const namedBylineCount = matched.filter((article) => article.byline_type === "named").length;
  const duplicateCount = matched.filter((article) => article.is_duplicate).length;
  const centralCount = matched.filter((article) => article.locality === "C").length;
  const localCount = matched.filter((article) => article.locality === "L" || article.locality === "CL").length;
  const matchedCount = matched.length;
  const primaryLabel = angle === "TUSK_PROMOTION" ? "Donald Tusk" : "Rząd / Donald Tusk";
  const summarySubject = angle === "TUSK_PROMOTION" ? "osobistej ekspozycji Donalda Tuska" : "sprawczości rządu";

  return {
    topicTitle: topic,
    angleLabel: ANGLE_LABELS[angle],
    summaryExecutive: `Raport przeanalizował ${matchedCount.toLocaleString("pl-PL")} dopasowanych materiałów z ${articles.length.toLocaleString("pl-PL")} artykułów w snapshotcie PPGscope. W ramach kąta „${summarySubject}” Donald Tusk pojawia się w ${percentage(tuskHeadlineCount, matchedCount)}% nagłówków, a nazwani autorzy występują w ${percentage(namedBylineCount, matchedCount)}% materiałów. Są to wskaźniki obecności w znalezionym zbiorze, nie pomiar społecznej wdzięczności ani dowód skuteczności komunikacji.`,
    sourceInfo: {
      sourceLabel: "dashboard.json / recent_articles",
      datasetMode,
      datasetGeneratedAt,
      totalArticles: articles.length,
      matchedArticles: matchedCount,
      matchMethod: "Dopasowanie tokenów tematu do tytułu, leadu i metadanych artykułu; artykuły posortowano według siły dopasowania.",
      status: "EVIDENCE_FOUND",
    },
    attributionLabels: { primary: primaryLabel, institutional: "Instytucje / procedury", counterNarrative: "Krytyka / kontrnarracja" },
    attributionStats: {
      governmentPct: percentage(primaryCount, matchedCount),
      bureaucracyPct: percentage(institutionalCount, matchedCount),
      oppositionPct: percentage(counterCount, matchedCount),
    },
    headlineExposure: {
      ppgPct: percentage(tuskHeadlineCount, matchedCount),
      portalsPct: percentage(governmentHeadlineCount, matchedCount),
      rightWingPct: percentage(institutionalHeadlineCount, matchedCount),
      businessPct: percentage(namedBylineCount, matchedCount),
    },
    geographicSplit: { metropolisScore: percentage(centralCount, matchedCount), countyScore: percentage(localCount, matchedCount) },
    keyMetrics: [
      { label: "Dopasowane artykuły", value: matchedCount.toLocaleString("pl-PL"), sublabel: `z ${articles.length.toLocaleString("pl-PL")} w snapshotcie`, status: "good" },
      { label: "Donald Tusk w nagłówkach", value: formatEvidenceValue(percentage(tuskHeadlineCount, matchedCount), true), sublabel: "obecność literalnego nazwiska", status: tuskHeadlineCount ? "good" : "warning" },
      { label: "Autorzy nazwani", value: formatEvidenceValue(percentage(namedBylineCount, matchedCount), true), sublabel: "materiały z byline_type = named", status: namedBylineCount ? "good" : "warning" },
      { label: "Powtarzalność treści", value: formatEvidenceValue(percentage(duplicateCount, matchedCount), true), sublabel: "is_duplicate w dopasowanym zbiorze", status: duplicateCount ? "warning" : "good" },
    ],
    headlineCases: matched.slice(0, 8).map((article) => ({
      source: article.portal_name,
      sourceType: "PPG",
      headline: article.title,
      protagonist: protagonistFor(article),
      impact: article.is_duplicate ? "Powtórzenie oznaczone w źródle" : "Materiał dopasowany do tematu",
      url: article.url,
    })),
    strategicLosses: [
      `${percentage(tuskHeadlineCount, matchedCount)}% dopasowanych nagłówków zawiera nazwisko Donalda Tuska; to pomiar ekspozycji, nie ocena intencji redakcji.`,
      `${percentage(duplicateCount, matchedCount)}% dopasowanych materiałów ma oznaczenie duplikatu w danych źródłowych.`,
      "Wnioski o promocji działań można rozszerzyć dopiero po dołączeniu treści, dat i źródeł spoza tego snapshotu.",
    ],
    editorialCorrections: [
      {
        element: "Nagłówek",
        ppgMistake: "Brak jawnej atrybucji w materiale, jeśli nazwisko aktora nie występuje w tytule",
        recommendedCorrection: `Jeśli źródło potwierdza autorstwo decyzji, nazwać je wprost: „Donald Tusk ${topic.toLowerCase()}”`,
        expectedGain: "Mierzalna ekspozycja aktora bez dopisywania niepotwierdzonych zasług",
      },
      {
        element: "Metoda",
        ppgMistake: "Traktowanie korelacji słów w nagłówku jako dowodu wpływu wizerunkowego",
        recommendedCorrection: "Pokazać tytuł, URL, datę i regułę dopasowania obok każdej agregacji",
        expectedGain: "Możliwość audytu i rozdzielenie faktu od interpretacji",
      },
    ],
  };
}

export { ANGLE_LABELS };
