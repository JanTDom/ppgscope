"use client";

import React, { useState, useMemo } from "react";
import {
  Scale,
  Building2,
  Compass,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Shield,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Award,
  Zap,
  Info,
  Radio,
  FileText
} from "lucide-react";

interface MediaEntity {
  name: string;
  domain: string;
  type: string;
  ownership: string;
  business_model: string;
  hyperlocal_pct: number;
  watchdog_pct: number;
  festynoza_pct: number;
  byline_pct: number;
  est_monthly_reach: string;
  editorial_staff_est: string;
}

interface FrontpageDuel {
  scan_time: string;
  ppg_hero_title: string;
  ppg_hero_category: string;
  ppg_is_syndicated: boolean;
  ppg_origin: string;
  competitor_hero_title: string;
  competitor_hero_category: string;
  competitor_author: string;
  topic_convergence: boolean;
  verdict: string;
}

interface BenchmarkPair {
  pair_id: string;
  city: string;
  region: string;
  voivodeship_code: string;
  tier: "METROPOLITAN" | "COUNTY_SGL";
  ppg_entity: MediaEntity;
  competitor_entity: MediaEntity;
  duel: FrontpageDuel;
  news_desert_risk: "NISKIE" | "UMIARKOWANE" | "WYSOKIE" | "KRYTYCZNE";
  risk_notes: string;
  editorial_takeaway: string;
}

interface BenchmarkData {
  generated_at: string;
  methodology: string;
  sample_size_articles: number;
  summary_metrics: {
    total_pairs_monitored: number;
    metropolitan_pairs_count: number;
    county_sgl_pairs_count: number;
    avg_ppg_hyperlocal_pct: number;
    avg_competitor_hyperlocal_pct: number;
    hyperlocal_gap_pct: number;
    avg_ppg_watchdog_pct: number;
    avg_competitor_watchdog_pct: number;
    watchdog_gap_pct: number;
    avg_ppg_festynoza_pct: number;
    avg_competitor_festynoza_pct: number;
    festynoza_gap_pct: number;
    avg_ppg_byline_pct: number;
    avg_competitor_byline_pct: number;
    ppg_syndicated_duels_pct: number;
    topic_convergence_rate_pct: number;
  };
  pairs: BenchmarkPair[];
  news_desert_summary: {
    critical_risk_regions: string[];
    high_risk_regions: string[];
    safe_well_served_regions: string[];
    key_finding: string;
  };
}

interface LocalBenchmarkViewProps {
  initialData?: BenchmarkData | null;
}

export function LocalBenchmarkView({ initialData }: LocalBenchmarkViewProps) {
  const [data, setData] = useState<BenchmarkData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [activeTab, setActiveTab] = useState<"duel" | "matrix" | "deserts" | "methodology">("duel");
  const [selectedPairId, setSelectedPairId] = useState<string>("pomorskie-gdansk");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<"ALL" | "METROPOLITAN" | "COUNTY_SGL">("ALL");

  // Ładowanie danych z public/data/local_benchmark.json w przypadku braku props
  React.useEffect(() => {
    if (!initialData) {
      fetch("/data/local_benchmark.json")
        .then((res) => {
          if (!res.ok) throw new Error("Błąd pobierania benchmarku");
          return res.json();
        })
        .then((json: BenchmarkData) => {
          setData(json);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Błąd pobierania benchmarku lokalnego:", err);
          setLoading(false);
        });
    }
  }, [initialData]);

  const selectedPair = useMemo(() => {
    if (!data?.pairs) return null;
    return data.pairs.find((p) => p.pair_id === selectedPairId) || data.pairs[0];
  }, [data, selectedPairId]);

  const filteredPairs = useMemo(() => {
    if (!data?.pairs) return [];
    return data.pairs.filter((pair) => {
      const matchesTier = tierFilter === "ALL" || pair.tier === tierFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        pair.city.toLowerCase().includes(q) ||
        pair.region.toLowerCase().includes(q) ||
        pair.ppg_entity.name.toLowerCase().includes(q) ||
        pair.competitor_entity.name.toLowerCase().includes(q) ||
        pair.ppg_entity.domain.toLowerCase().includes(q) ||
        pair.competitor_entity.domain.toLowerCase().includes(q);
      return matchesTier && matchesSearch;
    });
  }, [data, tierFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 text-zinc-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0f4c81] border-t-transparent" />
        <p className="text-sm">Ładowanie audytu porównawczego rynku lokalnego...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-6 text-center text-red-300">
        <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-400" />
        <p className="font-semibold">Brak danych benchmarku rynku lokalnego</p>
        <p className="text-xs text-red-400/80">Upewnij się, że plik local_benchmark.json został wygenerowany.</p>
      </div>
    );
  }

  const { summary_metrics } = data;

  return (
    <div className="space-y-6">
      {/* ===================================================================== */}
      {/* 01 · NAGŁÓWEK EDYTORSKI (KOBALT PRASOWY)                              */}
      {/* ===================================================================== */}
      <div className="border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0f4c81]">
          <span>Analiza rynkowa</span>
          <span>◆</span>
          <span>PPG vs Niezależni wydawcy</span>
          <span>◆</span>
          <span className="font-mono text-zinc-400">N = {data.sample_size_articles.toLocaleString("pl-PL")} artykułów</span>
        </div>
        <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white lg:text-3xl">
          PPG vs rynek lokalny: audyt jakości, kontroli władzy i syndykacji
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Zestawienie parowane 20 kluczowych rynków (16 metropolii wojewódzkich + 4 rynki powiatowe zrzeszone w SGL).
          Empiryczny pomiar czystości lokalnej, dziennikarstwa strażniczego (watchdog), udziału „festynozy” oraz
          pojedynku czołówek na żywo w renderowanym DOM.
        </p>

        {/* PRZEŁĄCZNIK WIDOKÓW */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("duel")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "duel"
                ? "bg-[#0f4c81] text-white shadow-sm"
                : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            Pojedynek czołówek (Slot #1 Duel)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "matrix"
                ? "bg-[#0f4c81] text-white shadow-sm"
                : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            Pełna matryca par (20 rynków)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("deserts")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "deserts"
                ? "bg-[#0f4c81] text-white shadow-sm"
                : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Pustynie informacyjne (News Desert Index)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("methodology")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "methodology"
                ? "bg-[#0f4c81] text-white shadow-sm"
                : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            Metodologia audytu
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 02 · EXECUTIVE KPI BANNER (STANDARD EDYTORSKI #fbf8f5 / CIEPŁY BEŻ)     */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* KARTA 1: CZYSTOŚĆ LOKALNA */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Czystość lokalna (Hyperlocal)</span>
            <span className="font-mono text-[10px] text-zinc-500">ŚREDNIA</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
              {summary_metrics.avg_competitor_hyperlocal_pct}%
            </span>
            <span className="text-xs text-zinc-400">vs</span>
            <span className="font-mono text-xl font-bold text-amber-400 tabular-nums">
              {summary_metrics.avg_ppg_hyperlocal_pct}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            <span>Niezależni: +{summary_metrics.hyperlocal_gap_pct} p.p. tematów z regionu</span>
          </div>
        </div>

        {/* KARTA 2: DZIENNIKARSTWO ŚLEDCZE (WATCHDOG) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Kontrola władzy (Watchdog)</span>
            <span className="font-mono text-[10px] text-zinc-500">ŚREDNIA</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
              {summary_metrics.avg_competitor_watchdog_pct}%
            </span>
            <span className="text-xs text-zinc-400">vs</span>
            <span className="font-mono text-xl font-bold text-red-400 tabular-nums">
              {summary_metrics.avg_ppg_watchdog_pct}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
            <Shield className="h-3 w-3" />
            <span>Niezależni: 2.8x wyższa kontrola samorządu</span>
          </div>
        </div>

        {/* KARTA 3: FESTYNOZA I LIFESTYLE */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>„Festynoza” i lifestyle</span>
            <span className="font-mono text-[10px] text-zinc-500">ŚREDNIA</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-red-400 tabular-nums">
              {summary_metrics.avg_ppg_festynoza_pct}%
            </span>
            <span className="text-xs text-zinc-400">w PPG vs</span>
            <span className="font-mono text-xl font-bold text-zinc-300 tabular-nums">
              {summary_metrics.avg_competitor_festynoza_pct}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-red-400">
            <TrendingUp className="h-3 w-3" />
            <span>PPG: +{summary_metrics.festynoza_gap_pct} p.p. galerii i horoskopów</span>
          </div>
        </div>

        {/* KARTA 4: BYLINES (DZIENNIKARZE Z IMIENIA) */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Podpisani reporterzy (Bylines)</span>
            <span className="font-mono text-[10px] text-zinc-500">ŚREDNIA</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
              {summary_metrics.avg_competitor_byline_pct}%
            </span>
            <span className="text-xs text-zinc-400">vs</span>
            <span className="font-mono text-xl font-bold text-amber-400 tabular-nums">
              {summary_metrics.avg_ppg_byline_pct}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-400">
            <Award className="h-3 w-3 text-emerald-400" />
            <span>PPG w 55% publikuje zanonimizowany desk</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 03 · WIDOK: POJEDYNEK CZOŁÓWEK (SLOT #1 DUEL STUDIO)                  */}
      {/* ===================================================================== */}
      {activeTab === "duel" && selectedPair && (
        <div className="space-y-4">
          {/* SELEKTOR PAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0c0e12]/60 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Compass className="h-4 w-4 text-[#0f4c81]" />
              <span>Wybierz rynek do pojedynku czołówek:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.pairs.map((p) => {
                const isSelected = p.pair_id === selectedPairId;
                return (
                  <button
                    key={p.pair_id}
                    type="button"
                    onClick={() => setSelectedPairId(p.pair_id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-[#0f4c81] text-white shadow"
                        : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {p.city.split(" / ")[0]}
                    {p.tier === "COUNTY_SGL" && <span className="ml-1 text-[9px] text-amber-300">SGL</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* KARTY POJEDYNKU (SPLIT-SCREEN) */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* STRONA LEWA: POLSKA PRESS GRUPA */}
            <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0e12] p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#0f4c81]/30 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
                    POLSKA PRESS
                  </span>
                  <h3 className="font-serif text-lg font-bold text-white">{selectedPair.ppg_entity.name}</h3>
                </div>
                <a
                  href={`https://${selectedPair.ppg_entity.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-xs text-zinc-400 hover:text-white"
                >
                  {selectedPair.ppg_entity.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* JEDYNKA PPG */}
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] text-zinc-400">SLOT #1 · CZOŁÓWKA NA ŻYWO</span>
                  {selectedPair.duel.ppg_is_syndicated ? (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      SYNDYKACJA SIECIOWA
                    </span>
                  ) : (
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      TEMAT WŁASNY REGIONU
                    </span>
                  )}
                </div>
                <p className="mt-2 text-base font-semibold leading-snug text-white">
                  {selectedPair.duel.ppg_hero_title}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                  <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[11px]">
                    Kategoria: <strong className="text-zinc-200">{selectedPair.duel.ppg_hero_category}</strong>
                  </span>
                  <span>Źródło: <strong className="text-zinc-300">{selectedPair.duel.ppg_origin}</strong></span>
                </div>
              </div>

              {/* PARAMETRY REDAKCJI PPG */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/[0.02] p-2">
                  <div className="text-[10px] text-zinc-400">Lokalność</div>
                  <div className="font-mono text-base font-bold text-amber-400 tabular-nums">
                    {selectedPair.ppg_entity.hyperlocal_pct}%
                  </div>
                </div>
                <div className="rounded-lg bg-white/[0.02] p-2">
                  <div className="text-[10px] text-zinc-400">Watchdog</div>
                  <div className="font-mono text-base font-bold text-red-400 tabular-nums">
                    {selectedPair.ppg_entity.watchdog_pct}%
                  </div>
                </div>
                <div className="rounded-lg bg-white/[0.02] p-2">
                  <div className="text-[10px] text-zinc-400">Festynoza</div>
                  <div className="font-mono text-base font-bold text-zinc-300 tabular-nums">
                    {selectedPair.ppg_entity.festynoza_pct}%
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                <span>Model: {selectedPair.ppg_entity.business_model}</span>
                <span>Kadra: {selectedPair.ppg_entity.editorial_staff_est}</span>
              </div>
            </div>

            {/* STRONA PRAWA: NIEZALEŻNY KONKURENT LOKALNY */}
            <div className="relative rounded-2xl border border-emerald-500/20 bg-[#0c0e12] p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                    {selectedPair.competitor_entity.type === "PRINT_SGL"
                      ? "PRASA LOKALNA (SGL)"
                      : "NIEZALEŻNY DIGITAL"}
                  </span>
                  <h3 className="font-serif text-lg font-bold text-white">
                    {selectedPair.competitor_entity.name}
                  </h3>
                </div>
                <a
                  href={`https://${selectedPair.competitor_entity.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-xs text-zinc-400 hover:text-white"
                >
                  {selectedPair.competitor_entity.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* JEDYNKA KONKURENTA */}
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] text-zinc-400">SLOT #1 · CZOŁÓWKA NA ŻYWO</span>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    100% TEMAT MIEJSKI / LOKALNY
                  </span>
                </div>
                <p className="mt-2 text-base font-semibold leading-snug text-white">
                  {selectedPair.duel.competitor_hero_title}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                  <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[11px]">
                    Kategoria: <strong className="text-emerald-300">{selectedPair.duel.competitor_hero_category}</strong>
                  </span>
                  <span>Autor: <strong className="text-zinc-200">{selectedPair.duel.competitor_author}</strong></span>
                </div>
              </div>

              {/* PARAMETRY REDAKCJI KONKURENTA */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/[0.02] p-2">
                  <div className="text-[10px] text-zinc-400">Lokalność</div>
                  <div className="font-mono text-base font-bold text-emerald-400 tabular-nums">
                    {selectedPair.competitor_entity.hyperlocal_pct}%
                  </div>
                </div>
                <div className="rounded-lg bg-white/[0.02] p-2">
                  <div className="text-[10px] text-zinc-400">Watchdog</div>
                  <div className="font-mono text-base font-bold text-emerald-400 tabular-nums">
                    {selectedPair.competitor_entity.watchdog_pct}%
                  </div>
                </div>
                <div className="rounded-lg bg-white/[0.02] p-2">
                  <div className="text-[10px] text-zinc-400">Festynoza</div>
                  <div className="font-mono text-base font-bold text-zinc-300 tabular-nums">
                    {selectedPair.competitor_entity.festynoza_pct}%
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                <span>Model: {selectedPair.competitor_entity.business_model}</span>
                <span>Kadra: {selectedPair.competitor_entity.editorial_staff_est}</span>
              </div>
            </div>
          </div>

          {/* BELKA PODSUMOWANIA POJEDYNKU */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0c0e12] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0f4c81]">
                  <span>Werdykt pojedynku edytorskiego</span>
                  <span>◆</span>
                  <span>{selectedPair.city}</span>
                </div>
                <p className="text-sm font-medium text-white">{selectedPair.duel.verdict}</p>
                <p className="text-xs text-zinc-400">{selectedPair.editorial_takeaway}</p>
              </div>
              <div className="shrink-0 rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-right">
                <div className="text-[10px] uppercase text-zinc-500">Zagrożenie pustynią</div>
                <div className={`font-mono text-xs font-bold ${
                  selectedPair.news_desert_risk === "KRYTYCZNE" ? "text-red-400" :
                  selectedPair.news_desert_risk === "WYSOKIE" ? "text-amber-400" :
                  selectedPair.news_desert_risk === "UMIARKOWANE" ? "text-yellow-400" : "text-emerald-400"
                }`}>
                  {selectedPair.news_desert_risk}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 04 · WIDOK: PEŁNA MATRYCA PAR (20 RYNKÓW)                             */}
      {/* ===================================================================== */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          {/* PASEK FILTROWANIA I WYSZUKIWANIA */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-[#0c0e12]/60 p-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Szukaj miasta, województwa lub medium..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400 mr-1">Kategoria:</span>
              <button
                type="button"
                onClick={() => setTierFilter("ALL")}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  tierFilter === "ALL" ? "bg-[#0f4c81] text-white" : "bg-white/[0.04] text-zinc-400 hover:text-white"
                }`}
              >
                Wszystkie (20)
              </button>
              <button
                type="button"
                onClick={() => setTierFilter("METROPOLITAN")}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  tierFilter === "METROPOLITAN" ? "bg-[#0f4c81] text-white" : "bg-white/[0.04] text-zinc-400 hover:text-white"
                }`}
              >
                Metropolie (16)
              </button>
              <button
                type="button"
                onClick={() => setTierFilter("COUNTY_SGL")}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  tierFilter === "COUNTY_SGL" ? "bg-[#0f4c81] text-white" : "bg-white/[0.04] text-zinc-400 hover:text-white"
                }`}
              >
                Prasa powiatowa SGL (4)
              </button>
            </div>
          </div>

          {/* TABELA PORÓWNAWCZA */}
          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0c0e12]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0f4c81] text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rynek / Miasto</th>
                  <th className="py-3 px-3">Tytuł PPG</th>
                  <th className="py-3 px-3 text-right">Lokalność PPG</th>
                  <th className="py-3 px-3 text-right">Watchdog PPG</th>
                  <th className="py-3 px-3">Rywal lokalny</th>
                  <th className="py-3 px-3 text-right">Lokalność Rywala</th>
                  <th className="py-3 px-3 text-right">Watchdog Rywala</th>
                  <th className="py-3 px-3 text-center">Bylines (PPG vs Rywal)</th>
                  <th className="py-3 px-4 text-center">Ryzyko Pustyni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                {filteredPairs.map((pair) => (
                  <tr key={pair.pair_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{pair.city}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{pair.region}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-zinc-200">{pair.ppg_entity.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{pair.ppg_entity.domain}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-amber-400">
                      {pair.ppg_entity.hyperlocal_pct}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-red-400">
                      {pair.ppg_entity.watchdog_pct}%
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-emerald-300">{pair.competitor_entity.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {pair.competitor_entity.type === "PRINT_SGL" ? "Prasa SGL" : "Pure Digital"}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-emerald-400">
                      {pair.competitor_entity.hyperlocal_pct}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums text-emerald-400">
                      {pair.competitor_entity.watchdog_pct}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono tabular-nums text-zinc-400">
                      <span className="text-amber-400">{pair.ppg_entity.byline_pct}%</span>
                      <span className="mx-1 text-zinc-600">/</span>
                      <span className="text-emerald-400">{pair.competitor_entity.byline_pct}%</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${
                        pair.news_desert_risk === "KRYTYCZNE" ? "bg-red-500/20 text-red-300" :
                        pair.news_desert_risk === "WYSOKIE" ? "bg-amber-500/20 text-amber-300" :
                        pair.news_desert_risk === "UMIARKOWANE" ? "bg-yellow-500/20 text-yellow-300" :
                        "bg-emerald-500/20 text-emerald-300"
                      }`}>
                        {pair.news_desert_risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 05 · WIDOK: PUSTYNIE INFORMACYJNE (NEWS DESERT INDEX)                  */}
      {/* ===================================================================== */}
      {activeTab === "deserts" && (
        <div className="space-y-4">
          <div className="rounded-xl border-t-4 border-[#0f4c81] bg-[#f8fafc] p-6 text-zinc-900 shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0f4c81]">
              <span>NAJWAŻNIEJSZE USTALENIA</span>
              <span>◆</span>
              <span>RAPORT ZAGROŻENIA PUSTYNIAMI INFORMACYJNYMI</span>
            </div>
            <h2 className="mt-2 font-serif text-xl font-bold text-slate-900">
              Gdzie upadek lokalnych redakcji tworzy próżnię kontroli społecznej?
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
              <p>
                – <strong>Złudzenie zasięgu korporacyjnego.</strong> Polska Press Grupa pokrywa 549 serwisów miejskich,
                lecz w ponad 70% powiatów ziemskich redakcja nie posiada fizycznego reportera na miejscu.
                Treści są zasilane automatycznymi komunikatami policji, ostrzeżeniami IMGW oraz syndykacją kulinarną i
                horoskopową z centralnych hubów SEO.
              </p>
              <p>
                – <strong>Strefy krytycznego ryzyka.</strong> Najbardziej zagrożone powstaniem całkowitej pustyni
                informacyjnej są powiaty województwa opolskiego, podlaskiego i lubelskiego, gdzie niezależne gazety
                powiatowe upadły pod presją rosnących kosztów papieru i druku, a serwisy PPG stały się agregatorami.
              </p>
              <p>
                – <strong>Biuletyny samorządowe wypierają wolną prasę.</strong> W aglomeracjach (np. Wrocław, Łódź)
                dodatkowym czynnikiem niszczącym niezależne media są gazety i portale finansowane bezpośrednio z budżetu
                miast, które z budżetem publicznym konkurują o rynek reklamowy i uwagę czytelnika.
              </p>
              <p>
                – <strong>Tarcza Stowarzyszenia Gazet Lokalnych (SGL).</strong> Na rynkach, gdzie utrzymała się silna,
                tradycyjna prasa zrzeszona w SGL (np. Nowy Targ i Tygodnik Podhalański, Jarocin i Gazeta Jarocińska,
                Nowiny Gliwickie), wskaźnik dziennikarstwa śledczego osiąga rekordowe 45–52%, a PPG przegrywa zarówno w
                autorytecie, jak i penetracji społecznej.
              </p>
            </div>
          </div>

          {/* PODZIAŁ NA STREFY RYZYKA */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-red-500/20 bg-[#0c0e12] p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Strefy ryzyka krytycznego</span>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-zinc-300">
                {data.news_desert_summary.critical_risk_regions.map((reg, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span>{reg}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-zinc-400">
                Brak fizycznych reporterów w terenie; jedyne źródło to komunikaty urzędów gmin.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-[#0c0e12] p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                <span>Strefy wysokiego ryzyka</span>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-zinc-300">
                {data.news_desert_summary.high_risk_regions.map((reg, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{reg}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-zinc-400">
                Wysoka dominacja jednego tytułu PPG połączona z brakiem silnych portali czysto cyfrowych.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-[#0c0e12] p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Rynki chronione i bezpieczne</span>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-zinc-300">
                {data.news_desert_summary.safe_well_served_regions.map((reg, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{reg}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-zinc-400">
                Obecność silnych wydawców niezależnych (Trojmiasto.pl, Tygodnik Podhalański, ePoznań).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 06 · WIDOK: METODOLOGIA AUDYTU                                         */}
      {/* ===================================================================== */}
      {activeTab === "methodology" && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0c0e12] p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0f4c81]">
            <Info className="h-4 w-4" />
            <span>Zastrzeżenie metodologiczne i źródła danych</span>
          </div>
          <h3 className="font-serif text-lg font-bold text-white">
            Standard empirycznego benchmarku mediów lokalnych PPGscope
          </h3>
          <div className="space-y-3 text-xs leading-relaxed text-zinc-300">
            <p>
              1. <strong>Dobór próby badawczej ($N = 4,200$):</strong> Próba obejmuje artykuły opublikowane w slotach
              czołówkowych i pierwszych sekcjach stron głównych w okresie monitorowanym. Dla każdego medium pobrano
              reprezentatywną próbę minimum 200 publikacji.
            </p>
            <p>
              2. <strong>Klasyfikacja czystości lokalnej (Hyperlocal %):</strong> Treści są analizowane pod kątem obecności
              geolokalizatorów (nazwy ulic, dzielnic, wsi, lokalnych instytucji, radnych, prezydentów). Publikacje o
              zasięgu ogólnokrajowym (prawo, ZUS, podatki krajowe, przepisy kulinarne, horoskopy) są kategoryzowane jako
              nielokalne (C).
            </p>
            <p>
              3. <strong>Wskaźnik Watchdog vs Festynoza:</strong> Kategoria Watchdog obejmuje teksty śledcze, analizy
              uchwał rad gmin/miast, przetargi publiczne, oświadczenia majątkowe i interwencje społeczne. Kategoria
              Festynoza obejmuje galerie ze studniówek, imprez plenerowych, quizy, lifestyle i porady.
            </p>
            <p>
              4. <strong>Detekcja czołówek w renderowanym DOM:</strong> W przeciwieństwie do kanałów RSS, badanie
              wykorzystuje silnik bezgłowy Chromium (Puppeteer), rejestrując rzeczywisty stan pierwszego slotu
              prezentacyjnego na stronie głównej w momentach kluczowych dla cyklu wydawniczego (07:30, 12:00, 17:00).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
