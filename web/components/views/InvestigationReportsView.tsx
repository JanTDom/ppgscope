"use client";

import React, { useState } from "react";
import { generateInvestigationReport, type InvestigationArticle } from "@/lib/investigation-report";
import {
  FileSearch,
  Sparkles,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  RefreshCw,
  Scale,
  Newspaper,
  CheckCircle2,
  XCircle,
  Download,
  Radio,
  ExternalLink,
} from "lucide-react";

export type AnalysisAngle =
  | "GOVERNMENT_PROMOTION"
  | "TUSK_PROMOTION"
  | "DEPOLITICIZATION_SEO"
  | "ATTACK_RESISTANCE"
  | "LOCAL_VS_SYNDICATE";

export interface InvestigationPreset {
  id: string;
  topic: string;
  angle: AnalysisAngle;
  description: string;
  userExpectations: string;
  tag: string;
}

export interface GeneratedReportData {
  topicTitle: string;
  angleLabel: string;
  summaryExecutive: string;
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
    url?: string;
  }[];
  strategicLosses: string[];
  editorialCorrections: {
    element: string;
    ppgMistake: string;
    recommendedCorrection: string;
    expectedGain: string;
  }[];
  sourceInfo?: {
    sourceLabel: string;
    datasetMode: string;
    datasetGeneratedAt?: string;
    totalArticles: number;
    matchedArticles: number;
    matchMethod: string;
    status: "EVIDENCE_FOUND" | "NO_MATCHES";
  };
  attributionLabels?: {
    primary: string;
    institutional: string;
    counterNarrative: string;
  };
}

const ANALYSIS_ANGLE_GROUPS: Array<{
  label: string;
  options: Array<{ id: AnalysisAngle; label: string; desc: string }>;
}> = [
  {
    label: "Atrybucja sprawczości",
    options: [
      { id: "GOVERNMENT_PROMOTION", label: "Promocja sprawczości rządu", desc: "Czy przypisano sukces autorom, czy nastąpiła ucieczka w procedury?" },
      { id: "TUSK_PROMOTION", label: "Promocja sprawczości Donalda Tuska", desc: "Czy materiały pokazują, co konkretnie premier zrobił lub zdecydował?" },
    ],
  },
  {
    label: "Strategia narracyjna",
    options: [
      { id: "DEPOLITICIZATION_SEO", label: "Ucieczka w poradnictwo SEO", desc: "Czy temat sprowadzono do suchego poradnika pod algorytm Google?" },
      { id: "ATTACK_RESISTANCE", label: "Odporność na ataki opozycji", desc: "Czy media objaśniły wątpliwości, czy powieliły krytykę?" },
      { id: "LOCAL_VS_SYNDICATE", label: "Lokalność vs centralny wsad", desc: "Czy redakcje lokalne pisały same, czy powieliły depeszę z Warszawy?" },
    ],
  },
];

const PRESETS: InvestigationPreset[] = [
  {
    id: "pelczynska_resignation",
    topic: "Katarzyna Pełczyńska-Nałęcz – dymisja z rządu i wykluczenie z partii",
    angle: "GOVERNMENT_PROMOTION",
    description: "Audyt relacjonowania odejścia minister, zarzutów o nielojalność i 100% syndykacji z centrali i.pl.",
    userExpectations: "Zbadaj, jak media PPG relacjonowały dymisję minister funduszy. Sprawdź proporcje krytyki wobec odchodzącej minister do ochrony wizerunku premiera Donalda Tuska oraz stopień syndykacji z i.pl na dzienniki regionalne.",
    tag: "PAŹDZIERNIK 2026",
  },
  {
    id: "czestochowa_referendum",
    topic: "Referendum w Częstochowie – odwołanie prezydenta i rady miasta",
    angle: "LOCAL_VS_SYNDICATE",
    description: "Analiza odwołania Krzysztofa Matyjaszczyka: 'Klęska Lewicy', korupcja i reakcja Donalda Tuska.",
    userExpectations: "Przeanalizuj relacje oddziału częstochowskiego PPG (Dziennik Zachodni / NaszeMiasto). Sprawdź zarzuty korupcyjne i satysfakcję premiera.",
    tag: "LOKALNE 25.10",
  },
  {
    id: "flood_relief_accountability",
    topic: "Odbudowa po powodzi i pomoc dla poszkodowanych na Dolnym Śląsku",
    angle: "ATTACK_RESISTANCE",
    description: "Analiza obrony działań rządu przed zarzutami o opieszałość wypłat zasiłków.",
    userExpectations: "Sprawdź, czy lokalne portale PPG na Dolnym Śląsku i Opolszczyźnie rzetelnie relacjonują wypłaty zasiłków, czy powielają zarzuty o chaosie.",
    tag: "POLSKA LOKALNA",
  },
  {
    id: "eight_hundred_plus",
    topic: "800 plus – jeden wniosek na całe dzieciństwo",
    angle: "DEPOLITICIZATION_SEO",
    description: "Audyt odpolitycznienia reformy deregulacyjnej rządu w mediach regionalnych.",
    userExpectations: "Zbadaj, czy dzienniki regionalne przypisują zasługę premierowi, czy uciekają w bezosobowy poradnik ZUS-u.",
    tag: "REFORMA RZĄDU",
  },
];

export function InvestigationReportsView({
  articles,
  datasetGeneratedAt,
  datasetMode = "synthetic_fixture",
}: {
  articles: InvestigationArticle[];
  datasetGeneratedAt?: string;
  datasetMode?: string;
}) {
  const [topicQuery, setTopicQuery] = useState(PRESETS[0].topic);
  const [selectedAngle, setSelectedAngle] = useState<AnalysisAngle>("GOVERNMENT_PROMOTION");
  const [userExpectations, setUserExpectations] = useState(PRESETS[0].userExpectations);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("pelczynska_resignation");
  const [activeReport, setActiveReport] = useState<GeneratedReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingDoc, setIsExportingDoc] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [liveIndexHit, setLiveIndexHit] = useState<number | null>(null);

  const selectedAngleOption = ANALYSIS_ANGLE_GROUPS.flatMap((group) => group.options).find((option) => option.id === selectedAngle);

  const handleSelectPreset = (preset: InvestigationPreset) => {
    setSelectedPresetId(preset.id);
    setTopicQuery(preset.topic);
    setSelectedAngle(preset.angle);
    setUserExpectations(preset.userExpectations);
    setActiveReport(null);
    setLiveIndexHit(null);
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setLiveIndexHit(null);

    try {
      const resp = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicQuery.trim(),
          expectations: userExpectations.trim(),
          angle: selectedAngle,
          clientArticles: articles,
        }),
      });

      if (resp.ok) {
        const result = await resp.json();
        if (result.ok && result.report) {
          setActiveReport(result.report);
          setLiveIndexHit(result.liveFound || 0);
          setIsGenerating(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Live API fetch failed, falling back to local dataset:", e);
    }

    // Graceful fallback to client-side analyzer
    const generated = generateInvestigationReport({
      articles,
      topic: topicQuery.trim(),
      expectations: userExpectations.trim(),
      angle: selectedAngle,
      datasetGeneratedAt,
      datasetMode,
    });
    setActiveReport(generated);
    setIsGenerating(false);
  };

  const handleExportWordDoc = async () => {
    if (!activeReport) return;
    setIsExportingDoc(true);

    try {
      const resp = await fetch("/api/reports/export-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeReport),
      });

      if (resp.ok) {
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const safeSlug = activeReport.topicTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .slice(0, 30);
        a.download = `Raport_PPGscope_${safeSlug}.doc`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert("Nie udało się wyeksportować raportu.");
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Błąd podczas pobierania pliku Word.");
    } finally {
      setIsExportingDoc(false);
    }
  };

  const handleCopySummary = () => {
    if (!activeReport) return;
    if (!navigator.clipboard) return;
    const textToCopy = `RAPORT PPGSCOPE: ${activeReport.topicTitle}\nKąt analizy: ${activeReport.angleLabel}\n\nSYNTEZA DLA DECYDENTÓW:\n${activeReport.summaryExecutive}\n\nKLUCZOWE WSKAŹNIKI:\n${activeReport.keyMetrics.map((m) => `• ${m.label}: ${m.value} (${m.sublabel})`).join("\n")}\n\nSTRATY WIZERUNKOWE:\n${activeReport.strategicLosses.map((l) => `- ${l}`).join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-8 ppg-report-studio">
      {/* NAGŁÓWEK GŁÓWNY */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 md:p-8 space-y-3 relative overflow-hidden print:border-none print:p-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono tracking-wider text-teal-400 uppercase font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              Dynamic Investigation & Media Intelligence Studio
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Studio Raportów Śledczych i Wizerunkowych
            </h1>
            <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Zadaj dowolny temat, polityka lub wydarzenie. Silnik automatycznie przeszukuje bazę archiwalną oraz aktualny indeks na żywo (Google News RSS & Sitemaps PPG), analizując wydźwięk, wskaźnik syndykacji i ekspozycję decydentów.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {activeReport && (
              <button
                onClick={handleExportWordDoc}
                disabled={isExportingDoc}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {isExportingDoc ? "Generowanie .doc..." : "Pobierz raport w Word (.doc)"}
              </button>
            )}
            <button
              onClick={handlePrintPdf}
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Drukuj / Zapisz PDF
            </button>
          </div>
        </div>
      </div>

      {/* PANEL 1: KREATOR ZAPYTAŃ I OCZEKIWAŃ (UKRYWANY PRZY DRUKU) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/80 p-6 space-y-6 print:hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">Formułowanie pytań, tematów i kryteriów audytu</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>Indeks na żywo + Archiwum PPG</span>
          </div>
        </div>

        {/* PRESETY NA SZYBKI START */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
            Rekomendowane tematy śledcze i wydarzenia polityczne:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer space-y-1.5 flex flex-col justify-between ${
                  selectedPresetId === p.id
                    ? "border-teal-500/60 bg-teal-500/10 text-white shadow-md shadow-teal-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-teal-400">{p.tag}</span>
                    {selectedPresetId === p.id && <Check className="h-3.5 w-3.5 text-teal-400" />}
                  </div>
                  <span className="text-xs font-bold text-white block">{p.topic}</span>
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* FORMULARZ ZAPYTANIA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* KOLUMNA 1: TEMAT I SŁOWA KLUCZOWE */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between font-mono">
              <span>1. TEMAT BADANIA / DOWOLNE ZAPYTANIE:</span>
              <span className="text-teal-400 text-[11px]">Wyszukuje w czasie rzeczywistym</span>
            </label>
            <input
              type="text"
              value={topicQuery}
              onChange={(e) => {
                setTopicQuery(e.target.value);
                setSelectedPresetId("");
                setActiveReport(null);
              }}
              placeholder="np. 'Katarzyna Pełczyńska-Nałęcz', 'Referendum w Częstochowie', 'CPK', 'Ceny energii'..."
              className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-[#07080a] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
            />

            {/* OCZEKIWANIA I KRYTERIA */}
            <div className="pt-3 space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 font-mono">
                <span>3. TWOJE OCZEKIWANIA I KRYTERIA OCENY (PROMPT / BRIEF):</span>
              </label>
              <textarea
                rows={3}
                value={userExpectations}
                onChange={(e) => {
                  setUserExpectations(e.target.value);
                  setActiveReport(null);
                }}
                placeholder="Napisz, co konkretnie ma sprawdzić raport (np. czy media PPG przypisują zasługę premierowi, jaki jest wydźwięk wobec opozycji, czy redakcje regionalne pisały autorskie teksty)..."
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.1] bg-[#07080a] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 transition resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* KOLUMNA 2: KĄT ANALITYCZNY I AKCJA */}
          <div className="ppg-report-angle-column space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 font-mono">
                <span>2. GŁÓWNY KĄT ANALITYCZNY:</span>
              </label>
              <div className="space-y-2">
                {ANALYSIS_ANGLE_GROUPS.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <p className="ppg-report-angle-group-label">{group.label}</p>
                    {group.options.map((angle) => (
                      <button
                        key={angle.id}
                        type="button"
                        aria-pressed={selectedAngle === angle.id}
                        onClick={() => {
                          setSelectedAngle(angle.id);
                          setActiveReport(null);
                        }}
                        className={`w-full rounded-xl border p-2.5 text-left transition cursor-pointer ${
                          selectedAngle === angle.id
                            ? "border-teal-500/70 bg-teal-500/10 text-white"
                            : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="text-xs font-semibold text-zinc-200">{angle.label}</div>
                        <div className="text-[10px] leading-4 text-zinc-500">{angle.desc}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-teal-500/20 bg-teal-500/[0.06] p-3">
              <span className="ppg-report-selection-label">Wybrany kąt</span>
              <p className="mt-1 text-sm font-semibold text-teal-100">{selectedAngleOption?.label || "Wybierz kąt analityczny"}</p>
              <p className="mt-1 text-[11px] leading-4 text-teal-100/65">Raport oceni materiały pod kątem tej konkretnej tezy i zweryfikuje faktyczną treść nagłówków.</p>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || !topicQuery.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-black" />
                  Przeszukiwanie bazy i indeksu na żywo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-black" />
                  Generuj raport analityczny
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL 2: WYNIK RAPORTU (PRINTABLE REPORT CONTAINER) */}
      {/* ========================================================================= */}
      {activeReport ? (
        <div className="space-y-6 bg-[#07080a] text-zinc-100 print:bg-white print:text-black">
          {/* REPORT HEADER BAR */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 space-y-4 print:border-b-2 print:border-black print:rounded-none print:p-0 print:pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-teal-500/20 border border-teal-500/40 text-teal-400 text-[10px] font-mono font-bold uppercase print:text-black print:border-black">
                    RAPORT ANALITYCZNY PPGSCOPE
                  </span>
                  {liveIndexHit !== null && liveIndexHit > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold">
                      +{liveIndexHit} świeżych materiałów na żywo
                    </span>
                  )}
                  <span className="text-xs text-zinc-400 font-mono">
                    {activeReport.sourceInfo?.datasetGeneratedAt ? new Date(activeReport.sourceInfo.datasetGeneratedAt).toLocaleString("pl-PL") : "bieżące"}
                  </span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mt-1 print:text-black">
                  {activeReport.topicTitle}
                </h2>
                <p className="text-xs text-teal-400 font-mono mt-0.5 print:text-zinc-700">
                  Kryterium analizy: {activeReport.angleLabel}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button
                  onClick={handleExportWordDoc}
                  disabled={isExportingDoc}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isExportingDoc ? "Pobieranie..." : "Pobierz Word (.doc)"}
                </button>
                <button
                  onClick={handleCopySummary}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] text-zinc-300 text-xs transition flex items-center gap-1.5"
                >
                  {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
                  {copiedSummary ? "Skopiowano!" : "Kopiuj brief"}
                </button>
                <button
                  onClick={handlePrintPdf}
                  className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" /> Drukuj / PDF
                </button>
              </div>
            </div>

            {/* CALLOUT EXECUTIVE BRIEF */}
            <div className="p-4 rounded-xl border-l-4 border-teal-500 bg-teal-500/10 text-teal-100 text-xs md:text-sm leading-relaxed print:bg-gray-100 print:text-black print:border-black">
              <span className="font-bold text-teal-300 print:text-black block mb-1 uppercase font-mono tracking-wider text-[11px]">
                Synteza analityczna dla decydentów:
              </span>
              {activeReport.summaryExecutive}
            </div>

            {activeReport.sourceInfo && (
              <div
                className={`rounded-xl border p-4 text-xs leading-relaxed ${
                  activeReport.sourceInfo.status === "EVIDENCE_FOUND"
                    ? "border-teal-500/30 bg-teal-500/[0.06] text-teal-100"
                    : "border-amber-500/40 bg-amber-500/[0.06] text-amber-100"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
                  <span className="font-bold">Zakres dowodowy</span>
                  <span className="rounded border border-current px-1.5 py-0.5">
                    {activeReport.sourceInfo.status === "EVIDENCE_FOUND" ? "dowody odnalezione" : "brak dopasowania"}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-zinc-300 sm:grid-cols-2">
                  <span>
                    Źródło: <strong className="text-white">{activeReport.sourceInfo.sourceLabel}</strong>
                  </span>
                  <span>
                    Dopasowane: <strong className="text-white">{activeReport.sourceInfo.matchedArticles.toLocaleString("pl-PL")}</strong> materiałów
                  </span>
                  <span>
                    Tryb silnika: <strong className="text-white">{activeReport.sourceInfo.datasetMode}</strong>
                  </span>
                  <span>
                    Metoda: <strong className="text-white">wyszukiwanie tokenowe + indeks RSS sieci PPG</strong>
                  </span>
                </div>
                <p className="mt-2 text-zinc-400">{activeReport.sourceInfo.matchMethod}</p>
              </div>
            )}
          </div>

          {/* KPI METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeReport.keyMetrics.map((m, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border bg-[#0c0e12]/80 space-y-1 print:border-gray-300 print:bg-white print:text-black ${
                  m.status === "bad"
                    ? "border-rose-500/30 text-rose-300"
                    : m.status === "warning"
                    ? "border-amber-500/30 text-amber-300"
                    : "border-teal-500/30 text-teal-300"
                }`}
              >
                <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">{m.label}</div>
                <div className="text-2xl font-bold text-white print:text-black">{m.value}</div>
                <div className="text-[11px] text-zinc-400">{m.sublabel}</div>
              </div>
            ))}
          </div>

          {/* WYKRESY ANALITYCZNE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WYKRES 1: ROZKŁAD WYDŹWIĘKU I ATRYBUCJI */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/80 space-y-4 print:border-gray-300 print:bg-white">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 print:text-black">
                  <Scale className="h-4 w-4 text-teal-400 print:text-black" />
                  Rozkład wydźwięku i atrybucji podmiotów
                </h3>
                <span className="text-[11px] font-mono text-zinc-500">Udział w treściach PPG</span>
              </div>

              <div className="space-y-3 pt-1">
                <div className="h-7 w-full rounded-lg overflow-hidden flex font-mono text-[10px] font-bold text-white">
                  <div
                    style={{ width: `${Math.max(5, activeReport.attributionStats.governmentPct)}%` }}
                    className="bg-teal-600 flex items-center justify-center print:bg-teal-700 px-1 truncate"
                    title={activeReport.attributionLabels?.primary || "Główny bohater"}
                  >
                    <span className="truncate">{activeReport.attributionStats.governmentPct}% Pozytywny/Sprawczy</span>
                  </div>
                  <div
                    style={{ width: `${Math.max(5, activeReport.attributionStats.bureaucracyPct)}%` }}
                    className="bg-zinc-600 flex items-center justify-center text-white px-1 truncate"
                    title={activeReport.attributionLabels?.institutional || "Instytucje"}
                  >
                    <span className="truncate">{activeReport.attributionStats.bureaucracyPct}% Neutralny</span>
                  </div>
                  <div
                    style={{ width: `${Math.max(5, activeReport.attributionStats.oppositionPct)}%` }}
                    className="bg-rose-600 flex items-center justify-center print:bg-red-700 px-1 truncate"
                    title={activeReport.attributionLabels?.counterNarrative || "Krytyka / oponenci"}
                  >
                    <span className="truncate">{activeReport.attributionStats.oppositionPct}% Krytyczny</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-zinc-400 font-mono pt-1">
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-500 mr-1.5" />
                    {activeReport.attributionLabels?.primary || "Podmiot główny"}: <strong className="text-white print:text-black">{activeReport.attributionStats.governmentPct}%</strong>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-500 mr-1.5" />
                    {activeReport.attributionLabels?.institutional || "Instytucje"}: <strong className="text-amber-400 print:text-black">{activeReport.attributionStats.bureaucracyPct}%</strong>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 mr-1.5" />
                    {activeReport.attributionLabels?.counterNarrative || "Krytyka / atak"}: <strong className="text-rose-400 print:text-black">{activeReport.attributionStats.oppositionPct}%</strong>
                  </div>
                </div>

                <p className="text-xs text-zinc-400 italic pt-1 leading-relaxed">
                  Pomiar odzwierciedla rozkład ładunku emocjonalnego i ramowania (framing) w artykułach zbadanych przez silnik.
                </p>
              </div>
            </div>

            {/* WYKRES 2: SYNDYKACJA I OBECNOŚĆ W NAGŁÓWKACH */}
            <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/80 space-y-4 print:border-gray-300 print:bg-white">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 print:text-black">
                  <Newspaper className="h-4 w-4 text-teal-400 print:text-black" />
                  Struktura redakcyjna: syndykacja i autorstwo
                </h3>
                <span className="text-[11px] font-mono text-zinc-500">Metryki produkcji</span>
              </div>

              <div className="space-y-3 pt-1">
                {[
                  { label: "Wskaźnik syndykacji centralnej (i.pl)", value: activeReport.headlineExposure.ppgPct, color: "bg-amber-500", highlight: true },
                  { label: "Materiały z podpisanym autorem", value: activeReport.headlineExposure.portalsPct, color: "bg-teal-500", highlight: false },
                  { label: "Tytuły o wydźwięku krytycznym", value: activeReport.headlineExposure.rightWingPct, color: "bg-rose-500", highlight: false },
                  { label: "Zasięg w redakcjach lokalnych", value: activeReport.geographicSplit.countyScore, color: "bg-blue-600", highlight: false },
                ].map((row, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={row.highlight ? "font-bold text-amber-300 print:text-black" : "text-zinc-300 print:text-black"}>
                        {row.label}
                      </span>
                      <span className="font-mono font-bold text-white print:text-black">{row.value}%</span>
                    </div>
                    <div className="h-3 w-full bg-white/[0.05] rounded-full overflow-hidden print:bg-gray-200">
                      <div style={{ width: `${row.value}%` }} className={`h-full ${row.color} rounded-full`} />
                    </div>
                  </div>
                ))}

                <p className="text-xs text-zinc-400 italic pt-1 leading-relaxed">
                  Wysoki wskaźnik syndykacji oznacza zastąpienie dziennikarstwa regionalnego mechanicznym powielaniem depesz z centralnego warszawskiego newsroomu.
                </p>
              </div>
            </div>
          </div>

          {/* TABELA: FORENSICS NAGŁÓWKÓW (CASE STUDY) */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/80 p-6 space-y-4 print:border-gray-300 print:bg-white">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 print:text-black">
                <Layers className="h-4 w-4 text-teal-400 print:text-black" />
                Zarejestrowane nagłówki i materiały w sieci PPG
              </h3>
              <span className="text-xs text-zinc-500 font-mono">Dowody źródłowe</span>
            </div>

            <div className="w-full min-w-0 max-w-full overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.1] text-zinc-400 font-mono print:border-black print:text-black">
                    <th className="py-2.5 px-3">Portal / Medium</th>
                    <th className="py-2.5 px-3">Rzeczywisty nagłówek artykułu</th>
                    <th className="py-2.5 px-3">Główny aktor</th>
                    <th className="py-2.5 px-3">Charakter</th>
                    <th className="py-2.5 px-3">Źródło</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] print:divide-gray-300">
                  {activeReport.headlineCases.length ? (
                    activeReport.headlineCases.map((c, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-3 font-semibold text-white print:text-black whitespace-nowrap">
                          {c.source}
                        </td>
                        <td className="py-3 px-3 text-zinc-200 print:text-black font-medium">{c.headline}</td>
                        <td className="py-3 px-3 font-mono text-zinc-400 print:text-black whitespace-nowrap">{c.protagonist}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                              c.impact.toLowerCase().includes("przedruk") || c.impact.toLowerCase().includes("syndykat")
                                ? "bg-amber-500/20 text-amber-300 print:text-black"
                                : "bg-teal-500/20 text-teal-300 print:text-black"
                            }`}
                          >
                            {c.impact}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {c.url ? (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-mono text-[10px]"
                            >
                              Link <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-zinc-600 font-mono text-[10px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 px-3 text-center text-zinc-500">
                        Brak dopasowanych nagłówków w bieżącym zbiorze.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BILANS STRAT I REKOMENDACJE KOREKTY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* STRATY STRATEGICZNE */}
            <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3 print:border-gray-300 print:bg-white">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2 print:text-black">
                <AlertTriangle className="h-4 w-4 text-rose-400 print:text-black" />
                Zdiagnozowane asymetrie i straty wizerunkowe
              </h3>
              <ul className="space-y-2 text-xs text-zinc-300 print:text-black">
                {activeReport.strategicLosses.map((loss, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span>{loss}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* MATRYCA KOREKTY */}
            <div className="p-6 rounded-2xl border border-teal-500/30 bg-teal-500/5 space-y-3 print:border-gray-300 print:bg-white">
              <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2 print:text-black">
                <CheckCircle2 className="h-4 w-4 text-teal-400 print:text-black" />
                Rekomendacje redakcyjne i naprawcze
              </h3>
              <div className="space-y-2.5 text-xs">
                {activeReport.editorialCorrections.map((corr, idx) => (
                  <div key={idx} className="border-b border-white/[0.06] pb-2 last:border-b-0 space-y-1">
                    <div className="font-mono text-[10px] text-teal-400 uppercase font-bold">{corr.element}</div>
                    <div className="text-rose-300 line-through text-[11px] print:text-zinc-600">Błąd PPG: {corr.ppgMistake}</div>
                    <div className="text-white font-medium text-[11px] print:text-black">Korekta: {corr.recommendedCorrection}</div>
                    <div className="text-zinc-400 text-[10px] italic">Oczekiwany efekt: {corr.expectedGain}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STOPKA RAPORTU WIDOKU */}
          <div className="border-t border-white/[0.08] pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 font-mono print:border-black print:text-black">
            <div>System PPGscope · Silnik raportowy z aktywnym indeksem na żywo</div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleExportWordDoc}
                disabled={isExportingDoc}
                className="hover:text-blue-400 underline cursor-pointer print:hidden flex items-center gap-1 text-blue-400"
              >
                <Download className="h-3 w-3" /> Pobierz jako Word (.doc)
              </button>
              <button onClick={handlePrintPdf} className="hover:text-teal-400 underline cursor-pointer print:hidden">
                Drukuj do PDF
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-teal-500/30 bg-teal-500/[0.04] p-8 text-center text-zinc-300">
          <FileSearch className="mx-auto h-8 w-8 text-teal-400" />
          <h2 className="mt-3 text-lg font-semibold text-white">Wybierz temat lub wpisz własne zapytanie i wygeneruj raport</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            System przeszuka natychmiast bazę snapshotu oraz pobierze na żywo najświeższe artykuły z kanałów RSS i sitemap Polska Press Grupa. Wygenerowany raport możesz pobrać w formacie Word (.doc) lub wydrukować do PDF.
          </p>
          <p className="mt-3 text-xs font-mono text-zinc-500">Dostępnych w lokalnym indeksie: {articles.length.toLocaleString("pl-PL")} artykułów</p>
        </div>
      )}
    </div>
  );
}
