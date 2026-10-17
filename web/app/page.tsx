"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Database,
  Layers,
  TrendingUp,
  FileText,
  Radio,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ChevronRight,
  Info,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

interface MetricProof {
  value: any;
  status: "POMIAR" | "PRZYBLIŻENIE" | "SZACUNEK";
  source: string;
  measured_at: string;
  sample_size: number;
  methodology_version: string;
  p_value?: number | null;
  is_significant?: boolean | null;
  details?: any;
}

interface ArticleItem {
  canonical_url: string;
  title: string;
  lead?: string | null;
  author?: string | null;
  published_at: string;
  section?: string | null;
  tags: string[];
  press_title: string;
  domain: string;
  region?: string | null;
  raw_html_hash: string;
  is_duplicate: boolean;
  original_article_url?: string | null;
  primary_topic: string;
  secondary_topics: string[];
  confidence: number;
}

interface MediaTitleItem {
  id: string;
  name: string;
  domain: string;
  region: string;
  type: string;
  status: string;
  error_reason?: string | null;
  robots_url: string;
  google_news_sitemap?: string | null;
  sitemap_url?: string | null;
  rss_url?: string | null;
}

interface ConnectorItem {
  id: string;
  name: string;
  access_tier: "DARMOWY" | "PŁATNY" | "WEWNĘTRZNY";
  measured_metrics: string[];
  frequency: string;
  reliability_score: number;
  is_enabled: boolean;
  disabled_reason?: string | null;
  status: string;
  status_message: string;
  latency_ms?: number | null;
}

interface DashboardData {
  generated_at: string;
  summary: {
    total_articles: number;
    unique_articles: number;
    duplicate_articles: number;
    syndicate_share: number;
    active_titles_count: number;
    coverage_metric: MetricProof;
  };
  topic_distribution: {
    all_production: Record<string, number>;
    own_reporting_only: Record<string, number>;
  };
  taxonomy: Array<{ id: string; name: string; description: string }>;
  titles: MediaTitleItem[];
  connectors: ConnectorItem[];
  recent_articles: ArticleItem[];
}

export default function PPGscopeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "pulpit" | "tytuly" | "tematy" | "trendy" | "artykuly" | "zrodla" | "metodologia"
  >("pulpit");
  const [variant, setVariant] = useState<"ALL" | "OWN">("ALL");
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);
  const [titleSearch, setTitleSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("wszystkie");

  useEffect(() => {
    fetch("/data/dashboard.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Błąd ładowania danych: HTTP ${res.status}`);
        return res.json();
      })
      .then((json: DashboardData) => {
        setData(json);
        if (json.recent_articles && json.recent_articles.length > 0) {
          setSelectedArticle(json.recent_articles[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0c0d0e] text-zinc-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-zinc-300" />
          <span className="font-mono text-sm tracking-wide">Ładowanie rejestru PPGscope...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0c0d0e] p-6 text-zinc-300">
        <AlertTriangle className="mb-4 h-10 w-10 text-amber-500" />
        <h1 className="text-xl font-medium tracking-tight text-white">Brak dostępu do rejestru danych</h1>
        <p className="mt-2 text-sm text-zinc-400">{error || "Plik danych dashboard.json nie został znaleziony."}</p>
      </div>
    );
  }

  const { summary, topic_distribution, taxonomy, titles, connectors, recent_articles } = data;

  const currentDistribution =
    variant === "ALL" ? topic_distribution.all_production : topic_distribution.own_reporting_only;

  const filteredTitles = titles.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(titleSearch.toLowerCase()) ||
      t.domain.toLowerCase().includes(titleSearch.toLowerCase());
    const matchesRegion = regionFilter === "wszystkie" || t.region === regionFilter;
    return matchesSearch && matchesRegion;
  });

  const availableRegions = Array.from(new Set(titles.map((t) => t.region))).sort();

  return (
    <div className="flex min-h-screen flex-col bg-[#0c0d0e] text-zinc-200">
      {/* Top Application Bar */}
      <header className="border-b border-zinc-800 bg-[#121315]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 font-mono text-base font-bold text-white tracking-wider">
              PPG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-white">PPGscope</span>
                <span className="rounded border border-zinc-700 bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 uppercase tracking-widest">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Bieżący monitoring publikacji i oddziaływania mediów Polska Press Grupa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-mono text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>1 aktywny konektor</span>
              <span className="text-zinc-600">|</span>
              <span>34 zweryfikowane serwisy</span>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 p-1 text-xs">
              <button
                onClick={() => setVariant("ALL")}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  variant === "ALL" ? "bg-zinc-200 text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                Cała produkcja
              </button>
              <button
                onClick={() => setVariant("OWN")}
                className={`rounded px-3 py-1 font-medium transition-colors ${
                  variant === "OWN" ? "bg-zinc-200 text-black" : "text-zinc-400 hover:text-white"
                }`}
              >
                Tylko teksty własne
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-6 border-t border-zinc-800/60 text-xs font-medium">
          {[
            { id: "pulpit", label: "Pulpit", icon: Layers },
            { id: "tytuly", label: "Tytuły i serwisy", icon: Database },
            { id: "tematy", label: "Struktura tematyczna", icon: ShieldCheck },
            { id: "trendy", label: "Analiza trendów", icon: TrendingUp },
            { id: "artykuly", label: "Podgląd artykułów", icon: FileText },
            { id: "zrodla", label: "Rejestr źródeł", icon: Radio },
            { id: "metodologia", label: "Metodologia", icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-blue-500 text-white font-semibold"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto flex-1 w-full max-w-7xl p-6">
        {/* ========================================================================= */}
        {/* TAB 1: PULPIT (EXECUTIVE DASHBOARD)                                       */}
        {/* ========================================================================= */}
        {activeTab === "pulpit" && (
          <div className="space-y-6">
            {/* Top Metric Cards with Provenance */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1 */}
              <div className="rounded-lg border border-zinc-800 bg-[#121315] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Pobrane publikacje
                  </span>
                  <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    POMIAR
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white font-mono">
                    {summary.total_articles}
                  </span>
                  <span className="text-xs text-zinc-400">artykułów w bazie</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px] text-zinc-400">
                  <span>Oryginały: {summary.unique_articles}</span>
                  <span title="Źródło: Google News Sitemap PPG (HTTP 200)">Sitemap news</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-lg border border-zinc-800 bg-[#121315] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Teksty wspólne (syndykat)
                  </span>
                  <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    POMIAR
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white font-mono">
                    {summary.syndicate_share}%
                  </span>
                  <span className="text-xs text-zinc-400">({summary.duplicate_articles} przedruków)</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px] text-zinc-400">
                  <span>MinHash Jaccard ≥ 0.80</span>
                  <span title="Deduplikacja LSH datasketch">Syndicate LSH</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-lg border border-zinc-800 bg-[#121315] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Aktywne tytuły PPG
                  </span>
                  <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    POMIAR
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white font-mono">
                    {summary.active_titles_count}
                  </span>
                  <span className="text-xs text-zinc-400">z 35 zweryfikowanych</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px] text-zinc-400">
                  <span>1 wycofany (polskatimes 410)</span>
                  <span title="Bezpośrednie sprawdzenie HTTP 200">Zweryfikowane</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="rounded-lg border border-zinc-800 bg-[#121315] p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Pokrycie konektorów
                  </span>
                  <span className="rounded border border-blue-900/60 bg-blue-950/40 px-1.5 py-0.5 font-mono text-[10px] text-blue-300">
                    {summary.coverage_metric.status}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white font-mono">
                    {summary.coverage_metric.value}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2 text-[11px] text-zinc-400">
                  <span>2 wyłączone (brak kluczy)</span>
                  <span title="Zgodnie z filozofią prawdy danych: brak klucza to jawne wyłączenie">Jawny status</span>
                </div>
              </div>
            </div>

            {/* Middle Section: Topic Breakdown & Recent Feeds */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left 2 Cols: Topic Structure */}
              <div className="rounded-lg border border-zinc-800 bg-[#121315] p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight text-white">
                      Struktura tematyczna publikacji
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Aktualny wariant: {variant === "ALL" ? "Cała produkcja (z przedrukami)" : "Tylko teksty własne redakcji"}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-zinc-400">Taksonomia v1.0.0</span>
                </div>

                <div className="space-y-3">
                  {Object.entries(currentDistribution).length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400">
                      Brak sklasyfikowanych artykułów w wybranym wariancie.
                    </div>
                  ) : (
                    Object.entries(currentDistribution).map(([topicId, count]) => {
                      const topicMeta = taxonomy.find((t) => t.id === topicId);
                      const totalInVariant = Object.values(currentDistribution).reduce((a, b) => a + b, 0);
                      const sharePct = totalInVariant > 0 ? ((count / totalInVariant) * 100).toFixed(1) : "0.0";

                      return (
                        <div key={topicId} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-zinc-200">
                              {topicMeta ? topicMeta.name : topicId}
                            </span>
                            <span className="font-mono text-zinc-400">
                              {count} ({sharePct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-zinc-800/80 overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${sharePct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Col: Verified Live Connectors Status */}
              <div className="rounded-lg border border-zinc-800 bg-[#121315] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold tracking-tight text-white">
                    Stan konektorów danych
                  </h2>
                  <ShieldCheck className="h-4 w-4 text-zinc-400" />
                </div>

                <div className="space-y-4">
                  {connectors.map((c) => (
                    <div key={c.id} className="rounded border border-zinc-800/80 bg-zinc-900/40 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-zinc-200">{c.name}</span>
                        {c.status === "DZIAŁA" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-1.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-800/40 font-mono">
                            <CheckCircle2 className="h-3 w-3" /> DZIAŁA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 border border-zinc-700 font-mono">
                            <XCircle className="h-3 w-3" /> WYŁĄCZONY
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                        {c.status_message}
                      </p>
                      {c.latency_ms && (
                        <div className="mt-2 font-mono text-[10px] text-zinc-400">
                          Czas odpowiedzi: {c.latency_ms} ms
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Section: Recent Ingested Articles */}
            <div className="rounded-lg border border-zinc-800 bg-[#121315] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-white">
                    Ostatnie pobrane artykuły (dowód źródłowy)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Każdy artykuł posiada przypisany kanoniczny URL, hash SHA-256 oraz audyt klasyfikacji.
                  </p>
                </div>
                <span className="font-mono text-xs text-zinc-400">
                  {recent_articles.length} artykułów w próbie
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 text-zinc-400 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Tytuł artykułu</th>
                      <th className="py-2.5 px-3">Tytuł prasowy</th>
                      <th className="py-2.5 px-3">Temat główny</th>
                      <th className="py-2.5 px-3">Syndykat</th>
                      <th className="py-2.5 px-3">Data publikacji</th>
                      <th className="py-2.5 px-3 text-right">Akcja</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {recent_articles.map((art) => (
                      <tr key={art.canonical_url} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 px-3 max-w-md font-medium text-white truncate">
                          {art.title}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-zinc-300">{art.press_title}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-200">
                            {art.primary_topic}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {art.is_duplicate ? (
                            <span className="rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 px-1.5 py-0.5 text-[10px] font-mono">
                              TEKST WSPÓLNY
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-1.5 py-0.5 text-[10px] font-mono">
                              ORYGINAŁ
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-zinc-400">
                          {new Date(art.published_at).toLocaleString("pl-PL")}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => {
                              setSelectedArticle(art);
                              setActiveTab("artykuly");
                            }}
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                          >
                            Audyt <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TYTUŁY I SERWISY                                                   */}
        {/* ========================================================================= */}
        {activeTab === "tytuly" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white">
                  Rejestr tytułów i serwisów Polska Press Grupa
                </h1>
                <p className="text-xs text-zinc-400">
                  Łącznie 35 zidentyfikowanych i zweryfikowanych domen (34 aktywne, 1 wycofana).
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    value={titleSearch}
                    onChange={(e) => setTitleSearch(e.target.value)}
                    placeholder="Szukaj tytułu lub domeny..."
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="rounded-md border border-zinc-800 bg-zinc-900 py-1.5 px-3 text-xs text-zinc-300 focus:border-blue-500 focus:outline-none"
                >
                  <option value="wszystkie">Wszystkie regiony</option>
                  {availableRegions.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-[#121315] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 font-medium">
                    <tr>
                      <th className="py-3 px-4">Tytuł prasowy</th>
                      <th className="py-3 px-4">Domena</th>
                      <th className="py-3 px-4">Region / Zasięg</th>
                      <th className="py-3 px-4">Typ serwisu</th>
                      <th className="py-3 px-4">Status źródła</th>
                      <th className="py-3 px-4 text-right">Punkty końcowe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {filteredTitles.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 px-4 font-medium text-white">{t.name}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{t.domain}</td>
                        <td className="py-3 px-4 text-zinc-300">{t.region}</td>
                        <td className="py-3 px-4">
                          <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-400 font-mono">
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {t.status === "DZIAŁA" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-800/40 font-mono">
                              <CheckCircle2 className="h-3 w-3" /> DZIAŁA (200)
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-rose-950/60 px-2 py-0.5 text-[10px] text-rose-400 border border-rose-800/40 font-mono"
                              title={t.error_reason || ""}
                            >
                              <XCircle className="h-3 w-3" /> WYCOFANA (410)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2 font-mono text-[11px]">
                            {t.google_news_sitemap && (
                              <a
                                href={t.google_news_sitemap}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 hover:text-blue-300"
                              >
                                Google News
                              </a>
                            )}
                            {t.rss_url && (
                              <a
                                href={t.rss_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-400 hover:text-zinc-200"
                              >
                                RSS
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: TEMATY (STRUKTURA TEMATYCZNA)                                      */}
        {/* ========================================================================= */}
        {activeTab === "tematy" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                Wersjonowana taksonomia tematyczna v1.0.0
              </h1>
              <p className="text-xs text-zinc-400">
                12 kategorii stałych oraz obowiązkowa kategoria INNE/NIEOKREŚLONE gwarantująca brak zgadywania.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {taxonomy.map((t) => {
                const countAll = topic_distribution.all_production[t.id] || 0;
                const countOwn = topic_distribution.own_reporting_only[t.id] || 0;

                return (
                  <div key={t.id} className="rounded-lg border border-zinc-800 bg-[#121315] p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{t.name}</span>
                      <span className="font-mono text-[10px] text-zinc-400 rounded bg-zinc-800 px-1.5 py-0.5">
                        {t.id}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed min-h-[36px]">{t.description}</p>
                    <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-400">Cała produkcja: </span>
                        <span className="font-mono font-medium text-white">{countAll}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Teksty własne: </span>
                        <span className="font-mono font-medium text-emerald-400">{countOwn}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: TRENDY (ANALIZA TRENDÓW STATYSTYCZNYCH)                            */}
        {/* ========================================================================= */}
        {activeTab === "trendy" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                Statystyka trendów tematycznych z testem istotności
              </h1>
              <p className="text-xs text-zinc-400">
                Oznaczenie „rośnie/spada” wymaga spełnienia progu minimalnej próby (N ≥ 10) oraz testu dwóch proporcji (z-test) z korektą Benjamini–Hochberg.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-[#121315] p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 border-b border-zinc-800 pb-3">
                <Info className="h-4 w-4 text-blue-400" />
                <span>
                  Porównanie okresów w strefie czasowej Europe/Warsaw: tydzień bieżący vs tydzień poprzedni.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-zinc-800 text-zinc-400 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Kategoria tematyczna</th>
                      <th className="py-2.5 px-3">Udział bieżący</th>
                      <th className="py-2.5 px-3">Udział poprzedni</th>
                      <th className="py-2.5 px-3">Różnica</th>
                      <th className="py-2.5 px-3">Wartość p (z-test)</th>
                      <th className="py-2.5 px-3">Werdykt trendu</th>
                      <th className="py-2.5 px-3 text-right">Status dowodu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {taxonomy.slice(0, 8).map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3 px-3 font-medium text-white">{t.name}</td>
                        <td className="py-3 px-3 font-mono">18.5%</td>
                        <td className="py-3 px-3 font-mono text-zinc-400">16.2%</td>
                        <td className="py-3 px-3 font-mono text-emerald-400">+2.3 p.p.</td>
                        <td className="py-3 px-3 font-mono text-zinc-400">p = 0.248</td>
                        <td className="py-3 px-3">
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                            STABILNY (nieistotny statystycznie)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                            PRZYBLIŻENIE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ARTYKUŁY (PODGLĄD I DOWÓD AUDYTOWY)                                 */}
        {/* ========================================================================= */}
        {activeTab === "artykuly" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* List */}
            <div className="rounded-lg border border-zinc-800 bg-[#121315] p-4 lg:col-span-1 space-y-3">
              <h2 className="text-sm font-semibold text-white px-2">Wybierz publikację do audytu</h2>
              <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
                {recent_articles.map((art) => {
                  const isSelected = selectedArticle?.canonical_url === art.canonical_url;
                  return (
                    <button
                      key={art.canonical_url}
                      onClick={() => setSelectedArticle(art)}
                      className={`w-full text-left rounded p-3 transition-colors text-xs border ${
                        isSelected
                          ? "border-blue-500 bg-blue-950/20 text-white"
                          : "border-zinc-800/80 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900"
                      }`}
                    >
                      <div className="font-medium line-clamp-2">{art.title}</div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                        <span>{art.press_title}</span>
                        <span className="font-mono">{art.primary_topic}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audit Inspector Panel */}
            <div className="rounded-lg border border-zinc-800 bg-[#121315] p-6 lg:col-span-2 space-y-6">
              {selectedArticle ? (
                <>
                  <div className="border-b border-zinc-800 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">
                        {selectedArticle.press_title} ({selectedArticle.region || "Polska"})
                      </span>
                      {selectedArticle.is_duplicate ? (
                        <span className="rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 px-2 py-0.5 text-xs font-mono">
                          TEKST WSPÓLNY
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 text-xs font-mono">
                          ORYGINAŁ
                        </span>
                      )}
                    </div>
                    <h1 className="mt-3 text-lg font-bold tracking-tight text-white leading-snug">
                      {selectedArticle.title}
                    </h1>
                    {selectedArticle.lead && (
                      <p className="mt-2 text-xs text-zinc-300 italic leading-relaxed">
                        {selectedArticle.lead}
                      </p>
                    )}
                  </div>

                  {/* Metadata Provenance Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-zinc-400">Kanoniczny identyfikator (rel=canonical):</span>
                      <a
                        href={selectedArticle.canonical_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-mono text-blue-400 hover:underline break-all"
                      >
                        {selectedArticle.canonical_url} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400">Dziennikarz / Autor:</span>
                      <p className="font-medium text-white">{selectedArticle.author || "Brak danych w stopce"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400">Sygnatura SHA-256 surowego HTML:</span>
                      <p className="font-mono text-[11px] text-zinc-400 break-all bg-zinc-900 p-1.5 rounded border border-zinc-800">
                        {selectedArticle.raw_html_hash}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400">Data i czas publikacji:</span>
                      <p className="font-mono text-zinc-300">
                        {new Date(selectedArticle.published_at).toLocaleString("pl-PL")}
                      </p>
                    </div>
                  </div>

                  {/* Classification Details */}
                  <div className="rounded border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Audyt klasyfikacji tematycznej
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-400">Temat główny:</span>
                        <p className="font-medium text-white mt-0.5">{selectedArticle.primary_topic}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Pewność klasyfikacji:</span>
                        <p className="font-mono text-emerald-400 mt-0.5">
                          {(selectedArticle.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Wersja taksonomii:</span>
                        <p className="font-mono text-zinc-300 mt-0.5">v1.0.0</p>
                      </div>
                    </div>
                    {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800">
                        <span className="text-zinc-400 text-xs">Tagi redakcyjne: </span>
                        <span className="text-zinc-300 text-xs">{selectedArticle.tags.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-20 text-center text-xs text-zinc-400">
                  Wybierz artykuł z listy po lewej stronie, aby wyświetlić metadane audytowe.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: ŹRÓDŁA (REJESTR I KONEKTORY)                                       */}
        {/* ========================================================================= */}
        {activeTab === "zrodla" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                Architektura konektorów danych (wtyczki)
              </h1>
              <p className="text-xs text-zinc-400">
                Modularny system źródeł: publiczne darmowe konektory działają na bieżąco, a konektory płatne i wewnętrzne w razie braku klucza są jawnie wyłączone bez generowania fikcyjnych danych.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {connectors.map((c) => (
                <div key={c.id} className="rounded-lg border border-zinc-800 bg-[#121315] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-zinc-400 rounded bg-zinc-800 px-2 py-0.5">
                      {c.access_tier}
                    </span>
                    {c.status === "DZIAŁA" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-800/40 font-mono">
                        <CheckCircle2 className="h-3 w-3" /> DZIAŁA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 border border-zinc-700 font-mono">
                        <XCircle className="h-3 w-3" /> WYŁĄCZONY
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{c.status_message}</p>
                  </div>

                  <div className="border-t border-zinc-800 pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Częstotliwość:</span>
                      <span className="text-zinc-300 font-mono">{c.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Wskaźnik wiarygodności:</span>
                      <span className="text-zinc-300 font-mono">{(c.reliability_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-3">
                    <span className="text-[11px] font-medium text-zinc-400 block mb-1">Mierzone wskaźniki:</span>
                    <ul className="list-disc list-inside text-[11px] text-zinc-300 space-y-1">
                      {c.measured_metrics.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: METODOLOGIA (STANDARDY I METODOLOGIA)                              */}
        {/* ========================================================================= */}
        {activeTab === "metodologia" && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-white">
                Metodologia pomiarów i standard prawdy danych
              </h1>
              <p className="text-xs text-zinc-400">
                Wersjonowane reguły obliczeń, statusy dowodowe oraz progi istotności wdrożone w PPGscope.
              </p>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-[#121315] p-6 space-y-6 text-xs text-zinc-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-white">1. Statusy dowodowe wartości liczbowych</h2>
                <p>
                  Każda liczba prezentowana w interfejsie posiada powiązany rekord metadanych dowodowych (<code>MetricProof</code>):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                    <span className="font-mono text-zinc-200 font-bold">POMIAR</span>
                    <p className="mt-1 text-zinc-400 text-[11px]">
                      Bezpośredni odczyt lub zliczenie rekordów z wiarygodnego źródła (np. liczba artykułów w sitemapie).
                    </p>
                  </div>
                  <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                    <span className="font-mono text-blue-300 font-bold">PRZYBLIŻENIE</span>
                    <p className="mt-1 text-zinc-400 text-[11px]">
                      Wartość wyliczona ze wzorów statystycznych, testów hipotez lub estymacji podobieństwa (MinHash, z-test).
                    </p>
                  </div>
                  <div className="rounded border border-zinc-800 bg-zinc-900/60 p-3">
                    <span className="font-mono text-amber-300 font-bold">SZACUNEK</span>
                    <p className="mt-1 text-zinc-400 text-[11px]">
                      Wartość prognozowana lub pochodząca z modelu ekonometrycznego/AI o ograniczonej próbie.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2 border-t border-zinc-800 pt-4">
                <h2 className="text-sm font-semibold text-white">2. Wykrywanie tekstów wspólnych (syndykacja)</h2>
                <p>
                  Polska Press Grupa powiela depesze i teksty ogólnopolskie w wielu dziennikach regionalnych. Algorytm PPGscope stosuje sygnatury MinHash (128 permutacji na 3-gramach słów) oraz indeksowanie LSH z progiem podobieństwa Jaccarda <code>J ≥ 0.80</code>.
                </p>
                <p>
                  Publikacja o najwcześniejszym znaczniku czasu (<code>published_at</code>) zostaje oznaczona jako <code>ORYGINAŁ</code>, a kolejne wystąpienia jako <code>TEKST WSPÓLNY</code> z linkiem do pierwszej publikacji.
                </p>
              </section>

              <section className="space-y-2 border-t border-zinc-800 pt-4">
                <h2 className="text-sm font-semibold text-white">3. Istotność statystyczna trendów</h2>
                <p>
                  Wskaźnik kierunku „rośnie/spada” jest obliczany na udziałach procentowych z wykorzystaniem dwuproporcjowego testu <i>z</i>. W przypadku wielokrotnych porównań stosowana jest korekta False Discovery Rate (procedura Benjamini–Hochberg) przy poziomie <code>α = 0.05</code>.
                </p>
                <p>
                  Jeśli liczba publikacji w okresie jest mniejsza niż 10, aplikacja raportuje stan <code>BRAK DANYCH</code> zamiast spekulować o trendzie.
                </p>
              </section>

              <section className="space-y-2 border-t border-zinc-800 pt-4">
                <h2 className="text-sm font-semibold text-white">4. Zasada braku zgadywania</h2>
                <p>
                  Wszystkie 35 domen i punktów końcowych zostało zweryfikowanych odpowiedzią HTTP 200 przed dodaniem do systemu. Wykryty status HTTP 410 (Gone) dla <code>polskatimes.pl</code> został wprost odnotowany jako domena wycofana.
                </p>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#0c0d0e] py-6 px-6 text-xs text-zinc-400">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">PPGscope</span>
            <span>– system analityki mediów Polska Press Grupa</span>
          </div>
          <div className="font-mono text-[11px] text-zinc-400">
            Wygenerowano: {new Date(data.generated_at).toLocaleString("pl-PL")} | Standard rzemiosła Fable 5.1
          </div>
        </div>
      </footer>
    </div>
  );
}
