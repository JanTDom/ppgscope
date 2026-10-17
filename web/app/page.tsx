"use client";

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
  Download,
  Building2,
  Globe2,
  Target
} from "lucide-react";

// =========================================================================
// DATA CONTRACTS & INTERFACES (TAXONOMY V2.0)
// =========================================================================

interface DomainItem {
  slug: string;
  code: string;
  name: string;
  description: string;
  allowed_localities?: string[];
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
  published_at: string;
  is_duplicate: boolean;
  cluster_id?: string | null;
  byline_type?: "named" | "anonymous" | "wire" | "partner";
  author_name?: string;
  is_local_content?: boolean;

  // Taxonomy v2.0 fields
  domain: string;
  domain_name?: string;
  domain_secondary?: string | null;
  locality: "C" | "L" | "CL";
  other_region?: boolean;
  needs_review?: boolean;
  confidence?: number;

  // Legacy fields for backward-compatibility
  topic_id?: string;
  topic_name?: string;
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
  taxonomy_v2?: {
    version: string;
    domains: DomainItem[];
    locality_variants: { code: string; name: string; description: string }[];
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

// 18 Domains Specification
const DOMAINS_SPEC: DomainItem[] = [
  { slug: "wladza", code: "01", name: "Władza i polityka", description: "Samorząd, budżety gmin, rząd, Sejm, partie, wybory, urzędy, ustrój i sądy jako ustrój" },
  { slug: "zdarzenia", code: "02", name: "Bezpieczeństwo i zdarzenia", description: "Wypadki, pożary, katastrofy, przestępczość, policja, zaginięcia, wyroki karne, służby ratunkowe" },
  { slug: "obronnosc", code: "03", name: "Obronność", description: "Wojsko, ćwiczenia, szkolenia cywilów, przemysł zbrojeniowy, obrona cywilna" },
  { slug: "gospodarka", code: "04", name: "Gospodarka i praca", description: "Firmy, wyniki, rynek pracy, płace, podatki, kredyty, emerytury, energetyka, górnictwo, przemysł, handel, makroekonomia" },
  { slug: "infrastruktura", code: "05", name: "Infrastruktura i transport", description: "Drogi, mosty, kolej, komunikacja miejska, lotniska, korki, parkowanie, sieci wodne i ciepłownicze" },
  { slug: "przestrzen", code: "06", name: "Przestrzeń i mieszkanie", description: "Urbanistyka, parki, zieleń miejska, rewitalizacja, mieszkania komunalne, nieruchomości, zabytki jako remont lub spór" },
  { slug: "zdrowie", code: "07", name: "Zdrowie", description: "Szpitale, finansowanie i płace w ochronie zdrowia, dostęp do leczenia, profilaktyka, porady medyczne" },
  { slug: "edukacja", code: "08", name: "Edukacja i dzieci", description: "Szkoły, przedszkola, bezpieczeństwo w szkołach, nauczyciele, egzaminy, uczelnie, wychowanie, dzieci w sieci" },
  { slug: "srodowisko", code: "09", name: "Środowisko i klimat", description: "Susza, woda, powodzie, lasy, rezerwaty, smog, odpady, pogoda, przyroda, zwierzęta" },
  { slug: "spolecznosc", code: "10", name: "Społeczność i ludzie", description: "Lokalni bohaterowie, seniorzy, jubilaci, parafie, NGO, zbiórki, nekrologi, problemy socjalne" },
  { slug: "kultura", code: "11", name: "Kultura", description: "Teatr, opera, koncerty, literatura, film, sztuka, murale, muzea" },
  { slug: "historia", code: "12", name: "Historia i pamięć", description: "PRL, nostalgia, historia miejscowości, archiwalne zdjęcia, rocznice" },
  { slug: "czas_wolny", code: "13", name: "Czas wolny i turystyka", description: "Atrakcje, uzdrowiska, wycieczki, wydarzenia weekendowe, festyny, jarmarki, gastronomia" },
  { slug: "sport", code: "14", name: "Sport", description: "Sport zawodowy, amatorski i młodzieżowy, kibice, obiekty sportowe" },
  { slug: "rozrywka", code: "15", name: "Rozrywka i celebryci", description: "Telewizja, gwiazdy, plotki" },
  { slug: "styl_zycia", code: "16", name: "Styl życia i poradnictwo", description: "Dom i wnętrze, moto, technologie, gry, zakupy, okazje, kuchnia, uroda" },
  { slug: "rolnictwo", code: "17", name: "Wieś i rolnictwo", description: "Produkcja rolna, ceny skupu, dopłaty, konkursy agro, KGW, życie wsi" },
  { slug: "swiat", code: "18", name: "Świat", description: "Polityka międzynarodowa, Ukraina i Rosja, USA, UE, Watykan" }
];

export default function PPGscopeApp() {
  // Session Authentication State (In-Memory Only, No Cookies)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Application Data State
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "domain_stats" | "charts" | "intelligence" | "cross_sections" | "titles" | "articles" | "methodology"
  >("domain_stats");

  // Single Medium Selector (All 546 or specific medium)
  const [selectedMediumDomain, setSelectedMediumDomain] = useState<string>("ALL");
  const [mediumSearchQuery, setMediumSearchQuery] = useState<string>("");

  // Locality Views Controls
  const [localityMode, setLocalityMode] = useState<"ALL" | "LOCAL">("ALL");
  const [pureLocalOnly, setPureLocalOnly] = useState<boolean>(false);

  // Time Period Filtering State
  const [timePreset, setTimePreset] = useState<"24h" | "7d" | "30d" | "90d" | "1y" | "all" | "custom">("30d");
  const [customStartDate, setCustomStartDate] = useState("2024-03-09");
  const [customEndDate, setCustomEndDate] = useState("2026-10-18");
  const [clientNow, setClientNow] = useState<number | null>(null);

  // Table & directory filters
  const [titleSearch, setTitleSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("wszystkie");
  const [typeFilter, setTypeFilter] = useState("wszystkie");
  const [selectedDomainFilter, setSelectedDomainFilter] = useState("wszystkie");
  const [selectedLocalityFilter, setSelectedLocalityFilter] = useState("wszystkie");

  // Settings Modal State with LocalStorage Persistence
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("https://nkeoyouxtschemvpqgmq.supabase.co");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");

  // Live Testing States
  const [geminiTestStatus, setGeminiTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [geminiLatency, setGeminiLatency] = useState<number | null>(null);
  const [liveAiResult, setLiveAiResult] = useState<any | null>(null);
  const [geminiClassifying, setGeminiClassifying] = useState(false);

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

      const nowMs = Date.now();
      setClientNow(nowMs);
      const endStr = new Date(nowMs).toISOString().split("T")[0];
      const startStr = new Date(nowMs - 30 * 86400 * 1000).toISOString().split("T")[0];
      setCustomStartDate(startStr);
      setCustomEndDate(endStr);
    } catch {
      // Ignore localStorage in private browsing
    }
  }, []);

  const handleSaveSettings = () => {
    try {
      localStorage.setItem("ppgscope_gemini_api_key", geminiApiKey);
      localStorage.setItem("ppgscope_supabase_url", supabaseUrl);
      localStorage.setItem("ppgscope_supabase_anon_key", supabaseAnonKey);
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
          outlet: article.portal_name,
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
  // DYNAMIC FILTERING: TIME WINDOW & SINGLE MEDIUM SELECTION
  // =========================================================================

  const { dateRange, filteredArticles } = useMemo(() => {
    const staticBase = new Date("2026-03-31T20:00:00Z");
    if (!data || !data.recent_articles) {
      return {
        dateRange: { start: staticBase, end: staticBase },
        filteredArticles: [],
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
    } else if (timePreset === "1y") {
      start = new Date(now.getTime() - 365 * 86400 * 1000);
    } else if (timePreset === "all") {
      start = new Date("2024-03-09T08:00:00+01:00");
    } else {
      start = new Date(customStartDate + "T00:00:00");
      end = new Date(customEndDate + "T23:59:59");
    }

    const arts = data.recent_articles.filter((a) => {
      const pub = new Date(a.published_at);
      const matchesTime = pub >= start && pub <= end;
      const matchesMedium = selectedMediumDomain === "ALL" || a.portal_domain === selectedMediumDomain;
      return matchesTime && matchesMedium;
    });

    return {
      dateRange: { start, end },
      filteredArticles: arts,
    };
  }, [data, timePreset, customStartDate, customEndDate, clientNow, selectedMediumDomain]);

  // Selected Medium Details
  const selectedMediumObj = useMemo(() => {
    if (!data || selectedMediumDomain === "ALL") return null;
    return data.titles.find((t) => t.domain === selectedMediumDomain) || null;
  }, [data, selectedMediumDomain]);

  // =========================================================================
  // 18 DOMAINS & LOCALITY CALCULATIONS
  // =========================================================================

  const domainBreakdown = useMemo(() => {
    const totalCount = filteredArticles.length;
    const domains = DOMAINS_SPEC;

    // Counts per domain and locality
    const counts: { [slug: string]: { c: number; cl: number; l: number; total: number } } = {};
    domains.forEach((d) => {
      counts[d.slug] = { c: 0, cl: 0, l: 0, total: 0 };
    });

    let countC = 0;
    let countCL = 0;
    let countL = 0;

    filteredArticles.forEach((art) => {
      const dSlug = art.domain || "spolecznosc";
      const loc = art.locality || "C";

      if (!counts[dSlug]) {
        counts[dSlug] = { c: 0, cl: 0, l: 0, total: 0 };
      }

      if (loc === "L") {
        counts[dSlug].l += 1;
        countL += 1;
      } else if (loc === "CL") {
        counts[dSlug].cl += 1;
        countCL += 1;
      } else {
        counts[dSlug].c += 1;
        countC += 1;
      }
      counts[dSlug].total += 1;
    });

    // Key Indicators:
    // udział treści lokalnej = (L + CL) / wszystkie
    const localContentShare = totalCount > 0 ? (countL + countCL) / totalCount : 0.0;
    // wskaźnik lokalizacji = CL / (C + CL)
    const localizationIndex = (countC + countCL) > 0 ? countCL / (countC + countCL) : 0.0;

    return {
      totalCount,
      countC,
      countCL,
      countL,
      localContentShare: Math.round(localContentShare * 1000) / 10,
      localizationIndex: Math.round(localizationIndex * 1000) / 10,
      domains: domains.map((d) => {
        const item = counts[d.slug] || { c: 0, cl: 0, l: 0, total: 0 };
        return {
          ...d,
          countC: item.c,
          countCL: item.cl,
          countL: item.l,
          total: item.total,
          pct: totalCount > 0 ? Math.round((item.total / totalCount) * 1000) / 10 : 0.0,
        };
      }),
    };
  }, [filteredArticles]);

  // Dynamic Authorship Breakdown for Selected Medium & Time Window
  const authorshipStats = useMemo(() => {
    const total = filteredArticles.length;
    if (total === 0) {
      return { named: 0, anon: 0, wire: 0, partner: 0, namedPct: 0, anonPct: 0, wirePct: 0, partnerPct: 0 };
    }
    const named = filteredArticles.filter((a) => a.byline_type === "named").length;
    const anon = filteredArticles.filter((a) => a.byline_type === "anonymous").length;
    const wire = filteredArticles.filter((a) => a.byline_type === "wire").length;
    const partner = filteredArticles.filter((a) => a.byline_type === "partner").length;
    return {
      named,
      anon,
      wire,
      partner,
      namedPct: Math.round((named / total) * 1000) / 10,
      anonPct: Math.round((anon / total) * 1000) / 10,
      wirePct: Math.round((wire / total) * 1000) / 10,
      partnerPct: Math.round((partner / total) * 1000) / 10,
    };
  }, [filteredArticles]);

  // Dynamic Locality Breakdown for Selected Medium & Time Window
  const localityStats = useMemo(() => {
    const total = filteredArticles.length;
    if (total === 0) {
      return { l: 0, cl: 0, c: 0, lPct: 0, clPct: 0, cPct: 0 };
    }
    const l = domainBreakdown.countL;
    const cl = domainBreakdown.countCL;
    const c = domainBreakdown.countC;
    return {
      l,
      cl,
      c,
      lPct: Math.round((l / total) * 1000) / 10,
      clPct: Math.round((cl / total) * 1000) / 10,
      cPct: Math.round((c / total) * 1000) / 10,
    };
  }, [filteredArticles, domainBreakdown]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!filteredArticles.length) return;

    const headers = [
      "ID",
      "Tytuł",
      "Serwis",
      "Domena",
      "Region",
      "Data_publikacji",
      "Dziedzina_glowna",
      "Dziedzina_kod",
      "Dziedzina_poboczna",
      "Wariant_lokalnosci",
      "Inny_region_PPG",
      "Wymaga_weryfikacji",
      "Pewnosc",
      "URL"
    ];

    const rows = filteredArticles.map((a) => [
      `"${a.id}"`,
      `"${(a.title || "").replace(/"/g, '""')}"`,
      `"${(a.portal_name || "").replace(/"/g, '""')}"`,
      `"${a.portal_domain}"`,
      `"${a.region || ""}"`,
      `"${a.published_at}"`,
      `"${a.domain}"`,
      `"${DOMAINS_SPEC.find(d => d.slug === a.domain)?.code || ""}"`,
      `"${a.domain_secondary || ""}"`,
      `"${a.locality}"`,
      `"${a.other_region ? "TAK" : "NIE"}"`,
      `"${a.needs_review ? "TAK" : "NIE"}"`,
      `"${a.confidence ?? ""}"`,
      `"${a.url}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ppgscope_artykuly_${selectedMediumDomain}_${timePreset}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              <p className="text-xs text-zinc-400">System wywiadu mediowego i taksonomii Polska Press Grupa</p>
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

  // Loading Screen
  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#060709] text-zinc-100 flex flex-col justify-center items-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 animate-spin text-teal-400" />
          <span className="text-sm font-mono text-zinc-400">Inicjalizacja 546 mediów PPGscope...</span>
        </div>
      </div>
    );
  }

  // Filtered titles for medium selector
  const availableTitles = data.titles;
  const filteredTitlesForSelector = availableTitles.filter((t) =>
    t.name.toLowerCase().includes(mediumSearchQuery.toLowerCase()) ||
    t.domain.toLowerCase().includes(mediumSearchQuery.toLowerCase()) ||
    (t.city && t.city.toLowerCase().includes(mediumSearchQuery.toLowerCase()))
  );

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
                  v2.0 · 18 dziedzin
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="h-2.5 w-2.5" /> 546 portali
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Kategoryzacja tematyczna i analityka lokalności (C / CL / L)
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
                onClick={() => setTimePreset("1y")}
                className={`rounded-lg px-2 py-1 transition-all ${
                  timePreset === "1y"
                    ? "bg-teal-500 text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                1 rok
              </button>
              <button
                onClick={() => setTimePreset("all")}
                className={`rounded-lg px-2 py-1 transition-all ${
                  timePreset === "all"
                    ? "bg-teal-500 text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="Wszystkie artykuły liczone od 9 marca 2024"
              >
                Wszystkie (od 9.03.2024)
              </button>
            </div>

            {/* CSV Export Button */}
            <button
              onClick={handleExportCSV}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all flex items-center gap-1.5 font-mono"
              title="Eksportuj wyfiltrowane artykuły do pliku CSV"
            >
              <Download className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden md:inline">Eksport CSV</span>
            </button>

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
              onClick={() => setActiveTab("domain_stats")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "domain_stats"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-teal-400" /> 18 Dziedzin i Lokalność
            </button>

            <button
              onClick={() => setActiveTab("charts")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "charts"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <PieChart className="h-3.5 w-3.5 text-teal-400" /> Centrum Wykresów
            </button>

            <button
              onClick={() => setActiveTab("intelligence")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "intelligence"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-teal-400" /> Wskaźniki Wywiadu
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
              <Database className="h-3.5 w-3.5 text-teal-400" /> Serwisy PPG (546)
            </button>

            <button
              onClick={() => setActiveTab("articles")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "articles"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-teal-400" /> Baza Artykułów
            </button>

            <button
              onClick={() => setActiveTab("methodology")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "methodology"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Info className="h-3.5 w-3.5 text-teal-400" /> Metodologia v2.0
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">

        {/* Global Context Bar: Medium Selector + Locality Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">

          {/* Medium Selector Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Building2 className="h-4 w-4 text-teal-400" />
              <span>Zakres analizy:</span>
            </div>

            <div className="relative">
              <select
                value={selectedMediumDomain}
                onChange={(e) => setSelectedMediumDomain(e.target.value)}
                className="w-full sm:w-80 rounded-xl border border-white/[0.1] bg-black/60 py-2 pl-3 pr-8 text-xs font-mono text-white focus:border-teal-500 focus:outline-none"
              >
                <option value="ALL">Cała grupa PPG (wszystkie 546 mediów)</option>
                <optgroup label="Dzienniki regionalne (20)">
                  {availableTitles.filter(t => t.type === "DZIENNIK_REGIONALNY" || t.type === "Dziennik regionalny").map(t => (
                    <option key={t.id} value={t.domain}>{t.name} ({t.domain})</option>
                  ))}
                </optgroup>
                <optgroup label="Wszystkie media lokalne i tematyczne (526)">
                  {availableTitles.filter(t => t.type !== "DZIENNIK_REGIONALNY" && t.type !== "Dziennik regionalny").map(t => (
                    <option key={t.id} value={t.domain}>{t.name} ({t.domain})</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {selectedMediumObj && (
              <span className="text-[11px] font-mono text-zinc-400">
                Region: <strong className="text-teal-300">{selectedMediumObj.region}</strong> · {selectedMediumObj.type}
              </span>
            )}
          </div>

          {/* Locality Toggles: Wszystkie / Lokalne + Tylko czysto lokalne */}
          <div className="flex flex-wrap items-center gap-3 border-t lg:border-t-0 border-white/[0.06] pt-3 lg:pt-0">
            <span className="text-xs text-zinc-400 font-mono">Widok:</span>
            <div className="flex rounded-lg border border-white/[0.08] bg-black/60 p-0.5 text-xs font-mono">
              <button
                onClick={() => setLocalityMode("ALL")}
                className={`rounded px-3 py-1 transition-all ${
                  localityMode === "ALL"
                    ? "bg-teal-500 text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Wszystkie (C + CL + L)
              </button>
              <button
                onClick={() => setLocalityMode("LOCAL")}
                className={`rounded px-3 py-1 transition-all ${
                  localityMode === "LOCAL"
                    ? "bg-teal-500 text-black font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Lokalne (L + CL)
              </button>
            </div>

            {localityMode === "LOCAL" && (
              <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer select-none pl-2 border-l border-white/[0.08]">
                <input
                  type="checkbox"
                  checked={pureLocalOnly}
                  onChange={(e) => setPureLocalOnly(e.target.checked)}
                  className="rounded border-zinc-700 bg-black text-teal-500 focus:ring-teal-500 h-3.5 w-3.5"
                />
                <span>Tylko czysto lokalne (ukryj CL)</span>
              </label>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB: 18 DZIEDZIN I LOKALNOŚĆ (MAIN VIEW) */}
        {/* ================================================================= */}
        {activeTab === "domain_stats" && (
          <div className="space-y-6">

            {/* Header Description & Summary Audit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-teal-400" />
                  {selectedMediumDomain === "ALL"
                    ? "Struktura 18 Dziedzin Tematycznych (Cała Grupa PPG)"
                    : `Struktura 18 Dziedzin: ${selectedMediumObj?.name || selectedMediumDomain}`}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {localityMode === "ALL"
                    ? "Widok 'Wszystkie': każdy słupek skumulowany z 3 segmentów: C (centralne), CL (rozwinięcie lokalne), L (lokalne)."
                    : pureLocalOnly
                    ? "Widok 'Lokalne' (Tylko czysto lokalne): prezentuje wyłącznie segment L o bezpośrednim źródle lokalnym."
                    : "Widok 'Lokalne': segmenty L (pełny kolor) oraz CL (jaśniejszy odcień), treści czysto centralne C ukryte."}
                </p>
              </div>

              {/* Exact Article Count Audit */}
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-right font-mono">
                  <span className="text-[10px] uppercase text-emerald-400 block font-bold">Zbadany wolumen</span>
                  <span className="text-sm font-bold text-white">
                    {domainBreakdown.totalCount} artykułów
                  </span>
                </div>
              </div>
            </div>

            {/* Legend Component */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-black/40 p-4 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-zinc-500 font-bold uppercase text-[10px]">Legenda segmentów:</span>
                <span className="flex items-center gap-1.5 text-zinc-200">
                  <span className="h-3 w-3 rounded bg-teal-500" />
                  <strong>L</strong> – lokalne (sprawa o źródle lokalnym z obszaru tytułu)
                </span>
                <span className="flex items-center gap-1.5 text-zinc-200">
                  <span className="h-3 w-3 rounded bg-teal-300" />
                  <strong>CL</strong> – centralne z rozwinięciem lokalnym (sprawa krajowa na przykładzie lokalnym)
                </span>
                {localityMode === "ALL" && (
                  <span className="flex items-center gap-1.5 text-zinc-200">
                    <span className="h-3 w-3 rounded bg-zinc-600" />
                    <strong>C</strong> – centralne (brak lokalnego podmiotu z obszaru tytułu)
                  </span>
                )}
              </div>

              <div className="text-[11px] text-zinc-500">
                18 dziedzin tematycznych v2.0
              </div>
            </div>

            {/* 18 Domains Stacked Bar Chart Cards */}
            <div className="space-y-3">
              {domainBreakdown.domains.map((d) => {
                const totalVisible =
                  localityMode === "ALL"
                    ? d.countC + d.countCL + d.countL
                    : pureLocalOnly
                    ? d.countL
                    : d.countL + d.countCL;

                const maxCount = Math.max(
                  ...domainBreakdown.domains.map((dom) =>
                    localityMode === "ALL"
                      ? dom.countC + dom.countCL + dom.countL
                      : pureLocalOnly
                      ? dom.countL
                      : dom.countL + dom.countCL
                  ),
                  1
                );

                const widthPct = Math.min(100, Math.round((totalVisible / maxCount) * 100));

                const pctL = totalVisible > 0 ? (d.countL / totalVisible) * 100 : 0;
                const pctCL = totalVisible > 0 ? (d.countCL / totalVisible) * 100 : 0;
                const pctC = totalVisible > 0 && localityMode === "ALL" ? (d.countC / totalVisible) * 100 : 0;

                return (
                  <div
                    key={d.slug}
                    className="rounded-xl border border-white/[0.06] bg-[#0c0e12]/80 p-4 space-y-2 hover:border-white/[0.12] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-white/[0.06] text-teal-300 px-1.5 py-0.5 rounded font-bold">
                          {d.code} {d.slug}
                        </span>
                        <span className="font-semibold text-white">{d.name}</span>
                        <span className="text-[11px] text-zinc-400 hidden md:inline">
                          — {d.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-zinc-400">
                          {localityMode === "ALL" ? (
                            <>
                              <span className="text-teal-400 font-bold">{d.countL}L</span> +{" "}
                              <span className="text-teal-300 font-bold">{d.countCL}CL</span> +{" "}
                              <span className="text-zinc-400">{d.countC}C</span> ={" "}
                            </>
                          ) : pureLocalOnly ? (
                            <><span className="text-teal-400 font-bold">{d.countL}L</span> = </>
                          ) : (
                            <>
                              <span className="text-teal-400 font-bold">{d.countL}L</span> +{" "}
                              <span className="text-teal-300 font-bold">{d.countCL}CL</span> ={" "}
                            </>
                          )}
                          <strong className="text-white">{totalVisible} art.</strong>
                        </span>
                        <span className="text-teal-400 font-bold w-12 text-right">
                          {domainBreakdown.totalCount > 0
                            ? Math.round((totalVisible / domainBreakdown.totalCount) * 1000) / 10
                            : 0}%
                        </span>
                      </div>
                    </div>

                    {/* Multi-segment Stacked Bar */}
                    <div className="h-3 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="h-full flex rounded-full overflow-hidden transition-all duration-500"
                      >
                        {/* Segment L (Lokalne - Darker/Vibrant Teal) */}
                        <div
                          style={{ width: `${pctL}%` }}
                          className="h-full bg-teal-500"
                          title={`Lokalne (L): ${d.countL}`}
                        />
                        {/* Segment CL (Centralne Lokalne - Light Teal) */}
                        {!pureLocalOnly && (
                          <div
                            style={{ width: `${pctCL}%` }}
                            className="h-full bg-teal-300"
                            title={`Rozwinięcie lokalne (CL): ${d.countCL}`}
                          />
                        )}
                        {/* Segment C (Centralne - Slate / Zinc) */}
                        {localityMode === "ALL" && (
                          <div
                            style={{ width: `${pctC}%` }}
                            className="h-full bg-zinc-600"
                            title={`Centralne (C): ${d.countC}`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Two Key Indicators Required Under the Chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-1">
                <span className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-teal-400" /> Udział treści lokalnej = (L + CL) / wszystkie
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-teal-400">
                    {domainBreakdown.localContentShare}%
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    ({domainBreakdown.countL + domainBreakdown.countCL} z {domainBreakdown.totalCount} art.)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Odsetek artykułów posiadających wymiar lokalny (czysty lub rozwinięty z depeszy)
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-1">
                <span className="text-xs font-mono uppercase text-zinc-400 flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-blue-400" /> Wskaźnik lokalizacji = CL / (C + CL)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-blue-400">
                    {domainBreakdown.localizationIndex}%
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    ({domainBreakdown.countCL} z {domainBreakdown.countC + domainBreakdown.countCL} spraw centralnych)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Zdolność redakcji do 'przepakowywania' tematów ogólnopolskich na konkretne przykłady lokalne
                </p>
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
                <PieChart className="h-5 w-5 text-teal-400" /> Centrum Wykresów Graficznych i Wizualizacji Danych
              </h2>
              <p className="text-xs text-zinc-400">
                Graficzne podsumowanie struktury mediów, rozkładu lokalności oraz kaskad depeszowych.
              </p>
            </div>

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
                  <div className="relative h-44 w-44">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#14b8a6" strokeWidth="14" strokeDasharray="223 238" strokeDashoffset="0" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#3b82f6" strokeWidth="14" strokeDasharray="9 238" strokeDashoffset="-223" />
                      <circle cx="50" cy="50" r="38" fill="transparent" stroke="#f59e0b" strokeWidth="14" strokeDasharray="6 238" strokeDashoffset="-232" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-white">546</span>
                      <span className="text-[9px] font-mono uppercase text-zinc-400">Portali</span>
                    </div>
                  </div>

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

              {/* Chart 2: Stacked Authorship Distribution Bar (Dynamic for selected medium) */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-400" /> Dystrybucja sygnatur autorstwa
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {selectedMediumDomain === "ALL" ? "Cała sieć" : selectedMediumDomain} · N = {authorshipStats.named + authorshipStats.anon + authorshipStats.wire + authorshipStats.partner}
                  </span>
                </div>

                <div className="space-y-4 py-2">
                  <div className="h-7 w-full rounded-xl overflow-hidden flex font-mono text-[10px] font-bold text-black">
                    <div style={{ width: `${authorshipStats.namedPct}%` }} className="bg-teal-400 flex items-center justify-center">
                      {authorshipStats.namedPct > 6 ? `${authorshipStats.namedPct}%` : ""}
                    </div>
                    <div style={{ width: `${authorshipStats.anonPct}%` }} className="bg-amber-400 flex items-center justify-center">
                      {authorshipStats.anonPct > 6 ? `${authorshipStats.anonPct}%` : ""}
                    </div>
                    <div style={{ width: `${authorshipStats.wirePct}%` }} className="bg-blue-400 flex items-center justify-center text-white">
                      {authorshipStats.wirePct > 6 ? `${authorshipStats.wirePct}%` : ""}
                    </div>
                    <div style={{ width: `${authorshipStats.partnerPct}%` }} className="bg-rose-400 flex items-center justify-center">
                      {authorshipStats.partnerPct > 6 ? `${authorshipStats.partnerPct}%` : ""}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono pt-2">
                    <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
                      <span className="text-teal-400 font-bold block">{authorshipStats.namedPct}% Autorskie imienne ({authorshipStats.named})</span>
                      <span className="text-[11px] text-zinc-400">Dziennikarze z imienia i nazwiska</span>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
                      <span className="text-amber-400 font-bold block">{authorshipStats.anonPct}% Anonimowe ({authorshipStats.anon})</span>
                      <span className="text-[11px] text-zinc-400">Materiały z sygnaturą redakcyjną (red)</span>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
                      <span className="text-blue-400 font-bold block">{authorshipStats.wirePct}% Depesze ({authorshipStats.wire})</span>
                      <span className="text-[11px] text-zinc-400">PAP oraz centrala redakcyjna PPG</span>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5">
                      <span className="text-rose-400 font-bold block">{authorshipStats.partnerPct}% Partner ({authorshipStats.partner})</span>
                      <span className="text-[11px] text-zinc-400">Artykuły sponsorowane i komercyjne</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 3: Locality Proportions (L / CL / C) */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Compass className="h-4 w-4 text-teal-400" /> Rozkład wariantów lokalności (L / CL / C)
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {selectedMediumDomain === "ALL" ? "Cała grupa" : selectedMediumDomain} · N = {localityStats.l + localityStats.cl + localityStats.c}
                  </span>
                </div>

                <div className="space-y-4 py-2">
                  <div className="h-7 w-full rounded-xl overflow-hidden flex font-mono text-[10px] font-bold text-black">
                    <div style={{ width: `${localityStats.lPct}%` }} className="bg-teal-500 flex items-center justify-center text-black">
                      {localityStats.lPct > 6 ? `${localityStats.lPct}%` : ""}
                    </div>
                    <div style={{ width: `${localityStats.clPct}%` }} className="bg-teal-300 flex items-center justify-center text-black">
                      {localityStats.clPct > 6 ? `${localityStats.clPct}%` : ""}
                    </div>
                    <div style={{ width: `${localityStats.cPct}%` }} className="bg-zinc-600 flex items-center justify-center text-white">
                      {localityStats.cPct > 6 ? `${localityStats.cPct}%` : ""}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-2">
                    <div className="rounded-lg border border-teal-500/20 bg-teal-500/10 p-2.5">
                      <span className="text-teal-400 font-bold block">{localityStats.lPct}% Lokalne</span>
                      <span className="text-[11px] text-zinc-400">{localityStats.l} art. (źródło lokalne)</span>
                    </div>
                    <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-2.5">
                      <span className="text-teal-300 font-bold block">{localityStats.clPct}% Rozwinięcie</span>
                      <span className="text-[11px] text-zinc-400">{localityStats.cl} art. (krajowe z kątem)</span>
                    </div>
                    <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-2.5">
                      <span className="text-zinc-300 font-bold block">{localityStats.cPct}% Centralne</span>
                      <span className="text-[11px] text-zinc-400">{localityStats.c} art. (brak kąta lokalnego)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart 3: Wire Propagation Velocity */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-teal-400" /> Prędkość propagacji kaskad depeszowych (v_wire)
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">portale / godzinę</span>
                </div>

                <div className="space-y-3 py-1">
                  {(data.wire_cascades || []).map((wire) => {
                    const velocity = Math.round((wire.reach / wire.duration_hours) * 10) / 10;
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
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart 4: HHI Entity Exposure */}
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
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: WSKAŹNIKI WYWIADU */}
        {/* ================================================================= */}
        {activeTab === "intelligence" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-teal-400" /> Zaawansowane Wskaźniki Wywiadu Mediowego (Reuters/Tow Standard)
              </h2>
              <p className="text-xs text-zinc-400">
                Drzewa kaskad depesz centralnych, mutacje nagłówków (Headline Drift) oraz wskaźniki zniekształcenia agendy lokalnej.
              </p>
            </div>

            <div className="space-y-4">
              {(data.wire_cascades || []).map((wire) => (
                <div key={wire.id} className="rounded-xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-3">
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
        )}

        {/* ================================================================= */}
        {/* TAB: 16 WOJEWÓDZTW */}
        {/* ================================================================= */}
        {activeTab === "cross_sections" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-teal-400" /> Analityka Regionalna 16 Województw
              </h2>
              <p className="text-xs text-zinc-400">
                Rozkład 546 serwisów według województw z udziałem treści lokalnej i syndykacji.
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
                <input
                  type="text"
                  value={titleSearch}
                  onChange={(e) => setTitleSearch(e.target.value)}
                  placeholder="Szukaj portalu lub miasta..."
                  className="rounded-xl border border-white/[0.1] bg-black/60 py-2 px-3 text-xs text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.titles
                .filter((t) => t.name.toLowerCase().includes(titleSearch.toLowerCase()) || t.domain.toLowerCase().includes(titleSearch.toLowerCase()))
                .slice(0, 99)
                .map((t) => (
                  <div key={t.id} className="rounded-xl border border-white/[0.06] bg-[#0c0e12]/80 p-3.5 space-y-2 hover:border-white/[0.12] transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold text-white truncate">{t.name}</span>
                      <a href={`https://${t.domain}`} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-teal-400">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <span className="text-teal-400 truncate max-w-[180px]">{t.domain}</span>
                      <span className="capitalize">{t.region}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/[0.04]">
                      <span>{t.type}</span>
                      <button
                        onClick={() => {
                          setSelectedMediumDomain(t.domain);
                          setActiveTab("domain_stats");
                        }}
                        className="text-teal-400 hover:text-teal-300 font-bold"
                      >
                        Analizuj to medium
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: BAZA ARTYKUŁÓW */}
        {/* ================================================================= */}
        {activeTab === "articles" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-400" /> Baza Publikacji PPG (Taxonomy v2.0)
                </h2>
                <p className="text-xs text-zinc-400">
                  Artykuły z przypisaną dziedziną (18 domen) oraz statusem lokalności (C / CL / L).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedDomainFilter}
                  onChange={(e) => setSelectedDomainFilter(e.target.value)}
                  className="rounded-xl border border-white/[0.1] bg-black/60 py-2 px-3 text-xs text-zinc-300 focus:border-teal-500 focus:outline-none font-mono"
                >
                  <option value="wszystkie">Wszystkie dziedziny (18)</option>
                  {DOMAINS_SPEC.map((d) => (
                    <option key={d.slug} value={d.slug}>{d.code} {d.name}</option>
                  ))}
                </select>

                <select
                  value={selectedLocalityFilter}
                  onChange={(e) => setSelectedLocalityFilter(e.target.value)}
                  className="rounded-xl border border-white/[0.1] bg-black/60 py-2 px-3 text-xs text-zinc-300 focus:border-teal-500 focus:outline-none font-mono"
                >
                  <option value="wszystkie">Wszystkie warianty lokalności</option>
                  <option value="L">L – Lokalne</option>
                  <option value="CL">CL – Rozwinięcie lokalne</option>
                  <option value="C">C – Centralne</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {filteredArticles
                .filter((a) => selectedDomainFilter === "wszystkie" || a.domain === selectedDomainFilter)
                .filter((a) => selectedLocalityFilter === "wszystkie" || a.locality === selectedLocalityFilter)
                .slice(0, 50)
                .map((art) => (
                  <div key={art.id} className="rounded-xl border border-white/[0.06] bg-[#0c0e12]/80 p-4 space-y-2 hover:border-white/[0.12] transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded font-bold">
                          {DOMAINS_SPEC.find(d => d.slug === art.domain)?.code || ""} {DOMAINS_SPEC.find(d => d.slug === art.domain)?.name || art.domain}
                        </span>

                        {art.domain_secondary && (
                          <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-400 border border-white/[0.08] px-1.5 py-0.5 rounded">
                            +{art.domain_secondary}
                          </span>
                        )}

                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          art.locality === "L"
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                            : art.locality === "CL"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        }`}>
                          Wariant {art.locality}
                        </span>

                        {art.other_region && (
                          <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded">
                            Inny region PPG
                          </span>
                        )}

                        {art.needs_review && (
                          <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
                            needs_review
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
        {/* TAB: METODOLOGIA V2.0 */}
        {/* ================================================================= */}
        {activeTab === "methodology" && (
          <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4 text-xs font-mono leading-relaxed text-zinc-300">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Info className="h-4 w-4 text-teal-400" /> Standard Kategoryzacji Tematycznej i Lokalności v2.0
            </h2>

            <div className="space-y-3">
              <p>
                <strong>1. 18 Dziedzin tematycznych:</strong> Zamknięta taksonomia 18 dziedzin (od 01 wladza do 18 swiat). Każdy artykuł otrzymuje dokładnie jedną domenę główną (domain) oraz opcjonalnie maksymalnie jedną domenę poboczną (domain_secondary).
              </p>
              <p>
                <strong>2. Warianty lokalności:</strong>
                <br />• <strong>L (lokalne):</strong> Podmiotem w tytule lub leadzie jest miejscowość, osoba albo instytucja z obszaru danego tytułu prasowego, a sprawa ma źródło lokalne.
                <br />• <strong>CL (centralne z rozwinięciem lokalnym):</strong> Sprawa ogólnokrajowa lub światowa (np. ustawa, decyzje rządu, inflacja, stopy NBP) zilustrowana przykładem, danymi lub mieszkańcami z obszaru tytułu.
                <br />• <strong>C (centralne):</strong> Brak lokalnego podmiotu z obszaru tytułu.
                <br />• <strong>other_region = true:</strong> Tekst o sprawie z regionu innego tytułu PPG (np. sprawa ze Śląska w Gazecie Pomorskiej) otrzymuje wariant C oraz znacznik innego regionu.
              </p>
              <p>
                <strong>3. Dwa kluczowe wskaźniki pod wykresem:</strong>
                <br />• <strong>Udział treści lokalnej = (L + CL) / wszystkie</strong> – odsetek materiałów posiadających jakikolwiek wymiar lokalny.
                <br />• <strong>Wskaźnik lokalizacji = CL / (C + CL)</strong> – zdolność redakcji do przekładania spraw centralnych na poziom lokalny.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/[0.1] bg-[#0c0e12] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <Settings className="h-5 w-5 text-teal-400" />
                <h2 className="text-base font-semibold text-white">Konfiguracja kluczy API i bazy danych</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {settingsSavedNotice && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 font-mono flex items-center gap-2">
                <Check className="h-4 w-4" /> Konfiguracja została pomyślnie zapisana.
              </div>
            )}

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2 text-xs">
              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-teal-400" /> Google Gemini API (AI Classifier)
                  </label>
                  <button onClick={handleTestGemini} disabled={geminiTestStatus === "testing"} className="rounded bg-teal-500/20 border border-teal-500/40 px-2.5 py-1 text-[11px] font-medium text-teal-300">
                    {geminiTestStatus === "testing" ? "Sprawdzanie..." : "Testuj połączenie Gemini"}
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
              </div>

              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <label className="font-semibold text-zinc-200 block">Baza danych PostgreSQL / Supabase</label>
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
                <div className="flex items-center justify-between pt-1">
                  <button onClick={handleTestSupabase} disabled={supabaseTestStatus === "testing" || !supabaseAnonKey} className="rounded bg-sky-500/20 border border-sky-500/40 px-2.5 py-1 text-[11px] font-medium text-sky-300">
                    {supabaseTestStatus === "testing" ? "Sprawdzanie..." : "Testuj połączenie Supabase"}
                  </button>
                  {supabaseTestStatus === "success" && (
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                      <Check className="h-3 w-3" /> Połączenie aktywne ({supabaseRecordsCount ?? 0} rekordów, {supabaseLatency} ms)
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
              <button onClick={() => setIsSettingsOpen(false)} className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white">
                Anuluj
              </button>
              <button onClick={handleSaveSettings} className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-black hover:bg-teal-400 transition-all shadow-md shadow-teal-500/20">
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
                <Sparkles className="h-4 w-4 text-teal-400" /> Wynik Weryfikacji Gemini 3.8 Flash (v2.0)
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
                  <span className="text-zinc-500">Dziedzina główna: </span>
                  <span className="text-teal-400 font-bold">{liveAiResult.domain}</span>
                </div>
                {liveAiResult.domain_secondary && (
                  <div>
                    <span className="text-zinc-500">Dziedzina poboczna: </span>
                    <span className="text-zinc-300 font-bold">{liveAiResult.domain_secondary}</span>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500">Wariant lokalności: </span>
                  <span className="text-emerald-400 font-bold">{liveAiResult.locality}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Inny region: </span>
                  <span className="text-white font-bold">{liveAiResult.other_region ? "TAK" : "NIE"}</span>
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
          PPGscope v2.0 Intelligence · 546 serwisów Polska Press Grupa · Taksonomia 18 Dziedzin & Lokalność (C/CL/L) · Standard Fable 5.1
        </p>
      </footer>
    </div>
  );
}
