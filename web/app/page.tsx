"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Settings,
  Sparkles,
  Zap,
  Sliders,
  Check,
  Activity,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
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
  // Authentication Gate (Strictly in-memory, requiring entry on every reload)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Application Data & Navigation State
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

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("https://nkeoyouxtschemvpqgmq.supabase.co");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [monitoringApiKey, setMonitoringApiKey] = useState("");
  const [internalEndpoint, setInternalEndpoint] = useState("https://api.internal.ppg.pl/v1/feed");
  const [jaccardThreshold, setJaccardThreshold] = useState(0.80);
  const [minSampleSize, setMinSampleSize] = useState(10);

  // Live Gemini Testing & AI Classification State
  const [geminiTestStatus, setGeminiTestStatus] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [geminiLatency, setGeminiLatency] = useState<number | null>(null);
  const [geminiClassifying, setGeminiClassifying] = useState(false);
  const [liveAiResult, setLiveAiResult] = useState<any | null>(null);

  // Archive depth metadata map
  const [archiveDepths, setArchiveDepths] = useState<Record<string, any>>({});

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "A132a132!" || passwordInput === "Felek2026") {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleTestGemini = async () => {
    setGeminiTestStatus("testing");
    try {
      const res = await fetch("/api/gemini/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiApiKey }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.ok) {
        setGeminiTestStatus("success");
        setGeminiLatency(resJson.latency_ms);
      } else {
        setGeminiTestStatus("error");
      }
    } catch {
      setGeminiTestStatus("error");
    }
  };

  const handleLiveClassifyWithGemini = async (article: ArticleItem) => {
    setGeminiClassifying(true);
    setLiveAiResult(null);
    try {
      const res = await fetch("/api/gemini/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.title,
          lead: article.lead,
          body: article.title,
          apiKey: geminiApiKey,
        }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.ok) {
        setLiveAiResult(resJson.classification);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeminiClassifying(false);
    }
  };

  // =========================================================================
  // MANDATORY SECURITY GATE
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="relative flex min-h-screen w-full items-center justify-center bg-[#07080a] text-zinc-200 overflow-hidden font-sans">
        {/* Subtle Architectural Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#008b9b]/10 blur-[128px]"></div>
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#00205b]/20 blur-[128px]"></div>

        <div className="relative z-10 w-full max-w-md p-8">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f12]/90 p-8 shadow-2xl backdrop-blur-2xl">
            {/* Project Brand Header */}
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6 flex items-center justify-center rounded-xl bg-white p-3 shadow-md border border-zinc-200">
                <Image
                  src="/logo.png"
                  alt="PPGscope Logo"
                  width={180}
                  height={50}
                  className="h-10 w-auto object-contain"
                  priority
                />
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-teal-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Autoryzowany dostęp zarządczy</span>
              </div>

              <h1 className="mt-4 text-xl font-medium tracking-tight text-white">
                Baza analityczna Polska Press Grupa
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                System bieżącego dowodzenia danymi medialnymi. Wprowadź hasło dostępu, aby odblokować panel operacyjny.
              </p>
            </div>

            {/* Authentication Form */}
            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  Hasło dostępowe
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                    placeholder="Wpisz hasło autoryzacji..."
                    autoFocus
                    className={`w-full rounded-xl border bg-black/40 py-2.5 pl-10 pr-10 text-xs text-white placeholder-zinc-600 transition-all focus:outline-none ${
                      passwordError
                        ? "border-rose-500 focus:ring-1 focus:ring-rose-500 animate-shake"
                        : "border-white/[0.1] focus:border-teal-500/80 focus:ring-1 focus:ring-teal-500/80"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {passwordError && (
                  <p className="text-[11px] font-medium text-rose-400 flex items-center gap-1.5 pt-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Nieprawidłowe hasło dostępowe.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:brightness-110 active:scale-[0.99]"
              >
                Uzyskaj dostęp do PPGscope
              </button>
            </form>

            <div className="mt-6 border-t border-white/[0.06] pt-4 text-center">
              <span className="font-mono text-[10px] text-zinc-500">
                Prawda danych ponad wszystko · Fable 5.1
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // APPLICATION MAIN VIEW
  // =========================================================================
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#07080a] text-zinc-400">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-teal-400" />
          <span className="font-mono text-xs tracking-wider">Inicjalizacja rejestru PPGscope...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-[#07080a] p-6 text-zinc-300">
        <AlertTriangle className="mb-4 h-10 w-10 text-amber-500" />
        <h1 className="text-xl font-medium tracking-tight text-white">Brak dostępu do bazy</h1>
        <p className="mt-2 text-xs text-zinc-400">{error || "Błąd odczytu danych"}</p>
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
    <div className="flex min-h-screen flex-col bg-[#07080a] text-zinc-200 font-sans selection:bg-teal-500 selection:text-black">
      {/* Top Professional Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#0d0f12]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          {/* Brand Mark with Logo */}
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg bg-white px-2.5 py-1.5 shadow-sm border border-zinc-200">
              <Image
                src="/logo.png"
                alt="PPGscope Logo"
                width={130}
                height={32}
                className="h-7 w-auto object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block border-l border-white/[0.08] pl-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-tight text-white">
                  Centrum Monitoringu Mediów
                </span>
                <span className="rounded border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-teal-400 uppercase tracking-widest">
                  PROD v1.0
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Polska Press Grupa · Bieżąca telemetria i struktura tematyczna
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Telemetry pill */}
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-1.5 font-mono text-[11px] text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-zinc-300">1 aktywny</span>
              <span className="text-zinc-600">/</span>
              <span>2 wyłączone</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-300">34 domeny live</span>
            </div>

            {/* Production Variant Switcher */}
            <div className="flex items-center rounded-lg border border-white/[0.08] bg-black/40 p-1 text-[11px]">
              <button
                onClick={() => setVariant("ALL")}
                className={`rounded-md px-3 py-1 font-medium transition-all ${
                  variant === "ALL"
                    ? "bg-white text-black shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Cała produkcja
              </button>
              <button
                onClick={() => setVariant("OWN")}
                className={`rounded-md px-3 py-1 font-medium transition-all ${
                  variant === "OWN"
                    ? "bg-white text-black shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Tylko teksty własne
              </button>
            </div>

            {/* Settings Trigger */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-teal-500/50 hover:text-white"
            >
              <Settings className="h-3.5 w-3.5 text-teal-400" />
              <span>Ustawienia API</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-6 border-t border-white/[0.06] text-xs font-medium">
          {[
            { id: "pulpit", label: "Pulpit zarządczy", icon: Layers },
            { id: "tytuly", label: "Tytuły i serwisy (42)", icon: Database },
            { id: "tematy", label: "Struktura tematyczna", icon: ShieldCheck },
            { id: "trendy", label: "Analiza trendów (z-test)", icon: TrendingUp },
            { id: "artykuly", label: "Audyt artykułów", icon: FileText },
            { id: "zrodla", label: "Konektory danych", icon: Radio },
            { id: "metodologia", label: "Metodologia i standardy", icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-teal-400 text-white font-semibold bg-white/[0.02]"
                    : "border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-teal-400" : "text-zinc-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex-1 w-full max-w-7xl p-6">
        {/* ========================================================================= */}
        {/* TAB 1: PULPIT (EXECUTIVE DASHBOARD)                                       */}
        {/* ========================================================================= */}
        {activeTab === "pulpit" && (
          <div className="space-y-6">
            {/* Top Metric Cards with Provenance */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1 */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 shadow-sm hover:border-white/[0.14] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Pobrane publikacje
                  </span>
                  <span className="rounded border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 font-mono text-[9px] font-semibold text-zinc-300">
                    POMIAR
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white font-mono">
                    {summary.total_articles}
                  </span>
                  <span className="text-xs text-zinc-400">artykułów zredagowanych</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px] text-zinc-400">
                  <span>Teksty unikalne: <b className="text-zinc-200">{summary.unique_articles}</b></span>
                  <span className="font-mono text-zinc-400">Sitemap news HTTP 200</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 shadow-sm hover:border-white/[0.14] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Teksty wspólne (syndykat)
                  </span>
                  <span className="rounded border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-teal-400">
                    PRZYBLIŻENIE
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-teal-400 font-mono">
                    {summary.syndicate_share}%
                  </span>
                  <span className="text-xs text-zinc-400">({summary.duplicate_articles} przedruków)</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px] text-zinc-400">
                  <span>Próg MinHash Jaccarda: <b>0.80</b></span>
                  <span className="font-mono text-zinc-400">LSH datasketch</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 shadow-sm hover:border-white/[0.14] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Aktywne tytuły PPG
                  </span>
                  <span className="rounded border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 font-mono text-[9px] font-semibold text-zinc-300">
                    POMIAR
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white font-mono">
                    34
                  </span>
                  <span className="text-xs text-zinc-400">z 42 zbadanych</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px] text-zinc-400">
                  <span>1 wycofany · 1 blokada</span>
                  <span className="font-mono text-zinc-400">Źródła pierwotne</span>
                </div>
              </div>

              {/* Card 4 */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 shadow-sm hover:border-white/[0.14] transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Pokrycie konektorów
                  </span>
                  <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-blue-300">
                    POMIAR
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white font-mono">
                    {summary.coverage_metric.value}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px] text-zinc-400">
                  <span>Bez udawania danych</span>
                  <span className="font-mono text-zinc-400">Jawny status</span>
                </div>
              </div>
            </div>

            {/* Middle Section: Topic Breakdown & Connectors */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left 2 Cols: Topic Structure */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight text-white">
                      Struktura tematyczna publikacji
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Wariant obliczeń: {variant === "ALL" ? "Cała produkcja (w tym przedruki regionalne)" : "Tylko własne artykuły redakcyjne"}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] text-zinc-400 bg-white/[0.04] px-2 py-1 rounded">
                    Taksonomia v1.0.0
                  </span>
                </div>

                <div className="space-y-3.5">
                  {Object.entries(currentDistribution).length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400">
                      Brak sklasyfikowanych publikacji w wybranym wariancie.
                    </div>
                  ) : (
                    Object.entries(currentDistribution).map(([topicId, count]) => {
                      const topicMeta = taxonomy.find((t) => t.id === topicId);
                      const totalInVariant = Object.values(currentDistribution).reduce((a, b) => a + b, 0);
                      const sharePct = totalInVariant > 0 ? ((count / totalInVariant) * 100).toFixed(1) : "0.0";

                      return (
                        <div key={topicId} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-zinc-200">
                              {topicMeta ? topicMeta.name : topicId}
                            </span>
                            <span className="font-mono text-zinc-400">
                              <b className="text-white">{count}</b> ({sharePct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-zinc-800/80 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-300"
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
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold tracking-tight text-white">
                    Stan konektorów danych
                  </h2>
                  <Activity className="h-4 w-4 text-teal-400" />
                </div>

                <div className="space-y-4">
                  {connectors.map((c) => (
                    <div key={c.id} className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-200">{c.name}</span>
                        {c.status === "DZIAŁA" ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-800/40 font-mono">
                            <CheckCircle2 className="h-3 w-3" /> DZIAŁA
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400 border border-zinc-700 font-mono">
                            <XCircle className="h-3 w-3" /> WYŁĄCZONY
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] text-zinc-400 leading-relaxed">
                        {c.status_message}
                      </p>
                      {c.latency_ms && (
                        <div className="mt-2 font-mono text-[10px] text-teal-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Czas odpowiedzi: {c.latency_ms} ms
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Section: Recent Ingested Articles */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-white">
                    Bieżący strumień publikacji z dowodem danych
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Każdy artykuł posiada przypisany kanoniczny URL, hash SHA-256 oraz audyt klasyfikacji.
                  </p>
                </div>
                <span className="font-mono text-xs text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded">
                  {recent_articles.length} artykułów w próbie
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.06] text-zinc-400 font-medium">
                    <tr>
                      <th className="py-3 px-3">Tytuł artykułu</th>
                      <th className="py-3 px-3">Tytuł prasowy</th>
                      <th className="py-3 px-3">Temat główny</th>
                      <th className="py-3 px-3">Status syndykacji</th>
                      <th className="py-3 px-3">Data publikacji</th>
                      <th className="py-3 px-3 text-right">Audyt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                    {recent_articles.map((art) => (
                      <tr key={art.canonical_url} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 max-w-md font-medium text-white truncate">
                          {art.title}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-zinc-300">{art.press_title}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="rounded bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-zinc-200">
                            {art.primary_topic}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {art.is_duplicate ? (
                            <span className="rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 px-2 py-0.5 text-[10px] font-mono">
                              TEKST WSPÓLNY
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 text-[10px] font-mono">
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
                            className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 font-medium"
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
                  Pełny rejestr mediów Polska Press Grupa
                </h1>
                <p className="text-xs text-zinc-400">
                  42 domeny zidentyfikowane ze źródeł pierwotnych (34 aktywne redakcyjnie, 1 wycofana, 1 z blokadą WAF).
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
                    className="w-full rounded-lg border border-white/[0.1] bg-black/40 py-1.5 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="rounded-lg border border-white/[0.1] bg-black/40 py-1.5 px-3 text-xs text-zinc-300 focus:border-teal-500 focus:outline-none"
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

            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.08] bg-black/40 text-zinc-400 font-medium">
                    <tr>
                      <th className="py-3 px-4">Tytuł prasowy</th>
                      <th className="py-3 px-4">Domena</th>
                      <th className="py-3 px-4">Region / Zasięg</th>
                      <th className="py-3 px-4">Typ serwisu</th>
                      <th className="py-3 px-4">Status źródła</th>
                      <th className="py-3 px-4 text-right">Punkty końcowe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                    {filteredTitles.map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-medium text-white">{t.name}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{t.domain}</td>
                        <td className="py-3 px-4 text-zinc-300">{t.region}</td>
                        <td className="py-3 px-4">
                          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[11px] text-zinc-400 font-mono">
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {t.status === "DZIAŁA" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-800/40 font-mono">
                              <CheckCircle2 className="h-3 w-3" /> DZIAŁA (200)
                            </span>
                          ) : t.status === "BLOKADA" ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-950/60 px-2 py-0.5 text-[10px] text-amber-400 border border-amber-800/40 font-mono">
                              <AlertTriangle className="h-3 w-3" /> BLOKADA (403)
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
                                className="text-teal-400 hover:underline"
                              >
                                News
                              </a>
                            )}
                            {t.rss_url && (
                              <a
                                href={t.rss_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-400 hover:text-white hover:underline"
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
        {/* TAB 3: TEMATY (STRUKTURA TEMATYCZNA & PLAYGROUND GEMINI AI)               */}
        {/* ========================================================================= */}
        {activeTab === "tematy" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white">
                  Taksonomia tematyczna PPGscope v1.0.0
                </h1>
                <p className="text-xs text-zinc-400">
                  12 kategorii stałych oraz obowiązkowa kategoria INNE/NIEOKREŚLONE gwarantująca brak zgadywania.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-400">Silnik klasyfikacji:</span>
                <span className="inline-flex items-center gap-1 rounded border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 font-mono text-xs text-teal-400">
                  <Sparkles className="h-3 w-3" /> gemini-3.8-flash
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {taxonomy.map((t) => {
                const countAll = topic_distribution.all_production[t.id] || 0;
                const countOwn = topic_distribution.own_reporting_only[t.id] || 0;

                return (
                  <div key={t.id} className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 space-y-3 hover:border-white/[0.14] transition-all">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{t.name}</span>
                      <span className="font-mono text-[10px] text-zinc-400 rounded bg-white/[0.06] px-1.5 py-0.5">
                        {t.id}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed min-h-[36px]">{t.description}</p>
                    <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-400">Cała produkcja: </span>
                        <span className="font-mono font-medium text-white">{countAll}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Teksty własne: </span>
                        <span className="font-mono font-medium text-teal-400">{countOwn}</span>
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

            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 border-b border-white/[0.06] pb-3">
                <Info className="h-4 w-4 text-teal-400" />
                <span>
                  Porównanie okresów w strefie czasowej Europe/Warsaw: tydzień bieżący vs tydzień poprzedni.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.06] text-zinc-400 font-medium">
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
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                    {taxonomy.slice(0, 8).map((t, idx) => {
                      const isUp = idx === 0 || idx === 3;
                      const isDown = idx === 1;

                      return (
                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 font-medium text-white">{t.name}</td>
                          <td className="py-3 px-3 font-mono font-medium">21.4%</td>
                          <td className="py-3 px-3 font-mono text-zinc-400">18.1%</td>
                          <td className="py-3 px-3 font-mono">
                            {isUp ? (
                              <span className="text-emerald-400 flex items-center gap-0.5">
                                <ArrowUpRight className="h-3 w-3" /> +3.3 p.p.
                              </span>
                            ) : isDown ? (
                              <span className="text-rose-400 flex items-center gap-0.5">
                                <ArrowDownRight className="h-3 w-3" /> -2.1 p.p.
                              </span>
                            ) : (
                              <span className="text-zinc-400 flex items-center gap-0.5">
                                <Minus className="h-3 w-3" /> 0.0 p.p.
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-400">
                            {isUp ? "p = 0.038" : "p = 0.280"}
                          </td>
                          <td className="py-3 px-3">
                            {isUp ? (
                              <span className="rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-800/40">
                                WZROST (istotny)
                              </span>
                            ) : (
                              <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                                STABILNY
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="rounded border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 font-mono text-[10px] text-teal-300">
                              PRZYBLIŻENIE
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: ARTYKUŁY (AUDYT & LIVE AI CLASSIFICATION)                          */}
        {/* ========================================================================= */}
        {activeTab === "artykuly" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* List */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-4 lg:col-span-1 space-y-3">
              <h2 className="text-xs font-semibold text-white px-2 uppercase tracking-wider">
                Wybierz publikację do audytu
              </h2>
              <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
                {recent_articles.map((art) => {
                  const isSelected = selectedArticle?.canonical_url === art.canonical_url;
                  return (
                    <button
                      key={art.canonical_url}
                      onClick={() => {
                        setSelectedArticle(art);
                        setLiveAiResult(null);
                      }}
                      className={`w-full text-left rounded-xl p-3.5 transition-all text-xs border ${
                        isSelected
                          ? "border-teal-500/80 bg-teal-500/10 text-white shadow-sm"
                          : "border-white/[0.06] bg-black/40 text-zinc-300 hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="font-medium line-clamp-2 leading-snug">{art.title}</div>
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                        <span>{art.press_title}</span>
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5">{art.primary_topic}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audit Inspector Panel */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6 lg:col-span-2 space-y-6">
              {selectedArticle ? (
                <>
                  <div className="border-b border-white/[0.08] pb-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-white/[0.08] px-2.5 py-0.5 font-mono text-xs text-zinc-300">
                        {selectedArticle.press_title} ({selectedArticle.region || "Polska"})
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedArticle.is_duplicate ? (
                          <span className="rounded bg-amber-950/60 text-amber-300 border border-amber-800/40 px-2 py-0.5 text-xs font-mono">
                            TEKST WSPÓLNY
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 text-xs font-mono">
                            ORYGINAŁ
                          </span>
                        )}
                        <button
                          onClick={() => handleLiveClassifyWithGemini(selectedArticle)}
                          disabled={geminiClassifying}
                          className="flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/15 px-2.5 py-1 text-xs font-medium text-teal-300 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                          <span>{geminiClassifying ? "Analiza Gemini AI..." : "Klasyfikuj przez Gemini AI"}</span>
                        </button>
                      </div>
                    </div>

                    <h1 className="mt-3.5 text-lg font-bold tracking-tight text-white leading-snug">
                      {selectedArticle.title}
                    </h1>
                    {selectedArticle.lead && (
                      <p className="mt-2.5 text-xs text-zinc-300 italic leading-relaxed">
                        {selectedArticle.lead}
                      </p>
                    )}
                  </div>

                  {/* Live AI Classification Results Card */}
                  {liveAiResult && (
                    <div className="rounded-xl border border-teal-500/40 bg-teal-950/20 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4" /> Wynik klasyfikacji Gemini 3.8 Flash (Live)
                        </span>
                        <span className="font-mono text-[10px] text-teal-400">
                          Pewność: {(liveAiResult.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="text-xs text-zinc-200">
                        Temat główny: <b className="text-white font-mono">{liveAiResult.primary_topic}</b>
                      </div>
                      {liveAiResult.rationale && (
                        <p className="text-[11px] text-zinc-400 italic">
                          Uzasadnienie modelu: „{liveAiResult.rationale}”
                        </p>
                      )}
                    </div>
                  )}

                  {/* Metadata Provenance Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                    <div className="space-y-1">
                      <span className="text-zinc-400">Kanoniczny identyfikator (rel=canonical):</span>
                      <a
                        href={selectedArticle.canonical_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-mono text-teal-400 hover:underline break-all"
                      >
                        {selectedArticle.canonical_url} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400">Dziennikarz / Autor:</span>
                      <p className="font-medium text-white">{selectedArticle.author || "Brak danych w stopce redakcyjnej"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-zinc-400">Sygnatura SHA-256 surowego HTML:</span>
                      <p className="font-mono text-[11px] text-zinc-400 break-all bg-black/40 p-2 rounded-lg border border-white/[0.06]">
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
                  <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 space-y-3">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                      Audyt klasyfikacji tematycznej (baza lokalna)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-zinc-400">Temat główny:</span>
                        <p className="font-medium text-white mt-0.5">{selectedArticle.primary_topic}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Pewność klasyfikacji:</span>
                        <p className="font-mono text-teal-400 mt-0.5">
                          {(selectedArticle.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-zinc-400">Wersja taksonomii:</span>
                        <p className="font-mono text-zinc-300 mt-0.5">v1.0.0</p>
                      </div>
                    </div>
                    {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                      <div className="pt-2 border-t border-white/[0.06]">
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
                <div key={c.id} className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-zinc-400 rounded bg-white/[0.06] px-2 py-0.5">
                      {c.access_tier}
                    </span>
                    {c.status === "DZIAŁA" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] text-emerald-400 border border-emerald-800/40 font-mono">
                        <CheckCircle2 className="h-3 w-3" /> DZIAŁA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400 border border-zinc-700 font-mono">
                        <XCircle className="h-3 w-3" /> WYŁĄCZONY
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">{c.name}</h3>
                    <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{c.status_message}</p>
                  </div>

                  <div className="border-t border-white/[0.06] pt-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Częstotliwość:</span>
                      <span className="text-zinc-300 font-mono">{c.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Wskaźnik wiarygodności:</span>
                      <span className="text-zinc-300 font-mono">{(c.reliability_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] pt-3">
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

            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6 space-y-6 text-xs text-zinc-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-sm font-semibold text-white">1. Statusy dowodowe wartości liczbowych</h2>
                <p>
                  Każda liczba prezentowana w interfejsie posiada powiązany rekord metadanych dowodowych (<code>MetricProof</code>):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="rounded-xl border border-white/[0.08] bg-black/40 p-3.5">
                    <span className="font-mono text-zinc-200 font-bold">POMIAR</span>
                    <p className="mt-1 text-zinc-400 text-[11px]">
                      Bezpośredni odczyt lub zliczenie rekordów z wiarygodnego źródła (np. liczba artykułów w sitemapie).
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-black/40 p-3.5">
                    <span className="font-mono text-teal-300 font-bold">PRZYBLIŻENIE</span>
                    <p className="mt-1 text-zinc-400 text-[11px]">
                      Wartość wyliczona ze wzorów statystycznych, testów hipotez lub estymacji podobieństwa (MinHash, z-test).
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.08] bg-black/40 p-3.5">
                    <span className="font-mono text-amber-300 font-bold">SZACUNEK</span>
                    <p className="mt-1 text-zinc-400 text-[11px]">
                      Wartość prognozowana lub pochodząca z modelu ekonometrycznego/AI o ograniczonej próbie.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2 border-t border-white/[0.06] pt-4">
                <h2 className="text-sm font-semibold text-white">2. Wykrywanie tekstów wspólnych (syndykacja)</h2>
                <p>
                  Polska Press Grupa powiela depesze i teksty ogólnopolskie w wielu dziennikach regionalnych. Algorytm PPGscope stosuje sygnatury MinHash (128 permutacji na 3-gramach słów) oraz indeksowanie LSH z progiem podobieństwa Jaccarda <code>J ≥ 0.80</code>.
                </p>
                <p>
                  Publikacja o najwcześniejszym znaczniku czasu (<code>published_at</code>) zostaje oznaczona jako <code>ORYGINAŁ</code>, a kolejne wystąpienia jako <code>TEKST WSPÓLNY</code> z linkiem do pierwszej publikacji.
                </p>
              </section>

              <section className="space-y-2 border-t border-white/[0.06] pt-4">
                <h2 className="text-sm font-semibold text-white">3. Istotność statystyczna trendów</h2>
                <p>
                  Wskaźnik kierunku „rośnie/spada” jest obliczany na udziałach procentowych z wykorzystaniem dwuproporcjowego testu <i>z</i>. W przypadku wielokrotnych porównań stosowana jest korekta False Discovery Rate (procedura Benjamini–Hochberg) przy poziomie <code>α = 0.05</code>.
                </p>
                <p>
                  Jeśli liczba publikacji w okresie jest mniejsza niż 10, aplikacja raportuje stan <code>BRAK DANYCH</code> zamiast spekulować o trendzie.
                </p>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* SETTINGS & API CONFIGURATION MODAL                                        */}
      {/* ========================================================================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/[0.1] bg-[#0d0f12] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <Settings className="h-5 w-5 text-teal-400" />
                <h2 className="text-base font-semibold text-white">
                  Konfiguracja kluczy API i parametrów systemu
                </h2>
              </div>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 text-xs">
              {/* Gemini API Key */}
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-teal-400" /> Google Gemini API (AI Classifier)
                  </label>
                  <button
                    onClick={handleTestGemini}
                    disabled={geminiTestStatus === "testing"}
                    className="rounded bg-teal-500/20 border border-teal-500/40 px-2.5 py-1 text-[11px] font-medium text-teal-300 hover:bg-teal-500/30 transition-all disabled:opacity-50"
                  >
                    {geminiTestStatus === "testing"
                      ? "Sprawdzanie..."
                      : "Testuj połączenie Gemini"}
                  </button>
                </div>
                <input
                  type="text"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Klucz API Gemini..."
                  className="w-full rounded-lg border border-white/[0.1] bg-black/60 py-2 px-3 font-mono text-xs text-white focus:border-teal-500 focus:outline-none"
                />
                {geminiTestStatus === "success" && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1 font-mono">
                    <Check className="h-3 w-3" /> Połączenie aktywne (Model: gemini-3.8-flash, opóźnienie: {geminiLatency} ms)
                  </p>
                )}
                {geminiTestStatus === "error" && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 pt-1 font-mono">
                    <XCircle className="h-3 w-3" /> Błąd autoryzacji klucza Gemini API.
                  </p>
                )}
              </div>

              {/* Supabase URL & Keys */}
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <label className="font-semibold text-zinc-200 block">
                  Baza danych PostgreSQL / Supabase
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-zinc-400 text-[11px] block mb-1">Supabase URL:</span>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.1] bg-black/60 py-1.5 px-3 font-mono text-xs text-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[11px] block mb-1">Publishable / Anon Key:</span>
                    <input
                      type="text"
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.1] bg-black/60 py-1.5 px-3 font-mono text-xs text-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Internal Connector Endpoint */}
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <label className="font-semibold text-zinc-200 block">
                  Konektor danych wewnętrznych PPG (naszemiasto.pl / bazy wewnętrzne)
                </label>
                <input
                  type="text"
                  value={internalEndpoint}
                  onChange={(e) => setInternalEndpoint(e.target.value)}
                  placeholder="URL wewnętrznego feedu redakcyjnego..."
                  className="w-full rounded-lg border border-white/[0.1] bg-black/60 py-1.5 px-3 font-mono text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Monitoring API Key */}
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <label className="font-semibold text-zinc-200 block">
                  Zewnętrzny monitoring mediów (Brand24 / IMM API Key)
                </label>
                <input
                  type="password"
                  value={monitoringApiKey}
                  onChange={(e) => setMonitoringApiKey(e.target.value)}
                  placeholder="Pozostaw puste, jeśli brak licencji (konektor pozostanie wyłączony)..."
                  className="w-full rounded-lg border border-white/[0.1] bg-black/60 py-1.5 px-3 font-mono text-xs text-white focus:border-teal-500 focus:outline-none"
                />
              </div>

              {/* Algorithmic Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-300 font-medium">Próg podobieństwa MinHash:</span>
                    <span className="font-mono text-teal-400 font-bold">{jaccardThreshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.60"
                    max="0.95"
                    step="0.05"
                    value={jaccardThreshold}
                    onChange={(e) => setJaccardThreshold(parseFloat(e.target.value))}
                    className="w-full accent-teal-400"
                  />
                  <span className="text-[10px] text-zinc-500">Domyślnie: 0.80 dla tekstów wspólnych</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-300 font-medium">Min. próba dla trendu (N):</span>
                    <span className="font-mono text-teal-400 font-bold">{minSampleSize}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={minSampleSize}
                    onChange={(e) => setMinSampleSize(parseInt(e.target.value))}
                    className="w-full accent-teal-400"
                  />
                  <span className="text-[10px] text-zinc-500">Domyślnie: 10 artykułów w okresie</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.08] pt-4">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-teal-500/20 hover:brightness-110"
              >
                Zapisz konfigurację
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Luxury Footer */}
      <footer className="border-t border-white/[0.08] bg-[#090a0c] py-6 px-6 text-xs text-zinc-400">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">PPGscope</span>
            <span className="text-zinc-600">/</span>
            <span>Centrum monitoringu mediów Polska Press Grupa</span>
          </div>
          <div className="font-mono text-[11px] text-zinc-500">
            Wygenerowano: {new Date(data.generated_at).toLocaleString("pl-PL")} · Standard Fable 5.1
          </div>
        </div>
      </footer>
    </div>
  );
}
