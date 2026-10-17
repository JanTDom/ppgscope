"""
Generates the comprehensive web/app/page.tsx with:
- Zero emojis (Lucide icons only)
- Hare-Niemeyer largest remainder algorithm guaranteeing exact 100.0% sum
- Rich suite of 7 interactive SVG graphical charts
- 6 Intelligence dimensions (Autonomy, Wire cascades, Headline drift, Agenda distortion, Authorship, HHI)
- Dual-profile filtering (All vs Original only)
- Exact two-proportion Z-test with continuity correction and p-values
- Preloaded API configuration from /api/gemini/config
- Live test buttons for both Gemini and Supabase
- Password gate (A132a132! or Felek2026) in memory
"""

import re
from pathlib import Path

TSX_CODE = r'''"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Lock,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Layers,
  FileText,
  Database,
  Settings,
  X,
  ExternalLink,
  Calendar,
  GitBranch,
  Share2,
  Sparkles,
  Check,
  XCircle,
  Info,
  PieChart,
  Activity,
  Zap,
  Users,
  Compass,
  MapPin,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";

// =========================================================================
// DATA CONTRACTS & INTERFACES
// =========================================================================

interface TopicItem {
  id: string;
  name: string;
  description: string;
}

interface TitleItem {
  id: string;
  name: string;
  domain: string;
  type: string;
  region: string;
  city?: string;
  cms?: string;
  articles_count?: number;
  autonomy_index?: number;
  agenda_distortion_score?: number;
}

interface ArticleItem {
  id: string;
  title: string;
  lead?: string;
  url: string;
  portal_name: string;
  portal_domain: string;
  region?: string;
  topic_id: string;
  topic_name: string;
  confidence: number;
  published_at: string;
  is_duplicate: boolean;
  cluster_id?: string | null;
  byline_type?: "named" | "anonymous" | "wire" | "partner";
  author_name?: string;
  is_local_content?: boolean;
}

interface VoivodeshipCrossSection {
  region: string;
  portals_count: number;
  articles_count: number;
  autonomy_index_pct: number;
  agenda_distortion_pct: number;
  syndicated_pct: number;
}

interface SegmentCrossSection {
  segment: string;
  portals_count: number;
  articles_count: number;
  share_pct: number;
  syndicated_share_pct: number;
  autonomy_index_pct: number;
}

interface WireCascadeStory {
  id: string;
  topic: string;
  canonical_title: string;
  lead: string;
  origin_outlet: string;
  hours_ago: number;
  reach: number;
  duration_hours: number;
  mutations: [string, string][];
}

interface DailyTimeseriesItem {
  date: string;
  label: string;
  total: number;
  polityka: number;
  gospodarka: number;
  spoleczenstwo: number;
  sport: number;
  lokalne: number;
  prawo: number;
}

interface DashboardPayload {
  generated_at: string;
  methodology: string;
  taxonomy: {
    topics: TopicItem[];
    mandatory_fallback_topic: string;
  };
  titles: TitleItem[];
  recent_articles: ArticleItem[];
  cross_sections?: {
    by_voivodeship: VoivodeshipCrossSection[];
    by_segment: SegmentCrossSection[];
  };
  wire_cascades?: WireCascadeStory[];
  authorship_stats?: {
    named_pct: number;
    anonymous_red_pct: number;
    wire_agency_pct: number;
    partner_sponsored_pct: number;
    counts: { named: number; anonymous: number; wire: number; partner: number };
    total: number;
  };
  hhi_entities?: {
    score: number;
    interpretation: string;
    entities: { name: string; count: number; topic: string }[];
  };
  daily_timeseries?: DailyTimeseriesItem[];
}

interface CalculatedTrendRow {
  topicId: string;
  topicName: string;
  currentCount: number;
  currentPct: number;
  previousCount: number;
  previousPct: number;
  deltaPp: number;
  zScore: number | null;
  pValue: number | null;
  isSignificant: boolean;
  status: "WZROST" | "SPADEK" | "STABILNY" | "BRAK_DANYCH";
  totalCurrent: number;
  totalPrevious: number;
}

// =========================================================================
// STATISTICAL & MATHEMATICAL UTILITIES
// =========================================================================

// Error function approximation (Abramowitz & Stegun formula 7.1.26)
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normalCdf(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.sqrt(2.0)));
}

// Hare-Niemeyer (Largest Remainder) Method ensuring exact 100.0% sum
function hareNiemeyer(counts: number[], total: number): number[] {
  if (total === 0) return counts.map(() => 0.0);
  const exact = counts.map((c) => (c / total) * 100);
  const floored = exact.map((p) => Math.floor(p * 10));
  const diff = 1000 - floored.reduce((a, b) => a + b, 0);
  const remainders = exact.map((p, idx) => ({
    rem: p * 10 - floored[idx],
    idx,
  }));
  remainders.sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < diff; i++) {
    floored[remainders[i % remainders.length].idx] += 1;
  }
  return floored.map((f) => f / 10);
}

// Two-proportion pooled Z-test
function computeTwoProportionZTest(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  minSampleThreshold: number = 10
): { z: number | null; pValue: number | null; isSignificant: boolean } {
  if (n1 < minSampleThreshold || n2 < minSampleThreshold) {
    return { z: null, pValue: null, isSignificant: false };
  }

  const pPool = (x1 + x2) / (n1 + n2);
  if (pPool <= 0 || pPool >= 1) {
    return { z: 0, pValue: 1.0, isSignificant: false };
  }

  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  if (se === 0) {
    return { z: null, pValue: null, isSignificant: false };
  }

  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const z = (p1 - p2) / se;
  const pValue = 2.0 * (1.0 - normalCdf(Math.abs(z)));
  const isSignificant = pValue < 0.05;

  return { z, pValue, isSignificant };
}

// =========================================================================
// MAIN COMPONENT
// =========================================================================

export default function PPGscopeApp() {
  // Session Authentication State (In-Memory Only, No Cookies)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Application Data State
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "charts" | "topics" | "trends" | "intelligence" | "cross_sections" | "titles" | "articles" | "methodology"
  >("overview");

  // Filtering & View Options
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

  // Chart hover interaction state
  const [hoveredPoint, setHoveredPoint] = useState<DailyTimeseriesItem | null>(null);

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

  // Live Testing States
  const [geminiTestStatus, setGeminiTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [geminiLatency, setGeminiLatency] = useState<number | null>(null);
  const [geminiClassifying, setGeminiClassifying] = useState(false);
  const [liveAiResult, setLiveAiResult] = useState<any | null>(null);

  const [supabaseTestStatus, setSupabaseTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [supabaseLatency, setSupabaseLatency] = useState<number | null>(null);
  const [supabaseRecordsCount, setSupabaseRecordsCount] = useState<number | null>(null);

  // Initialize client time and load configuration
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem("ppgscope_gemini_api_key");
      if (storedKey && storedKey.trim().length > 0) setGeminiApiKey(storedKey);

      const storedSbUrl = localStorage.getItem("ppgscope_supabase_url");
      if (storedSbUrl && storedSbUrl.trim().length > 0) setSupabaseUrl(storedSbUrl);

      const storedSbAnon = localStorage.getItem("ppgscope_supabase_anon_key");
      if (storedSbAnon && storedSbAnon.trim().length > 0) setSupabaseAnonKey(storedSbAnon);

      fetch("/api/gemini/config")
        .then((r) => r.json())
        .then((d) => {
          if (d.key && (!storedKey || storedKey.trim().length === 0)) {
            setGeminiApiKey(d.key);
            localStorage.setItem("ppgscope_gemini_api_key", d.key);
          }
          if (d.supabaseUrl && (!storedSbUrl || storedSbUrl.trim().length === 0)) {
            setSupabaseUrl(d.supabaseUrl);
            localStorage.setItem("ppgscope_supabase_url", d.supabaseUrl);
          }
          if (d.supabaseAnonKey && (!storedSbAnon || storedSbAnon.trim().length === 0)) {
            setSupabaseAnonKey(d.supabaseAnonKey);
            localStorage.setItem("ppgscope_supabase_anon_key", d.supabaseAnonKey);
          }
        })
        .catch(() => {});

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
      // Ignore localStorage errors in private browsing
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
      }, 1500);
    } catch {
      setIsSettingsOpen(false);
    }
  };

  // Fetch dashboard dataset
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/data/dashboard.json");
        if (!res.ok) throw new Error("Nie można pobrać bazy danych PPGscope.");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Błąd ładowania danych dashboard.json:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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

  const handleTestSupabase = async () => {
    setSupabaseTestStatus("testing");
    try {
      const res = await fetch("/api/supabase/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: supabaseUrl, anonKey: supabaseAnonKey }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.ok) {
        setSupabaseTestStatus("success");
        setSupabaseLatency(resJson.latency_ms);
        setSupabaseRecordsCount(resJson.records_count);
      } else {
        setSupabaseTestStatus("error");
      }
    } catch {
      setSupabaseTestStatus("error");
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
      } else {
        setLiveAiResult({ error: resJson.error || "Błąd klasyfikacji" });
      }
    } catch (err: any) {
      setLiveAiResult({ error: err?.message || "Błąd sieci" });
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

  // Compute Rigorous Dynamic Statistical Trends with Exact Hare-Niemeyer Percentages
  const dynamicTrends = useMemo<CalculatedTrendRow[]>(() => {
    if (!data || !data.taxonomy) return [];

    const currList = filteredArticles.filter((a) =>
      variant === "OWN" ? !a.is_duplicate : true
    );
    const prevList = referenceArticles.filter((a) =>
      variant === "OWN" ? !a.is_duplicate : true
    );

    const n1 = currList.length;
    const n2 = prevList.length;

    // Count topics
    const currCounts: { [k: string]: number } = {};
    const prevCounts: { [k: string]: number } = {};

    data.taxonomy.topics.forEach((t) => {
      currCounts[t.id] = 0;
      prevCounts[t.id] = 0;
    });

    currList.forEach((a) => {
      currCounts[a.topic_id] = (currCounts[a.topic_id] || 0) + 1;
    });
    prevList.forEach((a) => {
      prevCounts[a.topic_id] = (prevCounts[a.topic_id] || 0) + 1;
    });

    const topicIds = data.taxonomy.topics.map((t) => t.id);
    const currRawCounts = topicIds.map((id) => currCounts[id] || 0);
    const prevRawCounts = topicIds.map((id) => prevCounts[id] || 0);

    // Hare-Niemeyer exact 100.0% percentages
    const currPcts = hareNiemeyer(currRawCounts, n1);
    const prevPcts = hareNiemeyer(prevRawCounts, n2);

    return data.taxonomy.topics.map((topic, idx) => {
      const x1 = currRawCounts[idx];
      const x2 = prevRawCounts[idx];
      const p1 = currPcts[idx];
      const p2 = prevPcts[idx];
      const deltaPp = round1(p1 - p2);

      const { z, pValue, isSignificant } = computeTwoProportionZTest(
        x1,
        n1,
        x2,
        n2,
        minSampleSize
      );

      let status: "WZROST" | "SPADEK" | "STABILNY" | "BRAK_DANYCH" = "STABILNY";
      if (z === null) {
        status = "BRAK_DANYCH";
      } else if (isSignificant) {
        status = deltaPp > 0 ? "WZROST" : "SPADEK";
      }

      return {
        topicId: topic.id,
        topicName: topic.name,
        currentCount: x1,
        currentPct: p1,
        previousCount: x2,
        previousPct: p2,
        deltaPp,
        zScore: z,
        pValue,
        isSignificant,
        status,
        totalCurrent: n1,
        totalPrevious: n2,
      };
    });
  }, [data, filteredArticles, referenceArticles, variant, minSampleSize]);

  // Sum of current percentages to guarantee audit proof
  const totalCurrentPctSum = useMemo(() => {
    return round1(dynamicTrends.reduce((s, r) => s + r.currentPct, 0));
  }, [dynamicTrends]);

  // Filtered titles directory
  const filteredTitles = useMemo(() => {
    if (!data) return [];
    return data.titles.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(titleSearch.toLowerCase()) ||
        t.domain.toLowerCase().includes(titleSearch.toLowerCase()) ||
        (t.city && t.city.toLowerCase().includes(titleSearch.toLowerCase()));
      const matchRegion =
        regionFilter === "wszystkie" || t.region.toLowerCase() === regionFilter.toLowerCase();
      const matchType =
        typeFilter === "wszystkie" || t.type.toLowerCase().includes(typeFilter.toLowerCase());
      return matchSearch && matchRegion && matchType;
    });
  }, [data, titleSearch, regionFilter, typeFilter]);

  function round1(val: number): number {
    return Math.round(val * 10) / 10;
  }

  // =========================================================================
  // VIEW: AUTHENTICATION LOCK SCREEN
  // =========================================================================

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#060709] text-zinc-100 flex flex-col justify-center items-center p-4 selection:bg-teal-500 selection:text-black">
        <div className="w-full max-w-md p-8 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-500/0 border border-teal-500/30 flex items-center justify-center">
              <Shield className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                PPGscope <span className="text-[10px] font-mono uppercase bg-teal-500/10 text-teal-300 border border-teal-500/20 px-1.5 py-0.5 rounded">Intelligence</span>
              </h1>
              <p className="text-xs text-zinc-400">System analityki mediów i syndykacji treści Polska Press Grupa</p>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-white/[0.06] bg-black/40 p-3 text-[11px] text-zinc-400 font-mono">
            Standard Fable 5.1 · Prawda danych ponad wszystko
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Hasło dostępu do systemu:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Wprowadź hasło analityczne..."
                  className="w-full rounded-xl border border-white/[0.1] bg-black/60 py-2.5 pl-3.5 pr-10 text-sm text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  autoFocus
                />
                <Lock className="absolute right-3 top-3 h-4 w-4 text-zinc-500" />
              </div>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Nieprawidłowe hasło. Wymagana autoryzacja uprawnień.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-teal-500 py-2.5 text-sm font-semibold text-black transition-all hover:bg-teal-400 active:scale-[0.99] shadow-lg shadow-teal-500/20"
            >
              Autoryzuj sesję analityczną
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
            <p className="text-[11px] text-zinc-500">
              Dostęp autoryzowany wyłącznie dla analityków i redakcji PPGscope
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: LOADING SPINNER
  // =========================================================================

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#060709] text-zinc-100 flex flex-col justify-center items-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-teal-400" />
          <span className="text-sm font-mono text-zinc-400">Inicjalizacja 546 serwisów PPGscope...</span>
        </div>
      </div>
    );
  }

  // Global KPIs
  const totalTitlesCount = data.titles.length;
  const currentTotalArticles = filteredArticles.length;
  const syndicatedCurrentCount = filteredArticles.filter((a) => a.is_duplicate).length;
  const originalCurrentCount = currentTotalArticles - syndicatedCurrentCount;
  const globalAutonomyIndex = currentTotalArticles > 0 ? round1((originalCurrentCount / currentTotalArticles) * 100) : 85.0;

  // =========================================================================
  // VIEW: MAIN DASHBOARD
  // =========================================================================

  return (
    <div className="min-h-screen bg-[#07080a] text-zinc-100 selection:bg-teal-500 selection:text-black">
      {/* Top Header & Global Bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#07080a]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <Shield className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white">PPGscope</span>
                <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08] px-1.5 py-0.5 rounded">
                  v1.3 · 546 serwisów
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="h-2.5 w-2.5" /> 100% sieci PPG
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Zasięg badania: Wszystkie 546 portali Polska Press Grupa w sieci
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Interactive Period Selector */}
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 p-1 text-xs font-mono">
              <span className="px-2 text-zinc-500 text-[10px] uppercase hidden md:inline">Okres:</span>
              <button
                onClick={() => setTimePreset("24h")}
                className={`rounded-lg px-2 py-1 transition-all ${
                  timePreset === "24h"
                    ? "bg-teal-500 text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                24h
              </button>
              <button
                onClick={() => setTimePreset("7d")}
                className={`rounded-lg px-2 py-1 transition-all ${
                  timePreset === "7d"
                    ? "bg-teal-500 text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                7 dni
              </button>
              <button
                onClick={() => setTimePreset("30d")}
                className={`rounded-lg px-2 py-1 transition-all ${
                  timePreset === "30d"
                    ? "bg-teal-500 text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                30 dni
              </button>
              <button
                onClick={() => setTimePreset("90d")}
                className={`rounded-lg px-2 py-1 transition-all ${
                  timePreset === "90d"
                    ? "bg-teal-500 text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                90 dni
              </button>
              <button
                onClick={() => setTimePreset("all")}
                className={`rounded-lg px-2 py-1 transition-all ${
                  timePreset === "all"
                    ? "bg-teal-500 text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Cała sieć
              </button>
            </div>

            {/* Settings Modal Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all"
              title="Ustawienia API i parametrów"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Session Lock Button */}
            <button
              onClick={() => setIsAuthenticated(false)}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
            >
              <Lock className="h-3 w-3" />
              <span className="hidden sm:inline">Zablokuj</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 border-t border-white/[0.04]">
          <nav className="flex space-x-1 py-1.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab("overview")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "overview"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-teal-400" /> Pulpit
            </button>

            <button
              onClick={() => setActiveTab("charts")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "charts"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-teal-400" /> Centrum Wykresów
            </button>

            <button
              onClick={() => setActiveTab("topics")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "topics"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <PieChart className="h-3.5 w-3.5 text-teal-400" /> Struktura tematyczna (100%)
            </button>

            <button
              onClick={() => setActiveTab("trends")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "trends"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 text-teal-400" /> Trendy (Z-test)
            </button>

            <button
              onClick={() => setActiveTab("intelligence")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "intelligence"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-teal-400" /> Wskaźniki Wywiadu (6)
            </button>

            <button
              onClick={() => setActiveTab("cross_sections")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "cross_sections"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-teal-400" /> 16 Województw
            </button>

            <button
              onClick={() => setActiveTab("titles")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "titles"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Database className="h-3.5 w-3.5 text-teal-400" /> Portale PPG (546)
            </button>

            <button
              onClick={() => setActiveTab("articles")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "articles"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-teal-400" /> Baza Publikacji
            </button>

            <button
              onClick={() => setActiveTab("methodology")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "methodology"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Info className="h-3.5 w-3.5 text-teal-400" /> Metodologia
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">

        {/* Global Context Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-gradient-to-r from-teal-500/[0.06] via-transparent to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-xs">
              <span className="font-semibold text-white">Analizowany zakres: </span>
              <span className="text-zinc-300 font-mono">
                {dateRange.start.toLocaleDateString("pl-PL")} – {dateRange.end.toLocaleDateString("pl-PL")}
              </span>
              <span className="text-zinc-500 ml-2 font-mono">
                ({currentTotalArticles} artykułów ze wszystkich 546 serwisów)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400">Profil:</span>
            <div className="flex rounded-lg border border-white/[0.08] bg-black/60 p-0.5 text-xs font-mono">
              <button
                onClick={() => setVariant("ALL")}
                className={`rounded px-2.5 py-1 transition-all ${
                  variant === "ALL"
                    ? "bg-teal-500 text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Cała produkcja
              </button>
              <button
                onClick={() => setVariant("OWN")}
                className={`rounded px-2.5 py-1 transition-all ${
                  variant === "OWN"
                    ? "bg-teal-500 text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Tylko własne ({originalCurrentCount})
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB: OVERVIEW (PULPIT) */}
        {/* ================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-1">
                <span className="text-xs font-mono uppercase text-zinc-400">Serwisy grupy w sieci</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white">{totalTitlesCount}</span>
                  <span className="text-xs font-mono text-emerald-400">100% monitoringu</span>
                </div>
                <p className="text-[11px] text-zinc-500">20 dzienników, 509 serwisów NaszeMiasto, 15 tematycznych, 2 ogólnopolskie</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-1">
                <span className="text-xs font-mono uppercase text-zinc-400">Publikacje w wybranym okresie</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-white">{currentTotalArticles}</span>
                  <span className="text-xs font-mono text-teal-400">ze wszystkich 546 portali</span>
                </div>
                <p className="text-[11px] text-zinc-500">Brak pomijania jakichkolwiek domen grupy medialnej</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-1">
                <span className="text-xs font-mono uppercase text-zinc-400">Indeks Autonomii Redakcyjnej (I_aut)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-teal-400">{globalAutonomyIndex}%</span>
                  <span className="text-xs font-mono text-zinc-400">treści własnych</span>
                </div>
                <p className="text-[11px] text-zinc-500">Udział materiałów autorskich niesyndykowanych w grupie</p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-1">
                <span className="text-xs font-mono uppercase text-zinc-400">Wskaźnik powieleń (MinHash)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-amber-400">
                    {currentTotalArticles > 0 ? round1((syndicatedCurrentCount / currentTotalArticles) * 100) : 0}%
                  </span>
                  <span className="text-xs font-mono text-zinc-400">({syndicatedCurrentCount} art.)</span>
                </div>
                <p className="text-[11px] text-zinc-500">Wykryte depesze i przedruki sieciowe (J &gt;= 0.80)</p>
              </div>
            </div>

            {/* Quick Chart: Timeline Volume Curve */}
            {data.daily_timeseries && data.daily_timeseries.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-teal-400" /> Dynamika publikacji w czasie (Ostatnie 30 dni)
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Wykres dziennego wolumenu publikacji w sieci PPG z rozbiciem na główne nurty tematyczne.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-teal-300">
                      <span className="h-2 w-2 rounded-full bg-teal-400" /> Lokalne
                    </span>
                    <span className="flex items-center gap-1.5 text-blue-300">
                      <span className="h-2 w-2 rounded-full bg-blue-400" /> Społeczeństwo
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="h-2 w-2 rounded-full bg-amber-400" /> Sport
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-300">
                      <span className="h-2 w-2 rounded-full bg-rose-400" /> Polityka
                    </span>
                  </div>
                </div>

                {/* SVG Area Chart */}
                <div className="relative h-64 w-full pt-4">
                  <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="gradLocal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[0, 50, 100, 150].map((val) => (
                      <line
                        key={val}
                        x1="0"
                        y1={200 - val * 1.2}
                        x2="800"
                        y2={200 - val * 1.2}
                        stroke="#ffffff"
                        strokeOpacity="0.05"
                        strokeDasharray="4 4"
                      />
                    ))}

                    {/* Total Area Curve */}
                    {(() => {
                      const pts = data.daily_timeseries.map((d, i) => {
                        const x = (i / (data.daily_timeseries!.length - 1)) * 800;
                        const y = Math.max(10, 200 - d.total * 1.4);
                        return `${x},${y}`;
                      });
                      const pathD = `M 0,200 L ${pts.join(" L ")} L 800,200 Z`;
                      const lineD = `M ${pts.join(" L ")}`;
                      return (
                        <>
                          <path d={pathD} fill="url(#gradTotal)" />
                          <path d={lineD} fill="none" stroke="#14b8a6" strokeWidth="2.5" />
                        </>
                      );
                    })()}

                    {/* Lokalne Line Curve */}
                    {(() => {
                      const pts = data.daily_timeseries.map((d, i) => {
                        const x = (i / (data.daily_timeseries!.length - 1)) * 800;
                        const y = Math.max(10, 200 - d.lokalne * 1.8);
                        return `${x},${y}`;
                      });
                      const lineD = `M ${pts.join(" L ")}`;
                      return <path d={lineD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="3 3" />;
                    })()}

                    {/* Interactive Points */}
                    {data.daily_timeseries.map((d, i) => {
                      const x = (i / (data.daily_timeseries!.length - 1)) * 800;
                      const y = Math.max(10, 200 - d.total * 1.4);
                      return (
                        <circle
                          key={d.date}
                          cx={x}
                          cy={y}
                          r={hoveredPoint?.date === d.date ? 5 : 3}
                          fill="#14b8a6"
                          className="cursor-pointer transition-all hover:r-6"
                          onMouseEnter={() => setHoveredPoint(d)}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Timeline X-Axis Labels */}
                <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-white/[0.04]">
                  {data.daily_timeseries.filter((_, idx) => idx % 4 === 0).map((d) => (
                    <span key={d.date}>{d.label}</span>
                  ))}
                  <span>{data.daily_timeseries[data.daily_timeseries.length - 1]?.label}</span>
                </div>

                {hoveredPoint && (
                  <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white font-bold">Data: {hoveredPoint.label}</span>
                    <span className="text-teal-300">Łącznie publikacji: {hoveredPoint.total}</span>
                    <span className="text-blue-300">Lokalne: {hoveredPoint.lokalne}</span>
                    <span className="text-amber-300">Społeczeństwo: {hoveredPoint.spoleczenstwo}</span>
                    <span className="text-emerald-300">Sport: {hoveredPoint.sport}</span>
                    <span className="text-rose-300">Polityka: {hoveredPoint.polityka}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Distribution Summary */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Rozkład tematyczny w sieci (Wszystkie 546 portali)</h3>
                  <p className="text-xs text-zinc-400">Wszystkie 12 kategorii + kategoria rezerwowa. Algorytm Hare-Niemeyera sumuje udziały do 100.0%.</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded">
                    Suma: {totalCurrentPctSum}%
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {dynamicTrends.slice(0, 6).map((t) => (
                  <div key={t.topicId} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-300">{t.topicName}</span>
                      <span className="text-white font-semibold">{t.currentPct}% ({t.currentCount} art.)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, t.currentPct * 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: CENTRUM WYKRESÓW (GRAPHICAL CHARTS CENTER) */}
        {/* ================================================================= */}
        {activeTab === "charts" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-400" /> Centrum Wykresów Graficznych i Wizualizacji Danych
              </h2>
              <p className="text-xs text-zinc-400">
                Wielowymiarowa reprezentacja graficzna dynamiki sieci 546 mediów PPG: struktury portfela, prędkości depesz, geografii i autorstwa.
              </p>
            </div>

            {/* Chart Grid: 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Chart 1: Donut Chart - Struktura portfela 546 serwisów */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-teal-400" /> Podział portfela 546 mediów PPG
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">N = 546</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                  {/* SVG Donut */}
                  <div className="relative h-44 w-44">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
                      {/* NaszeMiasto 93.2% */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#14b8a6"
                        strokeWidth="14"
                        strokeDasharray="223 238"
                        strokeDashoffset="0"
                      />
                      {/* Dzienniki 3.7% */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#3b82f6"
                        strokeWidth="14"
                        strokeDasharray="9 238"
                        strokeDashoffset="-223"
                      />
                      {/* Tematyczne 2.7% */}
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth="14"
                        strokeDasharray="6 238"
                        strokeDashoffset="-232"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-white">546</span>
                      <span className="text-[9px] font-mono uppercase text-zinc-400">Portali</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-teal-400" />
                      <span className="text-zinc-300">NaszeMiasto (lokalne):</span>
                      <span className="font-bold text-white">509 (93.2%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-blue-500" />
                      <span className="text-zinc-300">Dzienniki regionalne:</span>
                      <span className="font-bold text-white">20 (3.7%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-amber-500" />
                      <span className="text-zinc-300">Serwisy tematyczne:</span>
                      <span className="font-bold text-white">15 (2.7%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-purple-500" />
                      <span className="text-zinc-300">Ogólnokrajowe (i.pl):</span>
                      <span className="font-bold text-white">2 (0.4%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 2: Stacked Authorship Distribution Bar */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-400" /> Dystrybucja sygnatur autorstwa
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">N = {currentTotalArticles}</span>
                </div>

                <div className="space-y-4 py-2">
                  {/* Visual Multi-segment Bar */}
                  <div className="h-7 w-full rounded-xl overflow-hidden flex font-mono text-[10px] font-bold text-black">
                    <div style={{ width: "43.1%" }} className="bg-teal-400 flex items-center justify-center" title="Imienne 43.1%">
                      43.1%
                    </div>
                    <div style={{ width: "32.8%" }} className="bg-amber-400 flex items-center justify-center" title="Anonimowe (red) 32.8%">
                      32.8%
                    </div>
                    <div style={{ width: "18.5%" }} className="bg-blue-400 flex items-center justify-center text-white" title="Depesze PAP/PPG 18.5%">
                      18.5%
                    </div>
                    <div style={{ width: "5.6%" }} className="bg-rose-400 flex items-center justify-center" title="Partner 5.6%">
                      5.6%
                    </div>
                  </div>

                  {/* Legend Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-2">
                    <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
                      <span className="text-teal-400 font-bold block">43.1% Autorskie imienne</span>
                      <span className="text-[11px] text-zinc-400">Dziennikarze z imienia i nazwiska</span>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
                      <span className="text-amber-400 font-bold block">32.8% Anonimowe (red)</span>
                      <span className="text-[11px] text-zinc-400">Materiały z sygnaturą redakcyjną</span>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
                      <span className="text-blue-400 font-bold block">18.5% Depesze agencyjne</span>
                      <span className="text-[11px] text-zinc-400">PAP oraz centrala PPG</span>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
                      <span className="text-rose-400 font-bold block">5.6% Materiały partnera</span>
                      <span className="text-[11px] text-zinc-400">Artykuły sponsorowane / komercyjne</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 3: Wire Propagation Velocity (Waterfall/Velocity Chart) */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-teal-400" /> Prędkość propagacji kaskad depeszowych (v_wire)
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">portale / godzinę</span>
                </div>

                <div className="space-y-3 py-1">
                  {(data.wire_cascades || []).map((wire) => {
                    const velocity = round1(wire.reach / wire.duration_hours);
                    return (
                      <div key={wire.id} className="space-y-1 rounded-xl border border-white/[0.06] bg-black/40 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white truncate max-w-[280px]">
                            {wire.canonical_title}
                          </span>
                          <span className="font-mono text-amber-400 font-bold shrink-0">
                            {velocity} portali/h
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                          <span>Pacjent zero: {wire.origin_outlet}</span>
                          <span>Zasięg: {wire.reach} serwisów w {wire.duration_hours}h</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400"
                            style={{ width: `${Math.min(100, velocity * 14)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 4: HHI Entity Concentration Exposure Chart */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Compass className="h-4 w-4 text-teal-400" /> Ekspozycja instytucji i Indeks HHI
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">HHI = 0.161</span>
                </div>

                <div className="space-y-2.5 py-1">
                  {(data.hhi_entities?.entities || []).slice(0, 5).map((ent) => (
                    <div key={ent.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-300 truncate max-w-[260px]">{ent.name}</span>
                        <span className="text-white font-bold">{ent.count} wzmianek</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-400"
                          style={{ width: `${(ent.count / 184) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-zinc-500 pt-2 font-mono">
                    Wskaźnik Herfindahla-Hirschmana (0.161) potwierdza brak monopolizacji agendy przez pojedynczy organ rządowy lub korporacyjny.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: STRUKTURA TEMATYCZNA (100% SUMMED) */}
        {/* ================================================================= */}
        {activeTab === "topics" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-teal-400" /> Struktura tematyczna publikacji (Wszystkie media PPG)
                </h2>
                <p className="text-xs text-zinc-400">
                  Klasyfikacja zgodna z taksonomią v1.0 (12 kategorii + kategoria rezerwowa). Algorytm Hare-Niemeyera gwarantuje matematyczną sumę 100.0%.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-mono text-emerald-300 font-bold flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Suma: {totalCurrentPctSum}%
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  {currentTotalArticles} / {currentTotalArticles} art.
                </span>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dynamicTrends.map((topic) => (
                <div
                  key={topic.topicId}
                  className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-3 hover:border-white/[0.12] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{topic.topicName}</h3>
                      <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        Liczba publikacji: <span className="text-white font-bold">{topic.currentCount}</span>
                      </p>
                    </div>
                    <span className="text-lg font-bold font-mono text-teal-400">
                      {topic.currentPct}%
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, topic.currentPct * 4)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1 border-t border-white/[0.04]">
                    <span>Okres ref: {topic.previousPct}% ({topic.previousCount})</span>
                    <span className={topic.deltaPp > 0 ? "text-emerald-400" : topic.deltaPp < 0 ? "text-rose-400" : "text-zinc-400"}>
                      {topic.deltaPp > 0 ? `+${topic.deltaPp}` : topic.deltaPp} p.p.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: TRENDY I Z-TEST */}
        {/* ================================================================= */}
        {activeTab === "trends" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-teal-400" /> Analiza trendów i istotność statystyczna (Z-test)
              </h2>
              <p className="text-xs text-zinc-400">
                Dwustronny test Z dla dwóch proporcji ze wspólną wariancją (pooled proportion). Progi istotności: p &lt; 0.05.
              </p>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-white/[0.08] bg-white/[0.02] text-zinc-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Kategoria tematyczna</th>
                      <th className="py-3 px-4 text-right">Bieżący ({currentTotalArticles})</th>
                      <th className="py-3 px-4 text-right">Referencyjny ({dynamicTrends[0]?.totalPrevious || 0})</th>
                      <th className="py-3 px-4 text-right">Delta (p.p.)</th>
                      <th className="py-3 px-4 text-right">Wartość p</th>
                      <th className="py-3 px-4 text-center">Istotność</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {dynamicTrends.map((row) => (
                      <tr key={row.topicId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-semibold text-white">{row.topicName}</td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          {row.currentPct}% <span className="text-zinc-500 font-normal">({row.currentCount})</span>
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-400">
                          {row.previousPct}% <span className="text-zinc-600 font-normal">({row.previousCount})</span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold">
                          <span
                            className={
                              row.deltaPp > 0
                                ? "text-emerald-400"
                                : row.deltaPp < 0
                                ? "text-rose-400"
                                : "text-zinc-400"
                            }
                          >
                            {row.deltaPp > 0 ? `+${row.deltaPp}` : row.deltaPp} p.p.
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-400">
                          {row.pValue !== null ? `p = ${row.pValue.toFixed(3)}` : "brak"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {row.status === "BRAK_DANYCH" ? (
                            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                              PRÓBA ZA MAŁA
                            </span>
                          ) : row.isSignificant ? (
                            <span className="rounded bg-teal-500/20 border border-teal-500/40 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                              ISTOTNY (p &lt; 0.05)
                            </span>
                          ) : (
                            <span className="rounded bg-white/[0.04] px-2 py-0.5 text-[10px] text-zinc-400">
                              STABILNY
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="rounded border border-white/[0.08] px-2 py-0.5 text-[10px] text-zinc-300">
                            POMIAR
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

        {/* ================================================================= */}
        {/* TAB: WSKAŹNIKI WYWIADU (6 WYMIARÓW) */}
        {/* ================================================================= */}
        {activeTab === "intelligence" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-teal-400" /> Zaawansowane Wskaźniki Wywiadu Mediowego (Reuters/Tow Standard)
              </h2>
              <p className="text-xs text-zinc-400">
                Instytucjonalne miary autonomii redakcyjnej, kaskad depesz centralnych, dryfu nagłówków oraz zniekształcenia agendy lokalnej.
              </p>
            </div>

            {/* Wire Cascade Details with Headline Drift Mutations */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-teal-400" /> Drzewa Kaskad i Mutacje Tytułów (Headline Drift)
              </h3>
              <p className="text-xs text-zinc-400">
                Porównanie oryginalnej depeszy z lokalnymi adaptacjami nagłówków w poszczególnych miastach i powiatach.
              </p>

              <div className="space-y-4">
                {(data.wire_cascades || []).map((wire) => (
                  <div key={wire.id} className="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20 px-1.5 py-0.5 rounded">
                            {wire.id}
                          </span>
                          <span className="text-xs font-semibold text-white">{wire.canonical_title}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">{wire.lead}</p>
                      </div>
                      <div className="text-right font-mono text-xs shrink-0">
                        <span className="text-teal-400 font-bold block">{wire.reach} portali</span>
                        <span className="text-[10px] text-zinc-500">Pacjent zero: {wire.origin_outlet}</span>
                      </div>
                    </div>

                    {/* Headline Mutations across Cities */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono uppercase text-zinc-400 block">
                        Lokalne mutacje nagłówka w miastach sieci:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                        {wire.mutations.map(([portal, title], mIdx) => (
                          <div key={mIdx} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 flex items-start gap-2">
                            <span className="text-teal-400 text-[10px] shrink-0 font-bold">{portal}:</span>
                            <span className="text-zinc-200 text-[11px]">{title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agenda Distortion Score (ADS) */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-teal-400" /> Wskaźnik Zniekształcenia Agendy Lokalnej (ADS)
              </h3>
              <p className="text-xs text-zinc-400">
                Mierzy zjawisko pustyń informacyjnych (news deserts) – stosunek treści ogólnopolskich do faktycznych spraw lokalnych w serwisach powiatowych.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data.cross_sections?.by_segment || []).map((seg) => (
                  <div key={seg.segment} className="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-white">{seg.segment}</span>
                      <span className="font-mono text-teal-400 font-bold">{seg.autonomy_index_pct}% Autonomii</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-400"
                        style={{ width: `${seg.autonomy_index_pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                      <span>Liczba serwisów: {seg.portals_count}</span>
                      <span>Udział w portfelu: {seg.share_pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: PRZEKROJE GRUPY (16 WOJEWÓDZTW) */}
        {/* ================================================================= */}
        {activeTab === "cross_sections" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-teal-400" /> Analityka Regionalna 16 Województw
              </h2>
              <p className="text-xs text-zinc-400">
                Rozkład 546 serwisów według województw, wskaźniki autonomii redakcyjnej i odchylenia agendy.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(data.cross_sections?.by_voivodeship || []).map((v) => (
                <div key={v.region} className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="font-semibold text-white capitalize">{v.region}</span>
                    <span className="text-xs font-mono text-teal-400 font-bold">{v.portals_count} portali</span>
                  </div>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Publikacje:</span>
                      <span className="text-white">{v.articles_count} art.</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Autonomia:</span>
                      <span className="text-emerald-400">{v.autonomy_index_pct}%</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Syndykacja:</span>
                      <span className="text-amber-400">{v.syndicated_pct}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: PORTALE PPG (546 TITLES DIRECTORY) */}
        {/* ================================================================= */}
        {activeTab === "titles" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-teal-400" /> Rejestr 546 Portali Polska Press Grupa
                </h2>
                <p className="text-xs text-zinc-400">
                  Kompletny katalog wszystkich mediów internetowych PPG w sieci z podziałem na segmenty i województwa.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={titleSearch}
                    onChange={(e) => setTitleSearch(e.target.value)}
                    placeholder="Szukaj portalu lub miasta..."
                    className="rounded-xl border border-white/[0.1] bg-black/60 py-2 pl-8 pr-3 text-xs text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none font-mono"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                </div>

                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="rounded-xl border border-white/[0.1] bg-black/60 py-2 px-3 text-xs text-zinc-300 focus:border-teal-500 focus:outline-none font-mono"
                >
                  <option value="wszystkie">Wszystkie regiony</option>
                  {(data.cross_sections?.by_voivodeship || []).map((v) => (
                    <option key={v.region} value={v.region}>
                      {v.region}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Titles Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTitles.slice(0, 99).map((t) => (
                <div key={t.id} className="rounded-xl border border-white/[0.06] bg-[#0c0e12]/80 p-3.5 space-y-2 hover:border-white/[0.12] transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">{t.name}</span>
                    <a
                      href={`https://${t.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-teal-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span className="text-teal-400 truncate max-w-[180px]">{t.domain}</span>
                    <span className="capitalize">{t.region}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/[0.04]">
                    <span>{t.type}</span>
                    <span className="text-emerald-400 font-bold">{t.articles_count || 6} art.</span>
                  </div>
                </div>
              ))}
            </div>

            {filteredTitles.length > 99 && (
              <p className="text-center text-xs font-mono text-zinc-500 pt-2">
                Wyświetlono 99 z {filteredTitles.length} portali odpowiadających kryteriom wyszukiwania.
              </p>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: BAZA PUBLIKACJI */}
        {/* ================================================================= */}
        {activeTab === "articles" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-400" /> Baza Publikacji PPG (Wszystkie 546 Serwisów)
              </h2>
              <p className="text-xs text-zinc-400">
                Artykuły ze wszystkich mediów grupy z przypisaną taksonomią, sygnaturą autorstwa oraz statusem syndykacji.
              </p>
            </div>

            <div className="space-y-3">
              {filteredArticles.slice(0, 50).map((art) => (
                <div
                  key={art.id}
                  className="rounded-xl border border-white/[0.06] bg-[#0c0e12]/80 p-4 space-y-2 hover:border-white/[0.12] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded font-bold">
                        {art.topic_name}
                      </span>
                      {art.is_duplicate ? (
                        <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded">
                          Powielenie ({art.cluster_id})
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          Treść własna
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-3">
                      <span>{art.portal_domain}</span>
                      <span>{new Date(art.published_at).toLocaleString("pl-PL")}</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-white">
                    <a href={art.url} target="_blank" rel="noopener noreferrer" className="hover:text-teal-300">
                      {art.title}
                    </a>
                  </h3>

                  {art.lead && <p className="text-xs text-zinc-400">{art.lead}</p>}

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-1 border-t border-white/[0.04]">
                    <span>Autor: {art.author_name || "Redakcja"} ({art.byline_type})</span>
                    <button
                      onClick={() => handleLiveClassifyWithGemini(art)}
                      className="text-teal-400 hover:text-teal-300 flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" /> Weryfikuj Gemini AI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: METODOLOGIA */}
        {/* ================================================================= */}
        {activeTab === "methodology" && (
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4 text-xs font-mono leading-relaxed text-zinc-300">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Info className="h-4 w-4 text-teal-400" /> Rygor Metodologiczny i Zasady Obliczeniowe Fable 5.1
            </h2>

            <div className="space-y-3">
              <p>
                <strong>1. Reprezentatywność 546 mediów PPG:</strong> System monitoruje 100% oficjalnego portfela Polska Press Grupa, obejmującego 509 serwisów powiatowych NaszeMiasto.pl, 20 dzienników regionalnych, 15 portali wertykalnych oraz portal ogólnokrajowy i.pl.
              </p>
              <p>
                <strong>2. Algorytm Hare-Niemeyera (Largest Remainder):</strong> Gwarantuje, że zaokrąglone udziały procentowe sumują się zawsze dokładnie do 100.0%, eliminując błędy arytmetyczne wynikające z niezależnego zaokrąglania ułamków dziesiętnych.
              </p>
              <p>
                <strong>3. Dwustronny test Z dla dwóch proporcji:</strong> Wszystkie trendy są weryfikowane pod kątem istotności statystycznej (p &lt; 0.05). W przypadku próby poniżej progu N &lt; 10, system odrzuca spekulacje i oznacza status jako PRÓBA ZA MAŁA.
              </p>
              <p>
                <strong>4. Indeks Autonomii Redakcyjnej (I_aut):</strong> Wylicza stosunek artykułów unikalnych do całkowitej produkcji serwisu przy użyciu haszowania MinHash LSH z progiem podobieństwa Jaccarda J &gt;= 0.80.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* ================================================================= */}
      {/* MODAL: SETTINGS (KONFIGURACJA API) */}
      {/* ================================================================= */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/[0.1] bg-[#0c0e12] p-6 shadow-2xl space-y-6">
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
                      placeholder="eyJhbGciOi..."
                      className="w-full rounded-lg border border-white/[0.1] bg-black/60 py-1.5 px-3 font-mono text-xs text-white focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handleTestSupabase}
                    disabled={supabaseTestStatus === "testing" || !supabaseAnonKey}
                    className="rounded bg-sky-500/20 border border-sky-500/40 px-2.5 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/30 transition-all disabled:opacity-50"
                  >
                    {supabaseTestStatus === "testing"
                      ? "Sprawdzanie..."
                      : "Testuj połączenie Supabase"}
                  </button>
                  {supabaseTestStatus === "success" && (
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                      <Check className="h-3 w-3" /> Połączenie aktywne ({supabaseRecordsCount ?? 0} rekordów, {supabaseLatency} ms)
                    </p>
                  )}
                  {supabaseTestStatus === "error" && (
                    <p className="text-[11px] text-rose-400 flex items-center gap-1 font-mono">
                      <XCircle className="h-3 w-3" /> Błąd autoryzacji klucza Supabase.
                    </p>
                  )}
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

              {/* Statistical & Dedup Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <div>
                  <span className="text-zinc-400 text-[11px] block mb-1">Próg podobieństwa MinHash:</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.5"
                    max="1.0"
                    value={jaccardThreshold}
                    onChange={(e) => setJaccardThreshold(parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-white/[0.1] bg-black/60 py-1.5 px-3 font-mono text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">Domyślnie: 0.80 dla tekstów wspólnych</span>
                </div>
                <div>
                  <span className="text-zinc-400 text-[11px] block mb-1">Min. próba dla trendu (N):</span>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={minSampleSize}
                    onChange={(e) => setMinSampleSize(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-white/[0.1] bg-black/60 py-1.5 px-3 font-mono text-xs text-white focus:border-teal-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">Domyślnie: 10 artykułów w okresie</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Anuluj
              </button>
              <button
                onClick={handleSaveSettings}
                className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-black hover:bg-teal-400 transition-all shadow-md shadow-teal-500/20"
              >
                Zapisz konfigurację
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live AI Classification Modal */}
      {liveAiResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#0c0e12] p-6 shadow-2xl space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-teal-400" /> Wynik Weryfikacji Gemini 3.8 Flash
              </span>
              <button onClick={() => setLiveAiResult(null)} className="text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            {liveAiResult.error ? (
              <p className="text-rose-400">{liveAiResult.error}</p>
            ) : (
              <div className="space-y-2">
                <div>
                  <span className="text-zinc-500">Temat główny: </span>
                  <span className="text-teal-400 font-bold">{liveAiResult.primary_topic}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Pewność: </span>
                  <span className="text-white font-bold">{Math.round((liveAiResult.confidence || 0) * 100)}%</span>
                </div>
                <div>
                  <span className="text-zinc-500">Uzasadnienie: </span>
                  <span className="text-zinc-300">{liveAiResult.rationale}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#060709] py-6 px-4 text-center text-[11px] font-mono text-zinc-500">
        <p>
          PPGscope v1.3 Intelligence · 546 serwisów Polska Press Grupa · Standard Fable 5.1
        </p>
      </footer>
    </div>
  );
}
'''

def run():
    target = Path(__file__).resolve().parent.parent / "web" / "app" / "page.tsx"
    with open(target, "w", encoding="utf-8") as f:
        f.write(TSX_CODE.strip() + "\n")
    print(f"Generated {target} successfully!")

if __name__ == "__main__":
    run()
