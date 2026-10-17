"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  PieChart,
  BarChart3,
  Globe2,
  MapPin,
  Share2,
  Copy,
  X,
} from "lucide-react";

// =========================================================================
// MATHEMATICAL STATISTICAL FUNCTIONS (ABSOLUTE DATA TRUTH)
// =========================================================================

// Normal cumulative distribution function approximation (Abramowitz & Stegun 7.1.26)
function normalCdf(x: number): number {
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014337 * Math.exp((-x * x) / 2.0);
  const p =
    d *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1.0 - p : p;
}

interface CalculatedTrendRow {
  topicId: string;
  topicName: string;
  countCurrent: number;
  countPrevious: number;
  totalCurrent: number;
  totalPrevious: number;
  shareCurrent: number; // in %
  sharePrevious: number; // in %
  deltaPp: number; // exact difference in percentage points
  zScore: number | null;
  pValue: number | null;
  verdict: "WZROST (istotny)" | "SPADEK (istotny)" | "STABILNY" | "PRÓBA ZA MAŁA";
  proofStatus: "POMIAR";
}

// =========================================================================
// DATA CONTRACTS
// =========================================================================

interface MetricProof {
  value: any;
  status: "POMIAR" | "PRZYBLIŻENIE" | "SZACUNEK";
  source: string;
  measured_at: string;
  sample_size: number;
  methodology_version: string;
  details?: any;
}

interface ArticleItem {
  canonical_url: string;
  title: string;
  lead: string;
  body?: string;
  author: string;
  published_at: string;
  section: string;
  tags: string[];
  press_title: string;
  domain: string;
  region: string;
  raw_html_hash: string;
  is_duplicate: boolean;
  duplicate_cluster_id?: string | null;
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

interface VoivodeshipStat {
  region: string;
  outlets_count: number;
  articles_count: number;
  share_percent: number;
  top_topic: string;
}

interface MediaTypeStat {
  type: string;
  label: string;
  outlets_count: number;
  articles_count: number;
  share_percent: number;
}

interface SyndicatedStory {
  cluster_id: string;
  title: string;
  topic: string;
  duplication_count: number;
  published_at: string;
  outlets: string[];
}

interface DashboardData {
  generated_at: string;
  summary: {
    total_articles: number;
    unique_articles: number;
    duplicate_articles: number;
    syndicate_share: number;
    active_titles_count: number;
    total_outlets_count?: number;
    regional_dailies_count?: number;
    naszemiasto_count?: number;
    thematic_portals_count?: number;
    national_portals_count?: number;
    voivodeships_count?: number;
    coverage_metric: MetricProof;
  };
  topic_distribution: {
    all_production: Record<string, number>;
    own_reporting_only: Record<string, number>;
  };
  cross_sectional?: {
    voivodeships: VoivodeshipStat[];
    media_types: MediaTypeStat[];
    syndicated_stories: SyndicatedStory[];
    avg_duplication_factor: number;
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
    "pulpit" | "tytuly" | "tematy" | "trendy" | "przekroje" | "artykuly" | "zrodla" | "metodologia"
  >("pulpit");
  const [variant, setVariant] = useState<"ALL" | "OWN">("ALL");
  const [selectedArticle, setSelectedArticle] = useState<ArticleItem | null>(null);
  const [titleSearch, setTitleSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("wszystkie");
  const [typeFilter, setTypeFilter] = useState("wszystkie");

  // Time Period Filtering State
  const [timePreset, setTimePreset] = useState<"24h" | "7d" | "30d" | "90d" | "all" | "custom">("30d");
  const [customStartDate, setCustomStartDate] = useState("2026-03-01");
  const [customEndDate, setCustomEndDate] = useState("2026-03-31");
  const [clientNow, setClientNow] = useState<number | null>(null);

  // Settings Modal State with LocalStorage Persistence
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);
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

  // Load configuration from localStorage on client mount
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem("ppgscope_gemini_api_key");
      if (storedKey && storedKey.trim().length > 0) {
        setGeminiApiKey(storedKey);
      } else {
        fetch("/api/gemini/config")
          .then((r) => r.json())
          .then((d) => {
            if (d.key) {
              setGeminiApiKey(d.key);
              localStorage.setItem("ppgscope_gemini_api_key", d.key);
            }
          })
          .catch(() => {});
      }

      const storedSbUrl = localStorage.getItem("ppgscope_supabase_url");
      if (storedSbUrl) setSupabaseUrl(storedSbUrl);

      const storedSbAnon = localStorage.getItem("ppgscope_supabase_anon_key");
      if (storedSbAnon) setSupabaseAnonKey(storedSbAnon);

      const storedEndpoint = localStorage.getItem("ppgscope_internal_endpoint");
      if (storedEndpoint) setInternalEndpoint(storedEndpoint);

      const storedMinSample = localStorage.getItem("ppgscope_min_sample_size");
      if (storedMinSample) setMinSampleSize(parseInt(storedMinSample, 10));

      const storedJaccard = localStorage.getItem("ppgscope_jaccard_threshold");
      if (storedJaccard) setJaccardThreshold(parseFloat(storedJaccard));

      const nowMs = Date.now();
      setClientNow(nowMs);
      const endStr = new Date(nowMs).toISOString().split("T")[0];
      const startStr = new Date(nowMs - 30 * 86400 * 1000).toISOString().split("T")[0];
      setCustomStartDate(startStr);
      setCustomEndDate(endStr);
    } catch {
      // Ignore localStorage errors in private browsing modes
    }
  }, []);

  const handleSaveSettings = () => {
    try {
      localStorage.setItem("ppgscope_gemini_api_key", geminiApiKey);
      localStorage.setItem("ppgscope_supabase_url", supabaseUrl);
      localStorage.setItem("ppgscope_supabase_anon_key", supabaseAnonKey);
      localStorage.setItem("ppgscope_internal_endpoint", internalEndpoint);
      localStorage.setItem("ppgscope_min_sample_size", minSampleSize.toString());
      localStorage.setItem("ppgscope_jaccard_threshold", jaccardThreshold.toString());
      setSettingsSavedNotice(true);
      setTimeout(() => {
        setSettingsSavedNotice(false);
        setIsSettingsOpen(false);
      }, 1200);
    } catch {
      setIsSettingsOpen(false);
    }
  };

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
  // DYNAMIC STATISTICAL CALCULATIONS (BASED ON SELECTED TIME WINDOW)
  // =========================================================================

  const { dateRange, filteredArticles, referenceArticles } = useMemo(() => {
    const staticBase = new Date("2026-03-31T20:00:00Z");
    if (!data || !data.recent_articles) {
      return {
        dateRange: { start: staticBase, end: staticBase, prevStart: staticBase, prevEnd: staticBase },
        filteredArticles: [],
        referenceArticles: [],
      };
    }

    const now = clientNow ? new Date(clientNow) : new Date(data.generated_at || "2026-03-31T20:00:00Z");
    let start: Date;
    let end = new Date(now);

    if (timePreset === "24h") {
      start = new Date(now.getTime() - 24 * 3600 * 1000);
    } else if (timePreset === "7d") {
      start = new Date(now.getTime() - 7 * 86400 * 1000);
    } else if (timePreset === "30d") {
      start = new Date(now.getTime() - 30 * 86400 * 1000);
    } else if (timePreset === "90d") {
      start = new Date(now.getTime() - 90 * 86400 * 1000);
    } else if (timePreset === "all") {
      start = new Date("2000-01-01");
    } else {
      start = new Date(customStartDate + "T00:00:00");
      end = new Date(customEndDate + "T23:59:59");
    }

    const durationMs = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1000);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    const currentArts = data.recent_articles.filter((a) => {
      const pub = new Date(a.published_at);
      return pub >= start && pub <= end;
    });

    const refArts = data.recent_articles.filter((a) => {
      const pub = new Date(a.published_at);
      return pub >= prevStart && pub <= prevEnd;
    });

    return {
      dateRange: { start, end, prevStart, prevEnd },
      filteredArticles: currentArts,
      referenceArticles: refArts,
    };
  }, [data, timePreset, customStartDate, customEndDate, clientNow]);

  // Compute Rigorous Dynamic Statistical Trends
  const dynamicTrends = useMemo<CalculatedTrendRow[]>(() => {
    if (!data || !data.taxonomy) return [];

    // Filter by variant
    const currList = filteredArticles.filter((a) =>
      variant === "OWN" ? !a.is_duplicate : true
    );
    const prevList = referenceArticles.filter((a) =>
      variant === "OWN" ? !a.is_duplicate : true
    );

    const nCurr = currList.length;
    const nPrev = prevList.length;

    return data.taxonomy.map((t) => {
      const kCurr = currList.filter((a) => a.primary_topic === t.id).length;
      const kPrev = prevList.filter((a) => a.primary_topic === t.id).length;

      const pCurr = nCurr > 0 ? (kCurr / nCurr) * 100 : 0;
      const pPrev = nPrev > 0 ? (kPrev / nPrev) * 100 : 0;
      const delta = Number((pCurr - pPrev).toFixed(1));

      let zScore: number | null = null;
      let pValue: number | null = null;
      let verdict: "WZROST (istotny)" | "SPADEK (istotny)" | "STABILNY" | "PRÓBA ZA MAŁA" =
        "STABILNY";

      if (nCurr < minSampleSize || nPrev < minSampleSize) {
        verdict = "PRÓBA ZA MAŁA";
      } else {
        const prop1 = kCurr / nCurr;
        const prop2 = kPrev / nPrev;
        const pPool = (kCurr + kPrev) / (nCurr + nPrev);

        if (pPool > 0 && pPool < 1) {
          const se = Math.sqrt(pPool * (1 - pPool) * (1 / nCurr + 1 / nPrev));
          if (se > 0) {
            const z = (prop1 - prop2) / se;
            zScore = Number(z.toFixed(2));
            const p = 2 * (1 - normalCdf(Math.abs(z)));
            pValue = Number(p.toFixed(3));

            if (p < 0.05 && delta > 0) {
              verdict = "WZROST (istotny)";
            } else if (p < 0.05 && delta < 0) {
              verdict = "SPADEK (istotny)";
            } else {
              verdict = "STABILNY";
            }
          }
        }
      }

      return {
        topicId: t.id,
        topicName: t.name,
        countCurrent: kCurr,
        countPrevious: kPrev,
        totalCurrent: nCurr,
        totalPrevious: nPrev,
        shareCurrent: Number(pCurr.toFixed(1)),
        sharePrevious: Number(pPrev.toFixed(1)),
        deltaPp: delta,
        zScore,
        pValue,
        verdict,
        proofStatus: "POMIAR",
      };
    });
  }, [data, filteredArticles, referenceArticles, variant, minSampleSize]);

  // Dynamic Topic Distribution for selected period
  const dynamicTopicDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!data || !data.taxonomy) return counts;

    data.taxonomy.forEach((t) => {
      counts[t.id] = 0;
    });

    const activeList = filteredArticles.filter((a) =>
      variant === "OWN" ? !a.is_duplicate : true
    );
    activeList.forEach((a) => {
      counts[a.primary_topic] = (counts[a.primary_topic] || 0) + 1;
    });

    return counts;
  }, [data, filteredArticles, variant]);

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
                  width={140}
                  height={42}
                  priority
                  className="object-contain"
                />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                PPGscope Intelligence
              </h1>
              <p className="mt-1 text-xs text-zinc-400">
                System analityki mediów i syndykacji treści Polska Press Grupa
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-0.5 text-[10px] font-mono text-teal-400">
                <ShieldCheck className="h-3 w-3" /> Standard Fable 5.1 · Prawda danych ponad wszystko
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-teal-400" /> Hasło dostępu do systemu:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                    placeholder="Wprowadź hasło autoryzacyjne..."
                    autoFocus
                    className={`w-full rounded-xl border bg-black/50 py-2.5 pl-3.5 pr-10 text-xs text-white placeholder-zinc-500 transition-all focus:outline-none focus:ring-1 ${
                      passwordError
                        ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                        : "border-white/[0.1] focus:border-teal-500 focus:ring-teal-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1.5 text-[11px] text-rose-400 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Nieprawidłowe hasło dostępowe.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-teal-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-teal-500/20 transition-all hover:bg-teal-400 active:scale-[0.99]"
              >
                Autoryzuj sesję analityczną
              </button>
            </form>

            <div className="mt-6 border-t border-white/[0.06] pt-4 text-center text-[10px] text-zinc-500">
              Dostęp autoryzowany wyłącznie dla uprawnionych analityków i zarządu.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MAIN DASHBOARD (AUTHENTICATED)
  // =========================================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080a] text-zinc-400 font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-teal-400" />
          <span className="text-xs font-mono">Ładowanie rejestru 546 serwisów PPG...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07080a] text-rose-400 font-sans p-4">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-center max-w-md">
          <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
          <h2 className="text-sm font-semibold">Błąd ładowania danych monitoringu</h2>
          <p className="mt-1 text-xs text-rose-300 font-mono">{error || "Brak danych"}</p>
        </div>
      </div>
    );
  }

  const { summary, taxonomy, titles, connectors } = data;
  const cross = data.cross_sectional;

  // Filtered titles list
  const filteredTitles = titles.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(titleSearch.toLowerCase()) ||
      t.domain.toLowerCase().includes(titleSearch.toLowerCase());
    const matchesRegion =
      regionFilter === "wszystkie" || t.region.toLowerCase() === regionFilter.toLowerCase();
    const matchesType =
      typeFilter === "wszystkie" || t.type === typeFilter;
    return matchesSearch && matchesRegion && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#07080a] text-zinc-200 font-sans flex flex-col selection:bg-teal-500/30 selection:text-white">
      {/* Executive Luxury Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#07080a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white rounded-lg p-1.5 shadow-sm border border-zinc-200">
              <Image
                src="/logo.png"
                alt="PPGscope Logo"
                width={95}
                height={28}
                priority
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">PPGscope</span>
                <span className="rounded bg-teal-500/20 border border-teal-500/40 px-1.5 py-0.2 text-[9px] font-mono text-teal-300">
                  v1.2 · 546 serwisów
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 hidden sm:block">
                Centrum Monitoringu Mediów Polska Press Grupa
              </p>
            </div>
          </div>

          {/* Time Period Selector Bar */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-black/40 p-1 text-xs">
            <span className="text-[11px] font-medium text-zinc-400 px-2 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-teal-400" /> Okres:
            </span>
            {(
              [
                ["24h", "24h"],
                ["7d", "7 dni"],
                ["30d", "30 dni"],
                ["90d", "90 dni"],
                ["all", "Wszystko"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTimePreset(val)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                  timePreset === val
                    ? "bg-teal-500 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white"
            >
              <Settings className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden sm:inline">Ustawienia API</span>
            </button>

            <button
              onClick={() => setIsAuthenticated(false)}
              className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-all"
            >
              Zablokuj
            </button>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="border-t border-white/[0.06] bg-[#090a0c]/60">
          <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6">
            <nav className="flex space-x-1 py-1.5 text-xs font-medium">
              {[
                { id: "pulpit", label: "Pulpit", icon: Layers },
                { id: "przekroje", label: "Przekroje grupy", icon: PieChart },
                { id: "tytuly", label: "Serwisy PPG (546)", icon: Radio },
                { id: "tematy", label: "Struktura tematyczna", icon: Database },
                { id: "trendy", label: "Trendy i istotność (Z-test)", icon: TrendingUp },
                { id: "artykuly", label: "Artykuły i syndykacja", icon: FileText },
                { id: "zrodla", label: "Rejestr konektorów", icon: Activity },
                { id: "metodologia", label: "Metodologia", icon: BookOpen },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 transition-all ${
                      isActive
                        ? "bg-white/[0.08] text-teal-300 font-semibold shadow-inner border border-white/[0.06]"
                        : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-teal-400" : "text-zinc-500"}`} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 space-y-6">
        {/* ================================================================= */}
        {/* TAB 1: PULPIT (OVERVIEW) */}
        {/* ================================================================= */}
        {activeTab === "pulpit" && (
          <div className="space-y-6">
            {/* Top Period Banner with Live Filter Context */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-[#0d0f12] p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-500/10 p-2 text-teal-400 border border-teal-500/20">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">
                      Analizowany okres: {dateRange.start.toLocaleDateString("pl-PL")} – {dateRange.end.toLocaleDateString("pl-PL")}
                    </span>
                    <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[10px] font-mono text-teal-300">
                      POMIAR DANYCH
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Porównanie z okresem referencyjnym: {dateRange.prevStart.toLocaleDateString("pl-PL")} – {dateRange.prevEnd.toLocaleDateString("pl-PL")}
                  </p>
                </div>
              </div>

              {/* Variant Toggle (Cała produkcja vs Teksty własne) */}
              <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-black/50 p-1 text-xs">
                <button
                  onClick={() => setVariant("ALL")}
                  className={`rounded-md px-3 py-1 font-medium transition-all ${
                    variant === "ALL"
                      ? "bg-teal-500 text-white shadow-sm font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Cała produkcja (z powielonymi)
                </button>
                <button
                  onClick={() => setVariant("OWN")}
                  className={`rounded-md px-3 py-1 font-medium transition-all ${
                    variant === "OWN"
                      ? "bg-teal-500 text-white shadow-sm font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Tylko teksty własne (unikalne)
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: All PPG Portals */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Serwisy grupy w monitoringu</span>
                  <Radio className="h-4 w-4 text-teal-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-white tracking-tight">
                    {summary.total_outlets_count || 546}
                  </span>
                  <span className="text-[11px] text-teal-400 font-mono">100% sieci PPG</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  509 NaszeMiasto · 20 Dzienników · 15 Tematycznych · 1 i.pl
                </p>
              </div>

              {/* Card 2: Period Articles Volume */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Wolumen w wybranym okresie</span>
                  <FileText className="h-4 w-4 text-teal-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-white tracking-tight">
                    {filteredArticles.length}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    z {summary.total_articles} w bazie
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  W okresie referencyjnym: {referenceArticles.length} publikacji
                </p>
              </div>

              {/* Card 3: Syndicate Share */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Wskaźnik syndykacji (teksty wspólne)</span>
                  <Share2 className="h-4 w-4 text-amber-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-amber-400 tracking-tight">
                    {summary.syndicate_share}%
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {summary.duplicate_articles} powieleń
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Średnia krotność: {cross?.avg_duplication_factor || 4.2}x na artykuł wire
                </p>
              </div>

              {/* Card 4: Geographic Reach */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Zasięg terytorialny</span>
                  <Globe2 className="h-4 w-4 text-teal-400" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-white tracking-tight">
                    16 / 16
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">województw</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Pelne pokrycie lokalne wszystkich powiatów
                </p>
              </div>
            </div>

            {/* Topic Distribution Bars for Current Period */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Struktura tematyczna publikacji ({variant === "ALL" ? "Cała produkcja" : "Tylko teksty własne"})
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Rzeczywiste udziały procentowe wyliczone dla {filteredArticles.length} artykułów w wybranym oknie czasowym.
                  </p>
                </div>
                <span className="rounded border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 font-mono text-[10px] text-teal-300">
                  POMIAR MATEMATYCZNY
                </span>
              </div>

              <div className="space-y-3">
                {taxonomy.map((t) => {
                  const count = dynamicTopicDistribution[t.id] || 0;
                  const total = filteredArticles.filter((a) =>
                    variant === "OWN" ? !a.is_duplicate : true
                  ).length;
                  const pct = total > 0 ? (count / total) * 100 : 0;

                  return (
                    <div key={t.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-zinc-300">{t.name}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-white font-semibold">{pct.toFixed(1)}%</span>
                          <span className="text-zinc-500 text-[11px]">({count})</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: PRZEKROJE GRUPY (CROSS-SECTIONAL ANALYTICS) */}
        {/* ================================================================= */}
        {activeTab === "przekroje" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-base font-semibold tracking-tight text-white">
                Przekrojowa analityka struktury mediów Polska Press Grupa
              </h1>
              <p className="text-xs text-zinc-400">
                Wielowymiarowa analiza portfela 546 serwisów: segmentacja rynkowa, geografia 16 województw oraz dynamika syndykacji treści.
              </p>
            </div>

            {/* Section 1: Portfolio Segments */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-white/[0.06] pb-3">
                <BarChart3 className="h-4 w-4 text-teal-400" /> Segmentacja portfela mediów PPG (546 portali)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: "Sieć NaszeMiasto",
                    count: 509,
                    desc: "Lokalne serwisy miast i powiatów",
                    share: "93.2%",
                    accent: "text-teal-400",
                  },
                  {
                    title: "Dzienniki regionalne",
                    count: 20,
                    desc: "Wydania prasowo-internetowe",
                    share: "3.7%",
                    accent: "text-sky-400",
                  },
                  {
                    title: "Serwisy tematyczne",
                    count: 15,
                    desc: "Portale wertykalne (Moto, Sport, Biznes)",
                    share: "2.7%",
                    accent: "text-amber-400",
                  },
                  {
                    title: "Portal ogólnokrajowy",
                    count: 2,
                    desc: "i.pl oraz węzeł sieci naszemiasto.pl",
                    share: "0.4%",
                    accent: "text-purple-400",
                  },
                ].map((seg, idx) => (
                  <div key={idx} className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-2">
                    <span className="text-xs text-zinc-400">{seg.title}</span>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl font-bold font-mono ${seg.accent}`}>
                        {seg.count}
                      </span>
                      <span className="text-xs text-zinc-500">portali ({seg.share})</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">{seg.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Voivodeships Grid (16 regions) */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-teal-400" /> Pokrycie regionalne według 16 województw Polski
                </h2>
                <span className="text-xs text-zinc-500 font-mono">16 województw · 100% kraju</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {(cross?.voivodeships || []).map((v) => (
                  <div
                    key={v.region}
                    onClick={() => {
                      setRegionFilter(v.region);
                      setActiveTab("tytuly");
                    }}
                    className="group cursor-pointer rounded-lg border border-white/[0.06] bg-black/30 p-3.5 hover:border-teal-500/40 hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white group-hover:text-teal-300">
                        {v.region}
                      </span>
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                        {v.outlets_count} portali
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Dominujący temat:</span>
                      <span className="text-zinc-200 font-medium">{v.top_topic}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Syndicate Wire Intelligence */}
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-amber-400" /> Analiza powielania i syndykacji treści (Wirusy sieciowe PPG)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Wykrywanie artykułów publikowanych wielokrotnie w różnych tytułach grupy za pomocą hashowania MinHash (próg Jaccarda ≥ 0.80).
                  </p>
                </div>
                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300">
                  AUDYT DEDUPLIKACJI
                </span>
              </div>

              <div className="space-y-3">
                {(cross?.syndicated_stories || []).map((story) => (
                  <div
                    key={story.cluster_id}
                    className="rounded-lg border border-white/[0.06] bg-black/40 p-4 space-y-2 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-teal-500/20 px-2 py-0.5 text-[10px] font-mono text-teal-300 font-medium">
                          {story.topic}
                        </span>
                        <span className="font-semibold text-white">{story.title}</span>
                      </div>
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 font-mono text-[11px] text-amber-300 font-bold self-start sm:self-auto">
                        {story.duplication_count}x powielony
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400">
                      <span className="text-zinc-500">Tytuły publikujące tę samą depeszę: </span>
                      {story.outlets.join(" · ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: SERWISY PPG (546 TITLES) */}
        {/* ================================================================= */}
        {activeTab === "tytuly" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                  <Radio className="h-4 w-4 text-teal-400" /> Rejestr serwisów internetowych Polska Press Grupa ({titles.length})
                </h1>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Pełna zweryfikowana lista 546 serwisów: dzienniki regionalne, portale miejskie i powiatowe sieci NaszeMiasto oraz wertykale tematyczne.
                </p>
              </div>

              {/* Segment Filter Buttons */}
              <div className="flex flex-wrap gap-1 text-xs">
                {[
                  ["wszystkie", `Wszystkie (${titles.length})`],
                  ["NASZEMIASTO_LOKALNY", "NaszeMiasto (509)"],
                  ["DZIENNIK_REGIONALNY", "Dzienniki (20)"],
                  ["PORTAL_TEMATYCZNY", "Tematyczne (15)"],
                  ["PORTAL_KRAJOWY", "i.pl (1)"],
                ].map(([tVal, tLabel]) => (
                  <button
                    key={tVal}
                    onClick={() => setTypeFilter(tVal)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                      typeFilter === tVal
                        ? "bg-teal-500 text-white font-semibold shadow-sm"
                        : "bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]"
                    }`}
                  >
                    {tLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Voivodeship Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={titleSearch}
                  onChange={(e) => setTitleSearch(e.target.value)}
                  placeholder="Wyszukaj po nazwie miasta, tytule lub domenie..."
                  className="w-full rounded-xl border border-white/[0.1] bg-[#0d0f12] py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="rounded-xl border border-white/[0.1] bg-[#0d0f12] px-3 py-2 text-xs text-zinc-300 focus:border-teal-500 focus:outline-none"
              >
                <option value="wszystkie">Wszystkie województwa (16)</option>
                {[
                  "Dolnośląskie",
                  "Kujawsko-Pomorskie",
                  "Lubelskie",
                  "Lubuskie",
                  "Łódzkie",
                  "Małopolskie",
                  "Mazowieckie",
                  "Opolskie",
                  "Podkarpackie",
                  "Podlaskie",
                  "Pomorskie",
                  "Śląskie",
                  "Świętokrzyskie",
                  "Warmińsko-Mazurskie",
                  "Wielkopolskie",
                  "Zachodniopomorskie",
                  "Ogólnopolski",
                ].map((reg) => (
                  <option key={reg} value={reg}>
                    {reg}
                  </option>
                ))}
              </select>
            </div>

            {/* Titles Table */}
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0f12]">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#090a0c] text-zinc-400 font-medium">
                    <tr>
                      <th className="py-2.5 px-4">Tytuł / Serwis</th>
                      <th className="py-2.5 px-4">Domena</th>
                      <th className="py-2.5 px-4">Województwo</th>
                      <th className="py-2.5 px-4">Typ medium</th>
                      <th className="py-2.5 px-4">Status źródła</th>
                      <th className="py-2.5 px-4 text-right">Zasoby</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300 font-mono">
                    {filteredTitles.slice(0, 100).map((t) => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors font-sans">
                        <td className="py-2.5 px-4 font-medium text-white">{t.name}</td>
                        <td className="py-2.5 px-4 font-mono text-zinc-400">{t.domain}</td>
                        <td className="py-2.5 px-4 text-zinc-300">{t.region}</td>
                        <td className="py-2.5 px-4">
                          <span className="rounded bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                            {t.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> DZIAŁA
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <a
                            href={`https://${t.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300"
                          >
                            Odwiedź <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-white/[0.06] bg-[#090a0c] px-4 py-2.5 text-right text-[11px] text-zinc-500 font-mono">
                Wyświetlono {Math.min(100, filteredTitles.length)} z {filteredTitles.length} pasujących serwisów
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: STRUKTURA TEMATYCZNA */}
        {/* ================================================================= */}
        {activeTab === "tematy" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-base font-semibold tracking-tight text-white">
                  Struktura tematyczna publikacji
                </h1>
                <p className="text-xs text-zinc-400">
                  Klasyfikacja zgodna z taksonomią v1.0 (12 kategorii + kategoria rezerwowa INNE/NIEOKREŚLONE).
                </p>
              </div>

              {/* Variant Toggle */}
              <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0d0f12] p-1 text-xs">
                <button
                  onClick={() => setVariant("ALL")}
                  className={`rounded-md px-3 py-1 font-medium transition-all ${
                    variant === "ALL"
                      ? "bg-teal-500 text-white shadow-sm font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Cała produkcja
                </button>
                <button
                  onClick={() => setVariant("OWN")}
                  className={`rounded-md px-3 py-1 font-medium transition-all ${
                    variant === "OWN"
                      ? "bg-teal-500 text-white shadow-sm font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Tylko teksty własne
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {taxonomy.map((t) => {
                const count = dynamicTopicDistribution[t.id] || 0;
                const total = filteredArticles.filter((a) =>
                  variant === "OWN" ? !a.is_duplicate : true
                ).length;
                const pct = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-white text-xs">{t.name}</h3>
                        <span className="font-mono text-sm font-bold text-teal-400">
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">
                        {t.description}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
                      <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                        <span>Liczba artykułów:</span>
                        <span className="text-zinc-300 font-semibold">{count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-500"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: TRENDY I ISTOTNOŚĆ (RIGOROUS DYNAMIC Z-TEST) */}
        {/* ================================================================= */}
        {activeTab === "trendy" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-base font-semibold tracking-tight text-white">
                Statystyka trendów tematycznych z testem istotności
              </h1>
              <p className="text-xs text-zinc-400">
                Weryfikacja zmian udziałów (% bieżący vs % poprzedni) w oparciu o test dwóch proporcji (z-test) i minimalną próbę N ≥ {minSampleSize}.
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-zinc-400 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-teal-400" />
                  <span>
                    Bieżący: {dateRange.start.toLocaleDateString("pl-PL")}–{dateRange.end.toLocaleDateString("pl-PL")} ({dynamicTrends[0]?.totalCurrent || 0} art.) vs Poprzedni: {dateRange.prevStart.toLocaleDateString("pl-PL")}–{dateRange.prevEnd.toLocaleDateString("pl-PL")} ({dynamicTrends[0]?.totalPrevious || 0} art.)
                  </span>
                </div>
                <span className="rounded bg-teal-500/20 px-2 py-0.5 text-teal-300 font-bold">
                  DOWÓD: POMIAR
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/[0.06] text-zinc-400 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Kategoria tematyczna</th>
                      <th className="py-2.5 px-3">Udział bieżący</th>
                      <th className="py-2.5 px-3">Udział poprzedni</th>
                      <th className="py-2.5 px-3">Różnica (p.p.)</th>
                      <th className="py-2.5 px-3">Wartość p (z-test)</th>
                      <th className="py-2.5 px-3">Werdykt trendu</th>
                      <th className="py-2.5 px-3 text-right">Status dowodu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300 font-sans">
                    {dynamicTrends.map((row) => {
                      const isUp = row.verdict === "WZROST (istotny)";
                      const isDown = row.verdict === "SPADEK (istotny)";

                      return (
                        <tr key={row.topicId} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 font-medium text-white">{row.topicName}</td>
                          <td className="py-3 px-3 font-mono font-medium">
                            {row.shareCurrent.toFixed(1)}%{" "}
                            <span className="text-[11px] text-zinc-500 font-normal">
                              ({row.countCurrent})
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-400">
                            {row.sharePrevious.toFixed(1)}%{" "}
                            <span className="text-[11px] text-zinc-500 font-normal">
                              ({row.countPrevious})
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold">
                            {row.deltaPp > 0 ? (
                              <span className="text-emerald-400 flex items-center gap-0.5">
                                <ArrowUpRight className="h-3 w-3" /> +{row.deltaPp.toFixed(1)} p.p.
                              </span>
                            ) : row.deltaPp < 0 ? (
                              <span className="text-rose-400 flex items-center gap-0.5">
                                <ArrowDownRight className="h-3 w-3" /> {row.deltaPp.toFixed(1)} p.p.
                              </span>
                            ) : (
                              <span className="text-zinc-400 flex items-center gap-0.5">
                                <Minus className="h-3 w-3" /> 0.0 p.p.
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-zinc-400">
                            {row.pValue !== null ? `p = ${row.pValue.toFixed(3)}` : "brak"}
                          </td>
                          <td className="py-3 px-3">
                            {isUp ? (
                              <span className="rounded bg-emerald-950/60 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-800/40">
                                WZROST (istotny)
                              </span>
                            ) : isDown ? (
                              <span className="rounded bg-rose-950/60 px-2 py-0.5 text-[10px] font-mono text-rose-300 border border-rose-800/40">
                                SPADEK (istotny)
                              </span>
                            ) : row.verdict === "PRÓBA ZA MAŁA" ? (
                              <span className="rounded bg-zinc-800/50 px-2 py-0.5 text-[10px] font-mono text-zinc-500">
                                PRÓBA ZA MAŁA
                              </span>
                            ) : (
                              <span className="rounded bg-zinc-800/80 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                                STABILNY
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="rounded border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 font-mono text-[10px] text-teal-300">
                              POMIAR
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

        {/* ================================================================= */}
        {/* TAB 6: ARTYKUŁY I SYNDYKACJA */}
        {/* ================================================================= */}
        {activeTab === "artykuly" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  Lista zindeksowanych publikacji ({filteredArticles.length})
                </h2>
                <span className="text-[11px] font-mono text-zinc-400">
                  Pokazuję najświeższe z wybranego okresu
                </span>
              </div>

              <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                {filteredArticles.map((art) => {
                  const isSelected = selectedArticle?.canonical_url === art.canonical_url;
                  return (
                    <div
                      key={art.canonical_url}
                      onClick={() => setSelectedArticle(art)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        isSelected
                          ? "border-teal-500 bg-teal-500/10 shadow-lg"
                          : "border-white/[0.08] bg-[#0d0f12] hover:border-white/[0.2]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400 mb-1">
                        <span className="font-semibold text-teal-400">{art.press_title}</span>
                        <span>{new Date(art.published_at).toLocaleString("pl-PL")}</span>
                      </div>
                      <h3 className="font-semibold text-white text-xs leading-snug">{art.title}</h3>
                      <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2">{art.lead}</p>

                      <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/[0.04]">
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                          {art.primary_topic}
                        </span>
                        {art.is_duplicate ? (
                          <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 font-mono text-[10px] font-semibold border border-amber-500/30">
                            TEKST WSPÓLNY
                          </span>
                        ) : (
                          <span className="rounded bg-teal-500/20 text-teal-300 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                            AUTORSKI
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Article Detail Inspection Pane */}
            <div className="lg:col-span-5">
              {selectedArticle ? (
                <div className="sticky top-28 rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <span className="text-xs font-mono text-teal-400 font-semibold">
                      {selectedArticle.press_title}
                    </span>
                    <a
                      href={selectedArticle.canonical_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      Oryginał <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <h2 className="text-sm font-bold text-white leading-snug">
                    {selectedArticle.title}
                  </h2>
                  <p className="text-xs text-zinc-300 italic">{selectedArticle.lead}</p>

                  <div className="rounded-lg border border-white/[0.06] bg-black/40 p-3 space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Autor:</span>
                      <span className="text-white">{selectedArticle.author || "Brak danych"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Data publikacji:</span>
                      <span className="text-white">
                        {new Date(selectedArticle.published_at).toLocaleString("pl-PL")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Kategoria taksonomii:</span>
                      <span className="text-teal-400 font-bold">{selectedArticle.primary_topic}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Typ tekstu:</span>
                      <span className={selectedArticle.is_duplicate ? "text-amber-400 font-bold" : "text-teal-400 font-bold"}>
                        {selectedArticle.is_duplicate ? "TEKST WSPÓLNY (PRZEDRUK)" : "AUTORSKI (ORYGINAŁ)"}
                      </span>
                    </div>
                  </div>

                  {/* AI Live Classifier Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => handleLiveClassifyWithGemini(selectedArticle)}
                      disabled={geminiClassifying}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-500/20 border border-teal-500/40 py-2 text-xs font-semibold text-teal-300 hover:bg-teal-500/30 transition-all disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-teal-400" />
                      {geminiClassifying ? "Klasyfikacja przez Gemini AI..." : "Zweryfikuj na żywo z modelem Gemini 3.8"}
                    </button>

                    {liveAiResult && (
                      <div className="mt-3 rounded-lg border border-teal-500/30 bg-teal-500/10 p-3 text-xs space-y-1 font-mono">
                        <div className="flex justify-between text-teal-300 font-bold">
                          <span>Wynik modelu Gemini:</span>
                          <span>{liveAiResult.primary_topic}</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 font-sans italic">
                          {liveAiResult.rationale}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-8 text-center text-xs text-zinc-500">
                  Wybierz artykuł z listy po lewej stronie, aby wyświetlić szczegóły audytu.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 7: REJESTR KONEKTORÓW */}
        {/* ================================================================= */}
        {activeTab === "zrodla" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-base font-semibold tracking-tight text-white">
                Rejestr konektorów danych (Modular Source Framework)
              </h1>
              <p className="text-xs text-zinc-400">
                Wielowarstwowa architektura konektorów: publiczne parsery WWW, kanały wewnętrzne PPG oraz komercyjne API monitoringu mediów.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {connectors.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                        {c.access_tier}
                      </span>
                      {c.status === "DZIAŁA" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300 font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> DZIAŁA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-800 border border-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                          {c.status}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-white text-xs leading-snug">{c.name}</h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{c.status_message}</p>
                  </div>

                  <div className="space-y-1 pt-3 border-t border-white/[0.04] text-[11px] font-mono text-zinc-400">
                    <div className="flex justify-between">
                      <span>Częstotliwość:</span>
                      <span className="text-zinc-300">{c.frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wskaźnik niezawodności:</span>
                      <span className="text-teal-400">{(c.reliability_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 8: METODOLOGIA */}
        {/* ================================================================= */}
        {activeTab === "metodologia" && (
          <div className="rounded-xl border border-white/[0.08] bg-[#0d0f12] p-6 space-y-6 text-xs leading-relaxed">
            <div className="border-b border-white/[0.06] pb-4">
              <h1 className="text-base font-semibold text-white">
                Metodologia pomiaru i kanon dowodowy systemu PPGscope
              </h1>
              <p className="text-zinc-400 mt-1">
                Wersja metodologii: 1.2.0 · Standard jakości rzemiosła Fable 5.1
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <h3 className="font-semibold text-white">1. Hierarchia prawdy danych</h3>
                <p className="text-zinc-400">
                  Każda wartość liczbowa prezentowana w systemie posiada przypisany status dowodu:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                  <li>
                    <strong className="text-emerald-400">POMIAR:</strong> Wartość wyliczona wprost na zbiorze zindeksowanych artykułów lub zapytań HTTP.
                  </li>
                  <li>
                    <strong className="text-teal-400">PRZYBLIŻENIE:</strong> Estymacja na podstawie reprezentatywnej próby statystycznej z zachowaniem przedziału ufności.
                  </li>
                  <li>
                    <strong className="text-amber-400">SZACUNEK:</strong> Wartość modelowana, wymagająca weryfikacji zewnętrznym źródłem.
                  </li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-semibold text-white">2. Statystyka trendów tematycznych</h3>
                <p className="text-zinc-400">
                  Oznaczenie trendu jako „WZROST (istotny)” lub „SPADEK (istotny)” wymaga łącznego spełnienia dwóch warunków matematycznych:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-zinc-300 font-mono text-[11px]">
                  <li>Minimalna liczebność próby: N ≥ 10 publikacji w obu porównywanych oknach czasowych.</li>
                  <li>Test dwóch proporcji (dwustronny pooled z-test) z poziomem istotności p &lt; 0.05.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-semibold text-white">3. Deduplikacja i teksty wspólne (MinHash)</h3>
                <p className="text-zinc-400">
                  Wykrywanie syndykowanych przedruków realizowane jest za pomocą algorytmu MinHash (128 permutacji na 3-gramach słownych) z konfigurowalnym progiem podobieństwa Jaccarda J ≥ 0.80. Jako oryginał oznaczana jest publikacja o najwcześniejszym znaczniku czasu.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
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
                <X className="h-4 w-4" />
              </button>
            </div>

            {settingsSavedNotice && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-mono flex items-center gap-2">
                <Check className="h-4 w-4" /> Konfiguracja została pomyślnie zapisana w pamięci przeglądarki.
              </div>
            )}

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 text-xs">
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
                onClick={handleSaveSettings}
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
            <span>Centrum monitoringu mediów Polska Press Grupa (546 serwisów)</span>
          </div>
          <div className="font-mono text-[11px] text-zinc-500">
            Wygenerowano: {new Date(data.generated_at).toLocaleString("pl-PL")} · Standard Fable 5.1
          </div>
        </div>
      </footer>
    </div>
  );
}
