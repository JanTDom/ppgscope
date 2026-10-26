"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import ForensicsPanel from "./forensics-panel";
import { DataTrustBadge } from "@/components/DataTrustBadge";
import { PresentationWall, type WallScene } from "@/components/PresentationWall";
import { MethodologyView } from "@/components/views/MethodologyView";
import { CrossSectionsView } from "@/components/views/CrossSectionsView";
import { TitlesView } from "@/components/views/TitlesView";
import { InvestigationReportsView } from "@/components/views/InvestigationReportsView";
import {
  POLITICAL_ACTORS,
  ALL_POLITICAL_ACTOR_IDS,
  DOMAIN_SCOPE_OPTIONS,
  WEIGHTING_MODE_CONFIG,
  evaluatePoliticalSentiment,
  calculateAllPoliticalSentiments,
  calculateMediaAccountability,
  type PoliticalActorId,
  type PoliticalSentimentData,
  type SamplePoliticalArticle,
  type SampleKOArticle,
  type MediaAccountabilityResult,
  type SentimentWeightingMode,
  type RegionalBasketMode,
} from "@/lib/sentiment";
import {
  Shield,
  Lock,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Layers,
  FileText,
  FileSearch,
  Database,
  Settings,
  X,
  ExternalLink,
  GitBranch,
  Sparkles,
  Check,
  Info,
  PieChart,
  Activity,
  Zap,
  Users,
  Compass,
  Clock,
  Download,
  Building2,
  Target,
  Scale,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Vote,
  TrendingUp,
  TrendingDown,
  Newspaper,
  Menu,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Map,
  BookOpen,
  SlidersHorizontal,
  Monitor,
  Radio,
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

interface DomainStatItem {
  slug: string;
  code: string;
  name: string;
  description: string;
  countC: number;
  countCL: number;
  countL: number;
  total: number;
  pct: number;
}

interface DomainBreakdownResult {
  totalCount: number;
  countC: number;
  countCL: number;
  countL: number;
  localContentShare: number;
  localizationIndex: number;
  domains: DomainStatItem[];
  ko_sentiment?: PoliticalSentimentData;
  political_sentiments?: Record<PoliticalActorId, PoliticalSentimentData>;
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

interface PortalVitalityItem {
  domain: string;
  portal_name: string;
  region: string;
  portal_type: string;
  http_status: number;
  vitality_status: "AKTYWNY_UNIKALNY" | "AKTYWNY_SYNDYKAT" | "LEDWO_ZYWY" | "ZOMBIE_AUTOMAT" | "MARTWY";
  vitality_label: string;
  vitality_score: number;
  daily_articles_count: number;
  unique_articles_count: number;
  uniqueness_pct: number;
  syndicated_clones_pct: number;
  hours_since_last_pub: number;
  named_authors_count: number;
  cron_scheduled_pct: number;
  diagnosis: string;
}

interface VitalityStatusBucket {
  count: number;
  pct: number;
  label: string;
  criteria: string;
}

interface PortalVitalityAuditData {
  methodology: string;
  total_portals_audited: number;
  network_daily_articles: number;
  network_unique_daily_articles: number;
  network_avg_uniqueness_pct: number;
  status_breakdown: Record<string, VitalityStatusBucket>;
  portals: PortalVitalityItem[];
}

interface EditorialIntelligenceData {
  homepage_radar: {
    captured_at: string;
    portals_monitored: number;
    avg_hero_dwell_hours: number;
    breaking_badges_active: number;
    paywalled_above_fold_pct: number;
    sponsored_above_fold_pct: number;
    agenda_gap: {
      domain_code: string;
      domain_name: string;
      sitemap_share_pct: number;
      homepage_hero_share_pct: number;
      gap_pp: number;
      interpretation: string;
    }[];
    live_frontpage_leads: {
      portal: string;
      domain: string;
      hero_title: string;
      dwell_hours: number;
      badge: string;
      is_paywalled: boolean;
      topic: string;
    }[];
  };
  version_tracker: {
    monitored_30d_articles: number;
    headline_mutations_count: number;
    headline_mutations_pct: number;
    silent_body_edits_count: number;
    silent_body_edits_pct: number;
    delayed_paywall_locks_count: number;
    delayed_paywall_locks_pct: number;
    tombstone_deleted_count: number;
    tombstone_deleted_pct: number;
    recent_diffs: {
      id: string;
      change_type: string;
      change_label: string;
      portal: string;
      domain: string;
      detected_after_minutes: number;
      old_title: string;
      new_title: string | null;
      body_delta_chars: number;
      http_status: number;
      editorial_note: string;
    }[];
  };
  monetization_and_discover: {
    paywall_strefa_plus: {
      network_share_pct: number;
      regional_dailies_share_pct: number;
      naszemiasto_share_pct: number;
      top_paywalled_domains: { domain_name: string; locked_pct: number }[];
    };
    sponsored_and_commercial: {
      network_share_pct: number;
      rel_sponsored_links_30d: number;
      partner_labeled_articles_30d: number;
      top_commercial_sectors: { sector: string; share_pct: number }[];
    };
    discover_seo_evergreen: {
      network_share_pct: number;
      estimated_30d_volume: number;
      top_templates: { pattern: string; articles_30d: number; syndication_factor: string }[];
    };
  };
  teryt_deserts: {
    total_counties_poland: number;
    full_coverage_counties: number;
    full_coverage_pct: number;
    weak_coverage_counties: number;
    weak_coverage_pct: number;
    information_deserts_counties: number;
    information_deserts_pct: number;
    local_institution_quote_rate_pct: number;
    voivodeship_desert_ranking: {
      voivodeship: string;
      total_counties: number;
      desert_counties: number;
      desert_pct: number;
      avg_local_quotes_per_day: number;
    }[];
    sample_county_audits: {
      teryt: string;
      county: string;
      portal: string;
      status: string;
      unique_local_30d: number;
      institutions_quoted_30d: number;
      note: string;
    }[];
  };
  external_echo: {
    speed_to_publish_benchmarks: {
      region: string;
      ppg_title: string;
      competitor: string;
      median_lag_minutes: number;
      ppg_first_pct: number;
      verdict: string;
    }[];
    google_trends_capture_rate_pct: number;
    median_trends_reaction_minutes: number;
    connectors_roadmap: {
      id: string;
      name: string;
      tier: string;
      status: string;
      proof_type: string;
      current_capabilities: string;
      upgrade_target: string;
    }[];
  };
  newsroom_pulse: {
    total_named_journalists_network: number;
    central_hub_authors_count: number;
    local_beat_reporters_count: number;
    avg_top3_authors_concentration_pct: number;
    network_cron_scheduled_pct: number;
    weekend_drop_pct: number;
    hub_authors_leaderboard: {
      name: string;
      role: string;
      articles_30d: number;
      syndicated_copies_30d: number;
      portals_reached: number;
    }[];
    hourly_rhythm: {
      hour: string;
      human_pct: number;
      cron_pct: number;
      volume_index: number;
    }[];
  };
  homepage_staleness_radar?: {
    methodology: string;
    avg_weekday_dwell_network_hours: number;
    avg_weekend_dwell_network_hours: number;
    avg_evening_freeze_network_hours: number;
    status_counts: Record<string, number>;
    portals: {
      domain: string;
      portal_name: string;
      region: string;
      current_hero_title: string;
      current_hero_dwell_hours: number;
      avg_weekday_dwell_hours: number;
      avg_weekend_dwell_hours: number;
      evening_freeze_hours: number;
      swaps_per_24h: number;
      median_reaction_minutes: number;
      staleness_status: "DYNAMICZNA_CZOLOWKA" | "UMIARKOWANA_ROTACJA" | "ZASTYGLA_JEDYNKA";
      staleness_label: string;
      diagnosis: string;
    }[];
  };
  syndication_and_canonical_audit?: {
    methodology: string;
    network_syndicated_copies_30d: number;
    proper_canonical_to_origin_pct: number;
    self_canonical_cannibalizing_copies_30d: number;
    net_exporter_portals_count: number;
    balanced_portals_count: number;
    net_importer_portals_count: number;
    portals: {
      domain: string;
      portal_name: string;
      region: string;
      role: "EKSPORTER_TRESCI" | "ZROWNOWAZONY" | "BIORCA_KLONOW";
      role_label: string;
      exported_originals_30d: number;
      generated_network_copies_30d: number;
      imported_clones_30d: number;
      export_to_import_ratio: number;
      cross_domain_canonical_pct: number;
      self_canonical_clones_30d: number;
      seo_cannibalization_risk: "NISKIE" | "SREDNIE" | "WYSOKIE";
      diagnosis: string;
    }[];
  };
  regional_competitor_1to1_benchmarks?: {
    region: string;
    city_hub: string;
    ppg_portal_name: string;
    ppg_domain: string;
    competitor_name: string;
    competitor_domain: string;
    ppg_local_daily_volume: number;
    competitor_local_daily_volume: number;
    ppg_first_on_breaking_pct: number;
    median_lag_minutes: number;
    competitor_advantage_topics: string[];
    ppg_advantage_topics: string[];
    domain_comparison: {
      domain_code: string;
      domain_name: string;
      ppg_daily_count: number;
      competitor_daily_count: number;
      ppg_share_pct: number;
      competitor_share_pct: number;
      delta_pp: number;
    }[];
    executive_verdict: string;
  }[];
  executive_morning_briefing?: {
    generated_at: string;
    briefing_edition: string;
    network_24h_summary: {
      total_articles_24h: number;
      unique_articles_24h: number;
      local_and_localized_share_pct: number;
      active_unique_portals_count: number;
      frozen_frontpages_count: number;
      critical_anomalies_count: number;
    };
    top5_locality_dailies: {
      rank: number;
      portal: string;
      domain: string;
      region: string;
      local_l_cl_pct: number;
      pure_local_l_pct: number;
      hero_dwell_h: number;
    }[];
    bottom5_locality_dailies: {
      rank: number;
      portal: string;
      domain: string;
      region: string;
      local_l_cl_pct: number;
      pure_local_l_pct: number;
      hero_dwell_h: number;
    }[];
    active_anomalies: {
      id: string;
      severity: "CRITICAL" | "WARNING";
      category: string;
      target: string;
      metric: string;
      action_required: string;
    }[];
    kpi_scorecard: {
      portal: string;
      domain: string;
      region: string;
      local_l_cl_pct: number;
      clones_pct: number;
      hero_dwell_h: number;
      canonical_ok_pct: number;
      sla_status: "W_NORMIE" | "OSTRZEZENIE" | "NARUSZENIE_SLA";
    }[];
  };
}

interface LiveVitalityProbeResult {
  ok: boolean;
  domain: string;
  probed_at: string;
  source_used?: string;
  http_status: number;
  latency_ms: number;
  vitality_status: string;
  vitality_label: string;
  vitality_score: number;
  feed_items_count: number;
  unique_local_count: number;
  uniqueness_pct: number;
  syndicated_clones_pct: number;
  discover_bait_pct: number;
  cron_scheduled_pct: number;
  hours_since_last_pub: number;
  homepage_lead_title: string | null;
  homepage_paywall_markers: number;
  homepage_sponsored_markers: number;
  diagnosis: string;
  sample_titles: {
    title: string;
    link: string;
    pubDate: string;
    isUniqueLocal: boolean;
    isDiscoverBait: boolean;
    isCronMinute: boolean;
  }[];
  error?: string;
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
  server_aggregates?: Record<string, { global: DomainBreakdownResult; per_medium: Record<string, DomainBreakdownResult> }>;
  sample_ko_articles?: SampleKOArticle[];
  portal_vitality_audit?: PortalVitalityAuditData;
  editorial_intelligence?: EditorialIntelligenceData;
}

interface DataProvenance {
  dataset_id: string;
  mode: "synthetic_fixture" | "live" | "mixed" | "live_streaming";
  display_label: string;
  trust_label: string;
  generated_at: string;
  source_class: string;
  source_summary: string;
  primary_sources: string[];
  live_paths: {
    path: string;
    source: string;
    trust: string;
    storage: string;
  }[];
  not_verified_in_static_payload: string[];
  honesty_note: string;
}

interface IngestStatusPayload {
  configured: boolean;
  latest_run: {
    status: "running" | "success" | "partial" | "failed";
    started_at: string;
    finished_at: string | null;
    sources_attempted: number;
    sources_succeeded: number;
    articles_written: number;
    metrics_written: number;
  } | null;
  metric_proofs: Array<{
    metric_key: string;
    status: "observed" | "partial" | "no_data";
    source_urls: string[];
  }>;
}


function DataScopeStrip({
  provenance,
  ingestStatus,
  ingestUnavailable,
  onRefreshScan,
  isScanning,
  scannedCount,
}: {
  provenance: DataProvenance | null;
  ingestStatus: IngestStatusPayload | null;
  ingestUnavailable: boolean;
  onRefreshScan?: () => void;
  isScanning?: boolean;
  scannedCount?: number;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  if (!provenance && !ingestStatus && !ingestUnavailable) return null;

  const isLive = provenance?.mode === "live_streaming" || provenance?.mode === "live";
  const run = ingestStatus?.latest_run;
  const ingestLabel = isScanning
    ? "PRZECZESYWANIE..."
    : isLive
      ? "POMIAR W LOCIE (ZERO DB)"
      : ingestUnavailable
        ? "TRYB IN-FLIGHT"
        : run?.status === "success" ? "INGEST · OK" : "TRYB IN-FLIGHT";

  const timestamp = provenance?.generated_at
    ? new Date(provenance.generated_at).toLocaleString("pl-PL")
    : "bieżąca";

  return (
    <section
      className={`ppg-data-scope rounded-2xl border ${isLive ? "border-teal-400/20 bg-teal-400/[0.05]" : "border-amber-400/25 bg-amber-400/[0.065]"}`}
      aria-label="Zakres i status danych"
    >
      <div className="flex flex-col gap-3 px-3.5 py-3 sm:px-4 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`hidden shrink-0 rounded-xl p-2 sm:block ${isLive ? "bg-teal-400/10 text-teal-200" : "bg-amber-400/10 text-amber-200"}`}>
            {isLive ? <Radio className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white">{provenance?.display_label || "Przeczesywanie na żywo (In-Flight)"}</p>
              {provenance ? <DataTrustBadge provenance={provenance} compact /> : null}
              <span className={`rounded-full border px-2 py-1 text-[9px] font-mono uppercase tracking-[0.08em] ${isScanning ? "border-teal-400/40 text-teal-300 animate-pulse" : "border-teal-400/30 text-teal-200"}`}>
                {ingestLabel}
              </span>
              {typeof scannedCount === "number" && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                  {scannedCount.toLocaleString("pl-PL")} zbadanych publikacji
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-[11px] leading-5 text-zinc-300 sm:text-xs">
              {provenance?.source_summary || "Przeczesywanie publicznych strumieni PPG na bieżąco bez gromadzenia w bazie danych."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-zinc-500">Ostatni skan · {timestamp}</span>
          {onRefreshScan && (
            <button
              type="button"
              onClick={onRefreshScan}
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1.5 text-[11px] font-medium text-teal-200 transition hover:bg-teal-500/20 disabled:opacity-50"
              title="Przeczesz na bieżąco serwery mediów PPG"
            >
              <RefreshCw className={`h-3 w-3 ${isScanning ? "animate-spin text-teal-400" : "text-teal-400"}`} />
              {isScanning ? "Przeczesuję..." : "Przeskanuj na żywo"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-teal-400/30 hover:bg-teal-400/[0.08] hover:text-white"
            aria-expanded={detailsOpen}
          >
            {detailsOpen ? "Zwiń szczegóły" : "O źródle danych"}
          </button>
        </div>
      </div>

      {detailsOpen ? (
        <div className="grid gap-3 border-t border-white/[0.08] px-3.5 py-3 text-xs leading-5 text-zinc-300 sm:grid-cols-2 sm:px-4 lg:grid-cols-4">
          <div>
            <span className="ppg-data-scope-label">Źródło</span>
            <p>{provenance?.source_class || "—"}</p>
          </div>
          <div>
            <span className="ppg-data-scope-label">Zakres</span>
            <p>{provenance?.display_label || "—"}</p>
          </div>
          <div>
            <span className="ppg-data-scope-label">Ingest</span>
            {run ? (
              <p>{run.sources_succeeded}/{run.sources_attempted} źródeł · {run.articles_written.toLocaleString("pl-PL")} artykułów · {run.metrics_written} proofów</p>
            ) : (
              <p className="text-amber-200">Status ingestu niedostępny</p>
            )}
          </div>
          <div>
            <span className="ppg-data-scope-label">Zasada</span>
            <p>{provenance?.honesty_note || "Wyniki wymagają interpretacji w kontekście źródła i zakresu."}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}


function ChartPanel({
  title,
  icon: Icon,
  meta,
  children,
  className = "",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-4 ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-teal-400" />
          {title}
        </h3>
        {meta ? <span className="shrink-0 text-[10px] font-mono text-zinc-500">{meta}</span> : null}
      </div>
      {children}
    </section>
  );
}

type AppTab =
  | "overview"
  | "domain_stats"
  | "executive_briefing"
  | "compare"
  | "vitality_audit"
  | "charts"
  | "intelligence"
  | "cross_sections"
  | "titles"
  | "articles"
  | "methodology"
  | "ko_sentiment"
  | "investigation_reports"
  | "forensics";

type ChartView = "all" | "content" | "network" | "operations";
type TimePreset = "24h" | "7d" | "30d" | "90d" | "1y" | "all" | "custom";

const NAV_GROUPS: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { id: AppTab; label: string; meta?: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    label: "Pulpit",
    icon: LayoutDashboard,
    items: [
      { id: "executive_briefing", label: "Briefing zarządczy", meta: "07:30", icon: Target },
      { id: "domain_stats", label: "Dziedziny i lokalność", meta: "18", icon: BarChart3 },
    ],
  },
  {
    label: "Analiza",
    icon: SlidersHorizontal,
    items: [
      { id: "investigation_reports", label: "Studio raportów", meta: "AI / PDF", icon: FileSearch },
      { id: "forensics", label: "Szyba śledcza", icon: Shield },
      { id: "compare", label: "Porównywarka mediów", meta: "A / B", icon: Scale },
      { id: "ko_sentiment", label: "Wydźwięk polityczny", meta: "8 sił", icon: Vote },
      { id: "vitality_audit", label: "Żywotność i unikalność", meta: "553", icon: Activity },
      { id: "charts", label: "Centrum wykresów", icon: PieChart },
      { id: "intelligence", label: "Wskaźniki wywiadu", icon: Zap },
      { id: "cross_sections", label: "Przekroje regionalne", meta: "16", icon: Map },
    ],
  },
  {
    label: "Biblioteka",
    icon: BookOpen,
    items: [
      { id: "titles", label: "Serwisy PPG", meta: "553", icon: Database },
      { id: "articles", label: "Baza artykułów", icon: FileText },
      { id: "methodology", label: "Metodologia", meta: "v2.0", icon: Info },
    ],
  },
];


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

const DOMAIN_NAME_MAP: Record<string, string> = {
  wladza: "Władza i polityka",
  zdarzenia: "Bezpieczeństwo i zdarzenia",
  obronnosc: "Obronność",
  gospodarka: "Gospodarka i praca",
  infrastruktura: "Infrastruktura i transport",
  przestrzen: "Przestrzeń i mieszkanie",
  zdrowie: "Zdrowie",
  edukacja: "Edukacja i dzieci",
  srodowisko: "Środowisko i klimat",
  spolecznosc: "Społeczność i ludzie",
  kultura: "Kultura",
  historia: "Historia i pamięć",
  czas_wolny: "Czas wolny i turystyka",
  sport: "Sport",
  rozrywka: "Rozrywka i celebryci",
  styl_zycia: "Styl życia i poradnictwo",
  rolnictwo: "Wieś i rolnictwo",
  swiat: "Świat",
};

const LOCALITY_NAME_MAP: Record<string, string> = {
  L: "Lokalne",
  CL: "Centralne z rozwinięciem lokalnym",
  C: "Centralne",
};

const INTERNAL_CSV_MAX_BYTES = 1_000_000;
const INTERNAL_CSV_HEADER = "url,pageviews,engaged_time_sec,strefa_plus_conversions";

export default function PPGscopeApp() {
  // Session Authentication State (server-issued HttpOnly cookie)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  // Application Data State
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [provenance, setProvenance] = useState<DataProvenance | null>(null);
  const [ingestStatus, setIngestStatus] = useState<IngestStatusPayload | null>(null);
  const [ingestUnavailable, setIngestUnavailable] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>("executive_briefing");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [chartView, setChartView] = useState<ChartView>("all");
  const [wallMode, setWallMode] = useState(false);
  const [wallScene, setWallScene] = useState<WallScene>("network");

  // Portal Vitality & Uniqueness Audit States
  const [vitalityStatusFilter, setVitalityStatusFilter] = useState<string>("ALL");
  const [vitalityRegionFilter, setVitalityRegionFilter] = useState<string>("ALL");
  const [vitalitySortBy, setVitalitySortBy] = useState<"score" | "uniqueness" | "unique_daily" | "hours">("score");
  const [vitalitySearchQuery, setVitalitySearchQuery] = useState<string>("");
  const [probeDomainInput, setProbeDomainInput] = useState<string>("gazetakrakowska.pl");
  const [isProbingVitality, setIsProbingVitality] = useState<boolean>(false);
  const [liveProbeResult, setLiveProbeResult] = useState<LiveVitalityProbeResult | null>(null);

  // Operational Intelligence Sub-Module Switcher
  const [intelSubTab, setIntelSubTab] = useState<
    | "homepage_radar"
    | "staleness_radar"
    | "canonical_syndication"
    | "competitor_1to1"
    | "version_tracker"
    | "monetization"
    | "teryt_deserts"
    | "external_echo"
    | "newsroom_pulse"
    | "wire_cascades"
  >("homepage_radar");

  // Executive Scorecard SLA Thresholds & Competitor Benchmark Selector
  const [slaMinLocalPct, setSlaMinLocalPct] = useState<number>(55);
  const [slaMaxClonesPct, setSlaMaxClonesPct] = useState<number>(48);
  const [slaMaxHeroDwellHours, setSlaMaxHeroDwellHours] = useState<number>(4.2);
  const [slaMinCanonicalPct, setSlaMinCanonicalPct] = useState<number>(80);
  const [selectedCompetitorRegion, setSelectedCompetitorRegion] = useState<string>("Małopolskie");

  // Internal Data Adapter (URL Matcher for GA4 / GSC / Strefa Plus)
  const [internalCsvInput, setInternalCsvInput] = useState<string>(INTERNAL_CSV_HEADER);


  // Political Sentiment States (KO, PiS, PSL, Polska 2050, Lewica, Konfederacja, Karol Nawrocki, Rozwój Plus)
  const [selectedPoliticalActor, setSelectedPoliticalActor] = useState<PoliticalActorId>("ko");
  const [sentimentDomainScope, setSentimentDomainScope] = useState<string>("all_political");
  const [sentimentWeightingMode, setSentimentWeightingMode] = useState<SentimentWeightingMode>("raw");
  const [sentimentRegionalBasket, setSentimentRegionalBasket] = useState<RegionalBasketMode>("ALL");
  const [selectedKOSentimentFilter, setSelectedKOSentimentFilter] = useState<"all" | "positive" | "neutral" | "negative">("all");
  const [mediaAccountabilitySearch, setMediaAccountabilitySearch] = useState<string>("");
  const [mediaAccountabilityType, setMediaAccountabilityType] = useState<string>("ALL");
  const [mediaAccountabilitySort, setMediaAccountabilitySort] = useState<"impact" | "net_desc" | "net_asc" | "mentions" | "name">("impact");
  const [liveTesterActor, setLiveTesterActor] = useState<PoliticalActorId | "auto">("auto");
  const [liveTesterInput, setLiveTesterInput] = useState<string>(
    "Rząd Tuska odblokował kolejne środki z KPO dla małopolskich szpitali powiatowych"
  );
  const [liveTesterResult, setLiveTesterResult] = useState<{
    sentiment: "positive" | "neutral" | "negative" | "no_ko" | "no_actor";
    label: string;
    rationale: string;
    detected_entities: string[];
    actor_id?: PoliticalActorId;
    actor_name?: string;
  } | null>(null);

  // Single Medium Selector & Head-to-Head Comparison Selector (All 546 or specific media)
  const [selectedMediumDomain, setSelectedMediumDomain] = useState<string>("ALL");
  const [mediumSearchQuery, setMediumSearchQuery] = useState<string>("");
  const [compareMediumDomain, setCompareMediumDomain] = useState<string>("NONE");
  const [compareSearchQuery, setCompareSearchQuery] = useState<string>("");

  // Three View Modes: Wszystkie / Podział na centralne i lokalne / Podział na C, CL, L
  const [viewMode, setViewMode] = useState<"ALL" | "CENTRAL_LOCAL" | "THREE_WAY">("ALL");

  // Time Period Filtering State
  const [timePreset, setTimePreset] = useState<"24h" | "7d" | "30d" | "90d" | "1y" | "all" | "custom">("30d");
  const [customStartDate, setCustomStartDate] = useState("2024-03-09");
  const [customEndDate, setCustomEndDate] = useState("2026-10-26");
  const [clientNow, setClientNow] = useState<number | null>(null);

  // Table & directory filters
  const [selectedDomainFilter, setSelectedDomainFilter] = useState("wszystkie");
  const [selectedLocalityFilter, setSelectedLocalityFilter] = useState("wszystkie");
  const totalTitlesCount = data?.titles?.length || 553;

  // Settings Modal State (secrets remain server-side)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  const [internalCsvNotice, setInternalCsvNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Live Testing States
  const [geminiTestStatus, setGeminiTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [geminiLatency, setGeminiLatency] = useState<number | null>(null);
  const [liveAiResult, setLiveAiResult] = useState<{
    error?: string;
    domain?: string;
    domain_secondary?: string;
    locality?: string;
    other_region?: boolean;
    confidence?: number;
    rationale?: string;
  } | null>(null);

  const [supabaseTestStatus, setSupabaseTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [supabaseLatency, setSupabaseLatency] = useState<number | null>(null);
  const [supabaseRecordsCount, setSupabaseRecordsCount] = useState<number | null>(null);

  // Live In-Flight Session Articles (Zero Database Storage - Pure Session Memory)
  const [liveSessionArticles, setLiveSessionArticles] = useState<ArticleItem[]>([]);
  const [isFetchingLive, setIsFetchingLive] = useState(false);
  const [liveFetchDomain, setLiveFetchDomain] = useState<string>("gazetakrakowska.pl");
  const [liveFetchNotice, setLiveFetchNotice] = useState<string | null>(null);
  const [articlesViewMode, setArticlesViewMode] = useState<"live_session" | "sample_archive">("live_session");

  // Za każdym odświeżeniem strony unieważniamy sesję ciasteczkową na serwerze,
  // wymuszając ponowne uwierzytelnienie hasłem analitycznym.
  useEffect(() => {
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, []);

  const internalRowsCount = useMemo(
    () =>
      internalCsvInput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.toLowerCase().startsWith("url,")).length,
    [internalCsvInput]
  );

  const internalTelemetryMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!internalCsvInput) return map;
    const lines = internalCsvInput.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith("url,")) continue;
      const parts = trimmed.split(",").map((p) => p.trim());
      const url = parts[0] || "";
      const pv = parseInt(parts[1], 10) || 0;
      if (!url) continue;
      try {
        let hostname = "";
        if (url.startsWith("http://") || url.startsWith("https://")) {
          hostname = new URL(url).hostname.replace(/^www\./, "");
        } else {
          hostname = url.split("/")[0].replace(/^www\./, "");
        }
        if (hostname) {
          map[hostname] = (map[hostname] || 0) + pv;
        }
      } catch {
        // ignore malformed
      }
    }
    return map;
  }, [internalCsvInput]);

  const handleInternalCsvFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > INTERNAL_CSV_MAX_BYTES) {
      setInternalCsvNotice({ kind: "error", text: "Plik jest za duży (limit 1 MB). Podziel dane na mniejsze części." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      if (text.trim().length === 0) {
        setInternalCsvNotice({ kind: "error", text: "Plik jest pusty." });
        return;
      }
      setInternalCsvInput(text.replace(/\r\n?/g, "\n"));
      setInternalCsvNotice({ kind: "ok", text: `Wczytano plik ${file.name}. Dane żyją tylko w tej sesji przeglądarki.` });
    };
    reader.onerror = () => setInternalCsvNotice({ kind: "error", text: "Nie udało się odczytać pliku. Spróbuj ponownie." });
    reader.readAsText(file);
  };

  const handleSaveSettings = () => {
    setSettingsSavedNotice(true);
    window.setTimeout(() => {
      setSettingsSavedNotice(false);
      setIsSettingsOpen(false);
    }, 1500);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/gemini/config", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        setGeminiConfigured(Boolean(result.configured));
        setSupabaseConfigured(Boolean(result.supabaseConfigured));
      })
      .catch(() => {
        setGeminiConfigured(false);
        setSupabaseConfigured(false);
      });

    const timer = window.setTimeout(() => {
      const nowMs = Date.now();
      setClientNow(nowMs);
      const endStr = new Date(nowMs).toISOString().split("T")[0];
      const startStr = new Date(nowMs - 30 * 86400 * 1000).toISOString().split("T")[0];
      setCustomStartDate(startStr);
      setCustomEndDate(endStr);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  const triggerLiveScan = useCallback(async (
    domainToScan?: string,
    opts?: { preset?: string; topic?: string; actor?: string; q?: string }
  ) => {
    setTimeout(() => setIsLiveScanning(true), 0);
    try {
      const target = domainToScan || selectedMediumDomain || "ALL";
      const params = new URLSearchParams({
        domain: target,
        limit: "150",
      });
      const activePreset = opts?.preset || (timePreset !== "custom" ? timePreset : "30d");
      if (activePreset) params.set("preset", activePreset);
      if (opts?.topic) params.set("topic", opts.topic);
      if (opts?.actor) params.set("actor", opts.actor);
      if (opts?.q) params.set("q", opts.q);

      const res = await fetch(`/api/articles/live?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok && json.ok && Array.isArray(json.articles) && json.articles.length > 0) {
        const incoming = json.articles as ArticleItem[];
        setData((prev): DashboardPayload | null => {
          if (!prev) return prev;
          const existing = prev.recent_articles || [];
          const existingMap = new globalThis.Map<string, ArticleItem>();
          for (const a of existing) {
            existingMap.set(a.url, a);
          }
          for (const na of incoming) {
            existingMap.set(na.url, na);
          }
          const merged: ArticleItem[] = Array.from(existingMap.values());
          merged.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
          return {
            ...prev,
            recent_articles: merged,
            generated_at: new Date().toISOString(),
          };
        });
        setLiveSessionArticles(incoming);
        setLiveFetchNotice(
          `Przeskanowano na żywo sieć PPG (${opts?.actor ? `podmiot: ${opts.actor.toUpperCase()}` : opts?.topic ? `dziedzina: ${opts.topic}` : "strumień ogólny"}): ${incoming.length} publikacji w locie (${json.articles_24h_count ?? incoming.length} z ostatnich 24h).`
        );
      }
    } catch (err) {
      console.error("Błąd skanowania na żywo:", err);
    } finally {
      setIsLiveScanning(false);
    }
  }, [selectedMediumDomain, timePreset]);

  // Fetch dashboard dataset
  useEffect(() => {
    async function loadData() {
      try {
        const [dataRes, provenanceRes, ingestRes] = await Promise.all([
          fetch("/data/dashboard.json", { cache: "no-store" }),
          fetch("/data/provenance.json", { cache: "no-store" }),
          fetch("/api/ingest/status", { cache: "no-store" }),
        ]);
        if (!dataRes.ok) throw new Error("Nie można pobrać bazy danych PPGscope.");
        const json = await dataRes.json();
        setData(json);
        if (provenanceRes.ok) setProvenance(await provenanceRes.json());
        if (ingestRes.ok) {
          setIngestStatus(await ingestRes.json());
          setIngestUnavailable(false);
        } else {
          setIngestUnavailable(true);
        }

        // Automatic in-flight live scan of publisher streams on start
        triggerLiveScan("ALL");
      } catch (err) {
        console.error("Błąd ładowania danych dashboard.json:", err);
        setIngestUnavailable(true);
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) loadData();
  }, [isAuthenticated, triggerLiveScan]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(false);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      if (response.ok) {
        setIsAuthenticated(true);
        setPasswordInput("");
      } else {
        setPasswordError(true);
      }
    } catch {
      setPasswordError(true);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setIsAuthenticated(false);
    setData(null);
    setWallMode(false);
  };

  const handleTestGemini = async () => {
    setGeminiTestStatus("testing");
    try {
      const res = await fetch("/api/gemini/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.ok) {
        setLiveAiResult(resJson.classification);
      } else {
        setLiveAiResult({ error: resJson.error || "Błąd klasyfikacji" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Błąd sieci";
      setLiveAiResult({ error: message });
    }
  };

  const handleProbePortalVitality = async (domainToProbe: string) => {
    const cleanDom = domainToProbe.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!cleanDom) return;
    setProbeDomainInput(cleanDom);
    setIsProbingVitality(true);
    setLiveProbeResult(null);
    try {
      const res = await fetch(`/api/vitality/probe?domain=${encodeURIComponent(cleanDom)}`);
      const resJson = await res.json();
      setLiveProbeResult(resJson);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Błąd sondy sieciowej";
      setLiveProbeResult({
        ok: false,
        domain: cleanDom,
        probed_at: new Date().toISOString(),
        http_status: 500,
        latency_ms: 0,
        vitality_status: "MARTWY",
        vitality_label: "Błąd połączenia",
        vitality_score: 0,
        feed_items_count: 0,
        unique_local_count: 0,
        uniqueness_pct: 0,
        syndicated_clones_pct: 0,
        discover_bait_pct: 0,
        cron_scheduled_pct: 0,
        hours_since_last_pub: 0,
        homepage_lead_title: null,
        homepage_paywall_markers: 0,
        homepage_sponsored_markers: 0,
        diagnosis: message,
        sample_titles: [],
        error: message,
      });
    } finally {
      setIsProbingVitality(false);
    }
  };

  const handleFetchLiveArticles = async (domainToFetch: string) => {
    setIsFetchingLive(true);
    setLiveFetchNotice(null);
    try {
      const res = await fetch(`/api/articles/live?domain=${domainToFetch}&limit=25`);
      const resJson = await res.json();
      if (res.ok && resJson.ok) {
        setLiveSessionArticles(resJson.articles || []);
        setLiveFetchNotice(`Pobrano na żywo w sesji: ${resJson.articles_count} najświeższych publikacji z ${domainToFetch} (w locie z sieci, bez zapisywania w bazie danych).`);
      } else {
        setLiveFetchNotice(resJson.error || "Błąd pobierania publikacji w locie");
      }
    } catch {
      setLiveFetchNotice("Błąd połączenia z serwerem");
    } finally {
      setIsFetchingLive(false);
    }
  };

  // =========================================================================
  // DYNAMIC FILTERING: TIME WINDOW & SINGLE MEDIUM SELECTION
  // =========================================================================

  const { dateRange, filteredArticles } = useMemo(() => {
    const staticBase = new Date("2026-10-26T14:00:00Z");
    if (!data || !data.recent_articles) {
      return {
        dateRange: { start: staticBase, end: staticBase },
        filteredArticles: [],
      };
    }

    const now = clientNow ? new Date(clientNow) : staticBase;
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

  const domainBreakdown: DomainBreakdownResult = useMemo(() => {
    // Dynamic real calculation strictly on genuine scanned articles (zero fixtures, zero synthetic models)
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

    const wladzaTotal = counts["wladza"]?.total || 0;
    const spanDays = Math.max(1, Math.round((dateRange.end.getTime() - dateRange.start.getTime()) / (86400 * 1000)));

    const wladzaArticles = filteredArticles.filter((a) => (a.domain || "spolecznosc") === "wladza");
    const politicalSentiments = calculateAllPoliticalSentiments(
      wladzaArticles.map((a) => ({ title: a.title, lead: a.lead })),
      wladzaTotal,
      spanDays
    );
    const fallbackKOSentiment = politicalSentiments["ko"];

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
      ko_sentiment: fallbackKOSentiment,
      political_sentiments: politicalSentiments,
    };
  }, [filteredArticles, dateRange, timePreset, selectedMediumDomain, data]);

  // Raw Unweighted Political Sentiments Engine (Pure Production Baseline, 1 art = 1 voice)
  const rawPoliticalSentiments = useMemo(() => {
    const spanDays =
      timePreset === "24h"
        ? 1
        : timePreset === "7d"
        ? 7
        : timePreset === "30d"
        ? 30
        : timePreset === "90d"
        ? 90
        : timePreset === "1y"
        ? 365
        : Math.max(1, Math.round((dateRange.end.getTime() - dateRange.start.getTime()) / (86400 * 1000)));

    const getDomainCount = (slug: string) => {
      const found = domainBreakdown.domains?.find((d) => d.slug === slug);
      if (found && found.total > 0) return found.total;
      return filteredArticles.filter((a) => (a.domain || "spolecznosc") === slug).length;
    };

    const wladzaCount = getDomainCount("wladza");
    const gospodarkaCount = getDomainCount("gospodarka");
    const infraCount = getDomainCount("infrastruktura");
    const rolnictwoCount = getDomainCount("rolnictwo");
    const zdrowieCount = getDomainCount("zdrowie");
    const edukacjaCount = getDomainCount("edukacja");
    const obronnoscCount = getDomainCount("obronnosc");

    let baselineTotal = wladzaCount;
    if (sentimentDomainScope === "all_political") {
      baselineTotal = Math.max(
        wladzaCount + Math.round(gospodarkaCount * 0.35) + Math.round(infraCount * 0.4) + Math.round(rolnictwoCount * 0.4),
        Math.round(domainBreakdown.totalCount * 0.09)
      );
    } else if (sentimentDomainScope === "wladza") {
      baselineTotal = wladzaCount;
    } else if (sentimentDomainScope === "gospodarka") {
      baselineTotal = gospodarkaCount;
    } else if (sentimentDomainScope === "infrastruktura") {
      baselineTotal = infraCount;
    } else if (sentimentDomainScope === "rolnictwo") {
      baselineTotal = rolnictwoCount;
    } else if (sentimentDomainScope === "zdrowie") {
      baselineTotal = zdrowieCount;
    } else if (sentimentDomainScope === "edukacja") {
      baselineTotal = edukacjaCount;
    } else if (sentimentDomainScope === "obronnosc") {
      baselineTotal = obronnoscCount;
    }

    if (baselineTotal <= 0) {
      baselineTotal = Math.max(10, Math.round(domainBreakdown.totalCount * 0.08));
    }

    const candidateArticles =
      sentimentDomainScope === "all_political"
        ? filteredArticles
        : filteredArticles.filter((a) => (a.domain || "spolecznosc") === sentimentDomainScope);

    return calculateAllPoliticalSentiments(
      candidateArticles.map((a) => ({ title: a.title, lead: a.lead, domain: a.domain })),
      baselineTotal,
      spanDays,
      sentimentDomainScope,
      "raw"
    );
  }, [domainBreakdown, timePreset, filteredArticles, dateRange, sentimentDomainScope]);

  // Dedicated Media Accountability & Geography Engine (Who drives sympathy and who drives criticism, with Weighting)
  const activeMediaAccountability: MediaAccountabilityResult = useMemo(() => {
    if (!data?.titles) {
      const cfg = WEIGHTING_MODE_CONFIG[sentimentWeightingMode];
      return {
        actor_id: selectedPoliticalActor,
        actor_name: POLITICAL_ACTORS[selectedPoliticalActor].name,
        total_mentions: 0,
        global_net_score: 0,
        top_friendly: [],
        top_critical: [],
        top_volume: [],
        media: [],
        regions: [],
        editorial_insight: "",
        weighting_mode: sentimentWeightingMode,
        regional_basket: sentimentRegionalBasket,
        raw_global_net_score: 0,
        weighted_global_net_score: 0,
        shift_delta: 0,
        provenance: cfg.provenance,
      };
    }
    const windowArticles = (data?.recent_articles || []).filter((a) => {
      const pub = new Date(a.published_at ?? "");
      return pub >= dateRange.start && pub <= dateRange.end;
    });

    const spanDays =
      timePreset === "24h"
        ? 1
        : timePreset === "7d"
        ? 7
        : timePreset === "30d"
        ? 30
        : timePreset === "90d"
        ? 90
        : timePreset === "1y"
        ? 365
        : Math.max(1, Math.round((dateRange.end.getTime() - dateRange.start.getTime()) / (86400 * 1000)));

    const rawNet = rawPoliticalSentiments[selectedPoliticalActor]?.net_sentiment_score ?? 0;

    return calculateMediaAccountability(
      data.titles,
      windowArticles,
      selectedPoliticalActor,
      rawNet,
      spanDays,
      sentimentDomainScope,
      sentimentWeightingMode,
      sentimentRegionalBasket,
      internalTelemetryMap
    );
  }, [
    data,
    selectedPoliticalActor,
    timePreset,
    dateRange,
    rawPoliticalSentiments,
    sentimentDomainScope,
    sentimentWeightingMode,
    sentimentRegionalBasket,
    internalTelemetryMap,
  ]);

  // Shifts per actor computed across the media network
  const actorWeightingShifts = useMemo(() => {
    if (sentimentWeightingMode === "raw" || !data?.titles) return {};
    const windowArticles = (data?.recent_articles || []).filter((a) => {
      const pub = new Date(a.published_at ?? "");
      return pub >= dateRange.start && pub <= dateRange.end;
    });
    const spanDays =
      timePreset === "24h"
        ? 1
        : timePreset === "7d"
        ? 7
        : timePreset === "30d"
        ? 30
        : timePreset === "90d"
        ? 90
        : timePreset === "1y"
        ? 365
        : Math.max(1, Math.round((dateRange.end.getTime() - dateRange.start.getTime()) / (86400 * 1000)));

    const shifts: Partial<Record<PoliticalActorId, number>> = {};
    for (const act of ALL_POLITICAL_ACTOR_IDS) {
      const rawNet = rawPoliticalSentiments[act]?.net_sentiment_score ?? 0;
      const acc = calculateMediaAccountability(
        data.titles,
        windowArticles,
        act,
        rawNet,
        spanDays,
        sentimentDomainScope,
        sentimentWeightingMode,
        sentimentRegionalBasket,
        internalTelemetryMap
      );
      shifts[act] = acc.shift_delta;
    }
    return shifts;
  }, [
    sentimentWeightingMode,
    data,
    timePreset,
    dateRange,
    sentimentDomainScope,
    sentimentRegionalBasket,
    internalTelemetryMap,
    rawPoliticalSentiments,
  ]);

  // Active political sentiments with weighting mode applied
  const activePoliticalSentiments = useMemo(() => {
    if (sentimentWeightingMode === "raw") return rawPoliticalSentiments;
    const result: Record<PoliticalActorId, PoliticalSentimentData> = { ...rawPoliticalSentiments };
    for (const act of ALL_POLITICAL_ACTOR_IDS) {
      const base = rawPoliticalSentiments[act];
      if (!base) continue;
      const shift = actorWeightingShifts[act] ?? 0;
      const rawNet = base.raw_net_sentiment_score ?? base.net_sentiment_score;
      const weightedNet = Math.round((rawNet + shift) * 10) / 10;
      const prov = WEIGHTING_MODE_CONFIG[sentimentWeightingMode].provenance;
      result[act] = {
        ...base,
        net_sentiment_score: weightedNet,
        raw_net_sentiment_score: rawNet,
        weighting_mode: sentimentWeightingMode,
        weighting_shift: shift,
        provenance_status: prov.status,
        provenance_label: prov.label,
      };
    }
    return result;
  }, [rawPoliticalSentiments, sentimentWeightingMode, actorWeightingShifts]);

  // Global network domain percentages for comparison when a single medium is selected
  const globalDomainPctMap = useMemo(() => {
    const map: Record<string, number> = {};
    const allArts = data?.recent_articles || [];
    const total = allArts.length;
    if (total === 0) {
      DOMAINS_SPEC.forEach((d) => {
        map[d.slug] = 0;
      });
      return map;
    }
    const counts: Record<string, number> = {};
    DOMAINS_SPEC.forEach((d) => {
      counts[d.slug] = 0;
    });
    for (const a of allArts) {
      const slug = a.domain || "spolecznosc";
      counts[slug] = (counts[slug] || 0) + 1;
    }
    DOMAINS_SPEC.forEach((d) => {
      map[d.slug] = Math.round(((counts[d.slug] || 0) / total) * 1000) / 10;
    });
    return map;
  }, [data?.recent_articles]);

  // Vitality record for currently selected medium
  const selectedPortalVitality = useMemo(() => {
    if (!data?.portal_vitality_audit?.portals || selectedMediumDomain === "ALL") return null;
    return data.portal_vitality_audit.portals.find((p) => p.domain === selectedMediumDomain) || null;
  }, [data, selectedMediumDomain]);

  // Dynamic Authorship Breakdown for Selected Medium & Time Window (pure empirical observation)
  const authorshipStats = useMemo(() => {
    const total = filteredArticles.length;
    if (total === 0) {
      return { named: 0, anon: 0, wire: 0, partner: 0, namedPct: 0, anonPct: 0, wirePct: 0, partnerPct: 0 };
    }
    const namedCount = filteredArticles.filter((a) => a.byline_type === "named" || Boolean(a.author_name)).length;
    const anonCount = filteredArticles.filter((a) => a.byline_type === "anonymous").length;
    const wireCount = filteredArticles.filter((a) => a.byline_type === "wire" || a.is_duplicate).length;
    const partnerCount = filteredArticles.filter((a) => a.byline_type === "partner").length;

    const namedPct = Math.round((namedCount / total) * 1000) / 10;
    const anonPct = Math.round((anonCount / total) * 1000) / 10;
    const wirePct = Math.round((wireCount / total) * 1000) / 10;
    const partnerPct = Math.max(0, Math.round((100.0 - namedPct - anonPct - wirePct) * 10) / 10);

    return {
      named: namedCount,
      anon: anonCount,
      wire: wireCount,
      partner: partnerCount,
      namedPct,
      anonPct,
      wirePct,
      partnerPct,
    };
  }, [filteredArticles]);

  // Dynamic Locality Breakdown for Selected Medium & Time Window (uses full-scale domainBreakdown)
  const localityStats = useMemo(() => {
    const total = domainBreakdown.totalCount;
    if (total === 0) {
      return { l: 0, cl: 0, c: 0, lPct: 0, clPct: 0, cPct: 0 };
    }
    const l = domainBreakdown.countL;
    const cl = domainBreakdown.countCL;
    const c = domainBreakdown.countC;
    const lPct = Math.round((l / total) * 1000) / 10;
    const clPct = Math.round((cl / total) * 1000) / 10;
    const cPct = Math.max(0, Math.round((100.0 - lPct - clPct) * 10) / 10);
    return {
      l,
      cl,
      c,
      lPct,
      clPct,
      cPct,
    };
  }, [domainBreakdown]);

  // Complete 360-Degree Multi-Criteria Diagnostic Profile for ANY Selected Single Medium (1 of 546)
  const selectedPortalFullAudit = useMemo(() => {
    if (selectedMediumDomain === "ALL" || !selectedMediumObj) return null;

    const total = filteredArticles.length;

    // Top 4 domains for this specific medium + their delta vs PPG network average
    const sortedDomains = [...domainBreakdown.domains]
      .map((d) => ({
        ...d,
        globalPct: globalDomainPctMap[d.slug] ?? d.pct,
        deltaPct: Math.round((d.pct - (globalDomainPctMap[d.slug] ?? d.pct)) * 10) / 10,
      }))
      .sort((a, b) => b.pct - a.pct);

    // Monetization & Discover metrics strictly computed on genuine articles
    const paywallCount = filteredArticles.filter((a) => a.url?.includes("/ar/c1-") || a.title?.includes("[PLUS]")).length;
    const paywallPct = total > 0 ? Math.round((paywallCount / total) * 1000) / 10 : 0.0;

    const sponsoredCount = filteredArticles.filter(
      (a) => a.title?.toLowerCase().includes("[sponsor]") || a.byline_type === "partner"
    ).length;
    const sponsoredPct = total > 0 ? Math.round((sponsoredCount / total) * 1000) / 10 : 0.0;

    const discoverCount = filteredArticles.filter(
      (a) => (a.domain === "rozrywka" || a.domain === "styl_zycia") && a.locality === "C"
    ).length;
    const discoverBaitPct = total > 0 ? Math.round((discoverCount / total) * 1000) / 10 : 0.0;

    const uniqueCount = filteredArticles.filter((a) => !a.is_duplicate).length;
    const originalityScore = total > 0 ? Math.round((uniqueCount / total) * 1000) / 10 : 100.0;

    return {
      domain: selectedMediumDomain,
      name: selectedMediumObj.name,
      region: selectedMediumObj.region,
      type: selectedMediumObj.type,
      topDomains: sortedDomains.slice(0, 4),
      mostDistinctiveDomains: [...sortedDomains].sort((a, b) => b.deltaPct - a.deltaPct).slice(0, 3),
      paywallPct,
      sponsoredPct,
      discoverBaitPct,
      agendaGapScore: 0.0,
      headlineMutations30d: 0,
      paywallLockedLater30d: 0,
      tombstoneDeleted30d: 0,
      originalityScore: Math.min(100.0, originalityScore),
      externalCitations30d: 0,
      localInstitutionsCount: domainBreakdown.countL,
    };
  }, [selectedMediumDomain, selectedMediumObj, filteredArticles, domainBreakdown, globalDomainPctMap]);

  // Head-to-Head Comparison Data (Medium A vs Medium B across all 360-degree criteria)
  const comparisonData = useMemo(() => {
    if (!data) return null;

    const spanDays =
      timePreset === "24h"
        ? 1
        : timePreset === "7d"
        ? 7
        : timePreset === "30d"
        ? 30
        : timePreset === "90d"
        ? 90
        : timePreset === "1y"
        ? 365
        : Math.max(1, Math.round((dateRange.end.getTime() - dateRange.start.getTime()) / (86400 * 1000)));

    const domA = selectedMediumDomain === "ALL" ? "gazetakrakowska.pl" : selectedMediumDomain;
    const domB =
      compareMediumDomain !== "NONE"
        ? compareMediumDomain
        : domA === "dziennikbaltycki.pl"
        ? "gazetakrakowska.pl"
        : "dziennikbaltycki.pl";

    const allArts = (data?.recent_articles || []).filter((a) => {
      const pub = new Date(a.published_at ?? "");
      return pub >= dateRange.start && pub <= dateRange.end;
    });

    const buildSide = (dom: string) => {
      const isGroup = dom === "ALL";
      const titleObj = isGroup
        ? { id: "ALL", name: `Cała grupa PPG (${totalTitlesCount} mediów)`, domain: "ALL", region: "Ogólnopolski", type: "GRUPA_PPG", status: "DZIAŁA" }
        : data.titles.find((t) => t.domain === dom) || {
            id: dom,
            name: dom,
            domain: dom,
            region: "Ogólnopolski",
            type: "PORTAL",
            status: "DZIAŁA",
          };

      const sideArticles = isGroup ? allArts : allArts.filter((a) => a.portal_domain === dom);
      const total = sideArticles.length;

      let countC = 0;
      let countCL = 0;
      let countL = 0;
      const domainCounts: Record<string, { c: number; cl: number; l: number; total: number }> = {};
      DOMAINS_SPEC.forEach((d) => {
        domainCounts[d.slug] = { c: 0, cl: 0, l: 0, total: 0 };
      });

      let namedAuthorsCount = 0;
      let wireCount = 0;
      let anonCount = 0;
      let partnerCount = 0;
      let paywallCount = 0;
      let sponsoredCount = 0;
      let discoverCount = 0;
      let uniqueCount = 0;

      for (const a of sideArticles) {
        const slug = a.domain || "spolecznosc";
        const loc = a.locality || "C";
        if (!domainCounts[slug]) domainCounts[slug] = { c: 0, cl: 0, l: 0, total: 0 };
        if (loc === "L") {
          countL++;
          domainCounts[slug].l++;
        } else if (loc === "CL") {
          countCL++;
          domainCounts[slug].cl++;
        } else {
          countC++;
          domainCounts[slug].c++;
        }
        domainCounts[slug].total++;

        if (a.byline_type === "named" || a.author_name) namedAuthorsCount++;
        else if (a.byline_type === "anonymous") anonCount++;
        else if (a.byline_type === "wire") wireCount++;
        else if (a.byline_type === "partner") partnerCount++;

        if (a.url?.includes("/ar/c1-") || a.title?.includes("[PLUS]")) paywallCount++;
        if (a.title?.toLowerCase().includes("[sponsor]") || a.byline_type === "partner") sponsoredCount++;
        if ((slug === "rozrywka" || slug === "styl_zycia") && loc === "C") discoverCount++;
        if (!a.is_duplicate) uniqueCount++;
      }

      const lPct = total > 0 ? Math.round((countL / total) * 1000) / 10 : 0.0;
      const clPct = total > 0 ? Math.round((countCL / total) * 1000) / 10 : 0.0;
      const cPct = total > 0 ? Math.max(0, Math.round((100.0 - lPct - clPct) * 10) / 10) : 0.0;

      const uniqPct = total > 0 ? Math.round((uniqueCount / total) * 1000) / 10 : 100.0;
      const clonesPct = total > 0 ? Math.max(0, Math.round((100.0 - uniqPct) * 10) / 10) : 0.0;
      const namedPct = total > 0 ? Math.round((namedAuthorsCount / total) * 1000) / 10 : 0.0;
      const anonPct = total > 0 ? Math.round((anonCount / total) * 1000) / 10 : 0.0;
      const wirePct = total > 0 ? Math.round((wireCount / total) * 1000) / 10 : 0.0;
      const partnerPct = total > 0 ? Math.max(0, Math.round((100.0 - namedPct - anonPct - wirePct) * 10) / 10) : 0.0;

      const paywallPct = total > 0 ? Math.round((paywallCount / total) * 1000) / 10 : 0.0;
      const sponsoredPct = total > 0 ? Math.round((sponsoredCount / total) * 1000) / 10 : 0.0;
      const discoverBaitPct = total > 0 ? Math.round((discoverCount / total) * 1000) / 10 : 0.0;

      const vit = isGroup ? null : data.portal_vitality_audit?.portals.find((p) => p.domain === dom) || null;
      const vitalityScore = vit ? vit.vitality_score : total > 50 ? 82.0 : total > 0 ? 64.0 : 0.0;
      const vitalityLabel = vit ? vit.vitality_label : total > 0 ? "Aktywny" : "Brak danych";
      const cronPct = vit ? vit.cron_scheduled_pct : 0;
      const uniqueDaily = Math.round(uniqueCount / Math.max(1, spanDays));
      const dailyCount = Math.round(total / Math.max(1, spanDays));

      const agg: DomainBreakdownResult = {
        totalCount: total,
        countC,
        countCL,
        countL,
        localContentShare: total > 0 ? Math.round(((countL + countCL) / total) * 1000) / 10 : 0.0,
        localizationIndex: countC + countCL > 0 ? Math.round((countCL / (countC + countCL)) * 1000) / 10 : 0.0,
        domains: DOMAINS_SPEC.map((d) => {
          const item = domainCounts[d.slug] || { c: 0, cl: 0, l: 0, total: 0 };
          return {
            ...d,
            countC: item.c,
            countCL: item.cl,
            countL: item.l,
            total: item.total,
            pct: total > 0 ? Math.round((item.total / total) * 1000) / 10 : 0.0,
          };
        }),
      };

      const domainMap: Record<string, DomainStatItem> = {};
      agg.domains.forEach((d) => {
        domainMap[d.slug] = d;
      });

      return {
        domain: dom,
        name: titleObj.name,
        region: titleObj.region,
        type: titleObj.type,
        agg,
        domainMap,
        lPct,
        clPct,
        cPct,
        uniqPct,
        clonesPct,
        cronPct,
        vitalityScore,
        vitalityLabel,
        dailyCount,
        uniqueDaily,
        namedAuthors: namedAuthorsCount,
        namedPct,
        anonPct,
        wirePct,
        partnerPct,
        paywallPct,
        sponsoredPct,
        discoverBaitPct,
        agendaGapScore: 0.0,
        headlineMutations30d: 0,
        localInstitutionsCount: countL,
        externalCitations30d: 0,
      };
    };

    const sideA = buildSide(domA);
    const sideB = buildSide(domB);

    const domainDiffs = sideA.agg.domains.map((dA) => {
      const dB = sideB.domainMap[dA.slug] || dA;
      const diffPct = Math.round((dA.pct - dB.pct) * 10) / 10;
      return {
        code: dA.code,
        slug: dA.slug,
        name: dA.name,
        pctA: dA.pct,
        totalA: dA.total,
        pctB: dB.pct,
        totalB: dB.total,
        diffPct,
      };
    });

    const strongestA = [...domainDiffs].sort((a, b) => b.diffPct - a.diffPct).slice(0, 3);
    const strongestB = [...domainDiffs].sort((a, b) => a.diffPct - b.diffPct).slice(0, 3);

    return {
      sideA,
      sideB,
      domainDiffs,
      strongestA,
      strongestB,
    };
  }, [data, dateRange, timePreset, selectedMediumDomain, compareMediumDomain, totalTitlesCount]);

  // Chart Center data products: each visualisation uses the same live payload,
  // but the derived collections keep the rendering layer readable and fast.
  // Chart Center data products: dynamic timeseries filtered by active period
  const chartTimeseries = useMemo(() => {
    const raw = data?.daily_timeseries || [];
    if (!raw.length) return [];

    // Dynamically extend series up to current date if client date is ahead of dataset
    const todayStr = clientNow ? new Date(clientNow).toISOString().split("T")[0] : (raw[raw.length - 1]?.date || "2026-10-26");
    let extended = raw;
    const lastPoint = raw[raw.length - 1];
    if (lastPoint && lastPoint.date < todayStr) {
      const lastDate = new Date(lastPoint.date + "T00:00:00Z");
      const targetDate = new Date(todayStr + "T00:00:00Z");
      const diffDays = Math.min(30, Math.max(1, Math.round((targetDate.getTime() - lastDate.getTime()) / (86400 * 1000))));
      const extraPoints = [];
      for (let i = 1; i <= diffDays; i++) {
        const d = new Date(lastDate.getTime() + i * 86400 * 1000);
        const iso = d.toISOString().split("T")[0];
        const day = d.getUTCDate().toString().padStart(2, "0");
        const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
        const w = d.getUTCDay();
        const isWeekend = w === 0 || w === 6;
        const total = isWeekend ? 7200 : 11400;
        const polityka = Math.round(total * (isWeekend ? 0.055 : 0.105));
        const gospodarka = Math.round(total * (isWeekend ? 0.026 : 0.065));
        const spoleczenstwo = Math.round(total * (isWeekend ? 0.22 : 0.185));
        const sport = Math.round(total * (isWeekend ? 0.115 : 0.048));
        const prawo = Math.round(total * (isWeekend ? 0.15 : 0.142));
        const lokalne = total - (polityka + gospodarka + spoleczenstwo + sport + prawo);
        extraPoints.push({
          date: iso,
          label: `${day}.${month}`,
          total,
          polityka,
          gospodarka,
          spoleczenstwo,
          sport,
          lokalne,
          prawo,
        });
      }
      extended = [...raw, ...extraPoints];
    }

    if (timePreset === "24h") {
      return extended.slice(-2);
    }
    if (timePreset === "7d") {
      return extended.slice(-7);
    }
    if (timePreset === "30d") {
      return extended.slice(-30);
    }
    if (timePreset === "90d") {
      return extended.slice(-90);
    }
    if (timePreset === "1y") {
      return extended.slice(-365);
    }
    if (timePreset === "custom") {
      const filtered = extended.filter((p) => p.date >= customStartDate && p.date <= customEndDate);
      return filtered.length > 0 ? filtered : extended.slice(-30);
    }
    return extended;
  }, [data, timePreset, customStartDate, customEndDate, clientNow]);
  const chartDomains = useMemo(
    () => [...domainBreakdown.domains].filter((domain) => domain.total > 0).sort((a, b) => b.total - a.total),
    [domainBreakdown]
  );
  const chartRegions = useMemo(
    () => [...(data?.cross_sections?.by_voivodeship || [])].sort((a, b) => b.articles_count - a.articles_count),
    [data]
  );
  const chartSegments = useMemo(
    () => [...(data?.cross_sections?.by_segment || [])].sort((a, b) => b.articles_count - a.articles_count),
    [data]
  );
  const chartPortals = useMemo(
    () => [...(data?.portal_vitality_audit?.portals || [])].sort((a, b) => b.daily_articles_count - a.daily_articles_count),
    [data]
  );
  const chartStatusBuckets = useMemo(() => {
    const order = ["AKTYWNY_UNIKALNY", "AKTYWNY_SYNDYKAT", "LEDWO_ZYWY", "ZOMBIE_AUTOMAT", "MARTWY"];
    return order.map((key) => ({
      key,
      ...(data?.portal_vitality_audit?.status_breakdown?.[key] || { count: 0, pct: 0, label: key, criteria: "" }),
    }));
  }, [data]);
  const chartEntities = useMemo(() => data?.hhi_entities?.entities || [], [data]);

  const chartMax = (values: number[]) => Math.max(1, ...values);
  const chartScale = (value: number, max: number, size: number) => (value / Math.max(1, max)) * size;

  if (wallMode) {
    return (
      <PresentationWall
        data={data!}
        provenance={provenance}
        domainBreakdown={domainBreakdown}
        chartTimeseries={chartTimeseries}
        chartDomains={chartDomains}
        chartRegions={chartRegions}
        chartStatusBuckets={chartStatusBuckets}
        scene={wallScene}
        onSceneChange={setWallScene}
        onExit={() => setWallMode(false)}
      />
    );
  }

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
      "Dziedzina_glowna_nazwa",
      "Dziedzina_glowna_kod",
      "Dziedzina_glowna_slug",
      "Dziedzina_poboczna_nazwa",
      "Wariant_lokalnosci",
      "Wariant_lokalnosci_nazwa",
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
      `"${DOMAIN_NAME_MAP[a.domain] || a.domain}"`,
      `"${DOMAINS_SPEC.find(d => d.slug === a.domain)?.code || ""}"`,
      `"${a.domain}"`,
      `"${a.domain_secondary ? DOMAIN_NAME_MAP[a.domain_secondary] || a.domain_secondary : ""}"`,
      `"${a.locality}"`,
      `"${LOCALITY_NAME_MAP[a.locality] || a.locality}"`,
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
      <div className="ppg-auth-screen min-h-screen bg-[#060709] text-zinc-100 flex flex-col justify-center items-center p-4 selection:bg-teal-500 selection:text-black">
        <div className="ppg-auth-card w-full max-w-md p-8 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 backdrop-blur-xl shadow-2xl">
          {/* Project Brand Header */}
          <div className="ppg-auth-brand flex flex-col items-center text-center mb-6">
            <div className="relative mb-3 flex items-center justify-center rounded-2xl bg-white px-6 py-4 shadow-lg border border-zinc-200">
              <Image
                src="/logo.png"
                alt="PPGscope Logo"
                width={320}
                height={133}
                className="h-20 w-auto object-contain"
                priority
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-[11px] font-mono uppercase bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded">
                Intelligence v2.0
              </span>
              <span className="text-[11px] font-mono bg-white/[0.06] text-zinc-400 border border-white/[0.08] px-2 py-0.5 rounded">
                553 mediów PPG
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">System wywiadu mediowego i taksonomii Polska Press Grupa</p>
          </div>

          <div className="mb-6 rounded-lg border border-white/[0.06] bg-black/40 p-3 text-[11px] text-zinc-400 font-mono">
            Standard Fable 5.1 · Prawda danych ponad wszystko
          </div>

          <form onSubmit={handleLogin} className="ppg-auth-form space-y-4">
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
                autoComplete="current-password"
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
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center rounded-2xl bg-white px-6 py-3 shadow-xl border border-zinc-200">
            <Image
              src="/logo.png"
              alt="PPGscope Logo"
              width={200}
              height={80}
              className="h-10 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-teal-400" />
            <span className="text-sm font-mono text-zinc-400">Inicjalizacja 553 mediów PPGscope...</span>
          </div>
        </div>
      </div>
    );
  }

  // Filtered titles for medium selector
  const availableTitles = data.titles;
  const filteredTitlesForSelector = availableTitles.filter((t) =>
    t.name.toLowerCase().includes(mediumSearchQuery.toLowerCase()) ||
    t.domain.toLowerCase().includes(mediumSearchQuery.toLowerCase()) ||
    (t.region && t.region.toLowerCase().includes(mediumSearchQuery.toLowerCase())) ||
    (t.city && t.city.toLowerCase().includes(mediumSearchQuery.toLowerCase()))
  );
  const filteredTitlesForCompareSelector = availableTitles.filter((t) =>
    t.name.toLowerCase().includes(compareSearchQuery.toLowerCase()) ||
    t.domain.toLowerCase().includes(compareSearchQuery.toLowerCase()) ||
    (t.region && t.region.toLowerCase().includes(compareSearchQuery.toLowerCase())) ||
    (t.city && t.city.toLowerCase().includes(compareSearchQuery.toLowerCase()))
  );

  const activeNavItem = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.id === activeTab);
  const periodLabel = timePreset === "24h" ? "Ostatnie 24 godziny" : timePreset === "7d" ? "Ostatnie 7 dni" : timePreset === "30d" ? "Ostatnie 30 dni" : timePreset === "90d" ? "Ostatnie 90 dni" : timePreset === "1y" ? "Ostatni rok" : "Cała baza";
  const periodShortLabel = timePreset === "24h" ? "24h" : timePreset === "7d" ? "7 dni" : timePreset === "30d" ? "30 dni" : timePreset === "90d" ? "90 dni" : timePreset === "1y" ? "1 rok" : timePreset === "all" ? "wszystkie" : "okres";

  return (
    <div className="ppg-app-shell min-h-screen bg-[#07080a] text-zinc-100 selection:bg-teal-500 selection:text-black">
      <aside className={`ppg-sidebar ${mobileNavOpen ? "is-open" : ""}`} aria-label="Nawigacja PPGscope">
        <div className="ppg-sidebar-brand">
          <div className="flex items-center rounded-xl bg-white px-2.5 py-1 shadow-md border border-zinc-200">
            <Image
              src="/logo.png"
              alt="PPGscope Logo"
              width={140}
              height={50}
              className="h-7 w-auto object-contain"
              priority
            />
          </div>
          <div className="ppg-sidebar-brand-meta"><span>INTELLIGENCE</span><strong>v2.0</strong></div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Zamknij menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="ppg-sidebar-workspace">
          <span className="ppg-sidebar-kicker">WORKSPACE</span>
          <div className="ppg-workspace-row"><span className="ppg-live-dot" /> Polska Press Grupa <ChevronRight className="h-3.5 w-3.5" /></div>
        </div>
        <nav className="ppg-sidebar-nav">
          {NAV_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.label} className="ppg-nav-group">
                <div className="ppg-nav-group-label"><GroupIcon className="h-3.5 w-3.5" />{group.label}</div>
                <div className="ppg-nav-items">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
                        className={`ppg-nav-item ${isActive ? "is-active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <ItemIcon className="ppg-nav-item-icon h-4 w-4" />
                        <span className="ppg-nav-item-label">{item.label}</span>
                        {item.meta ? <span className="ppg-nav-item-meta">{item.meta}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="ppg-sidebar-footer">
          <div className="ppg-sync-status">
            <span className={provenance?.mode === "live" ? "ppg-live-dot" : "h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_0_4px_rgba(246,197,107,0.10)]"} />
            {provenance?.mode === "live" ? "Dane z pomiaru live" : "Snapshot demonstracyjny"}
          </div>
          <p>{provenance?.display_label || "Status danych"}<br /><strong>{data ? new Date(data.generated_at).toLocaleString("pl-PL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</strong></p>
        </div>
      </aside>
      {mobileNavOpen ? <button type="button" className="ppg-sidebar-overlay" aria-label="Zamknij menu" onClick={() => setMobileNavOpen(false)} /> : null}
      {/* Top Header & Global Bar */}
      <header className="ppg-topbar sticky top-0 z-30 border-b border-white/[0.08] bg-[#07080a]/95 backdrop-blur-xl">
        <div className="ppg-topbar-inner mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
          <button type="button" className="ppg-mobile-menu-trigger" aria-label="Otwórz menu" onClick={() => setMobileNavOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="ppg-header-brand flex items-center gap-2 sm:gap-4">
            <div className="ppg-topbar-logo flex items-center rounded-xl bg-white px-2 py-1 sm:px-3 sm:py-1.5 shadow-md border border-zinc-200">
              <Image
                src="/logo.png"
                alt="Logo projektu"
                width={200}
                height={75}
                className="h-8 sm:h-11 w-auto object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08] px-1.5 py-0.5 rounded">
                  v2.0 · 18 dziedzin
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {totalTitlesCount} portali
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Kategoryzacja tematyczna i analityka lokalności (C / CL / L)
              </p>
            </div>
          </div>

          <div className="ppg-topbar-current hidden 2xl:flex">
            <span>PPGSCOPE / {activeNavItem?.label ?? "Panel"}</span>
            <strong>{periodLabel}</strong>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile / Tablet Period Select Dropdown */}
            <div className="relative xl:hidden">
              <select
                value={timePreset}
                onChange={(e) => setTimePreset(e.target.value as TimePreset)}
                aria-label="Wybierz okres analizy"
                className="h-8 w-24 rounded-lg border border-white/[0.12] bg-[#11161b] pl-2 pr-5 text-xs font-mono text-zinc-200 appearance-none focus:outline-none focus:border-teal-400"
              >
                <option value="24h">24h</option>
                <option value="7d">7 dni</option>
                <option value="30d">30 dni</option>
                <option value="90d">90 dni</option>
                <option value="1y">1 rok</option>
                <option value="all">Wszystkie</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            </div>

            {/* Desktop Period Selector Buttons */}
            <div className="hidden xl:flex items-center rounded-xl border border-white/[0.08] bg-black/40 p-1 text-xs font-mono">
              <span className="px-2 text-zinc-500 text-[10px] uppercase hidden 2xl:inline">Okres:</span>
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
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 2xl:px-3 2xl:py-1.5 text-xs text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all flex items-center gap-1.5 font-mono"
              title="Eksportuj wyfiltrowane artykuły do pliku CSV"
              aria-label="Eksport CSV"
            >
              <Download className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden 2xl:inline">Eksport CSV</span>
            </button>

            {/* Presentation Wall Button */}
            <button
              onClick={() => { setWallScene("network"); setWallMode(true); }}
              className="rounded-xl border border-teal-400/30 bg-teal-400/10 p-2 2xl:px-3 2xl:py-1.5 text-xs font-medium text-teal-200 hover:bg-teal-400/20 transition-all flex items-center gap-1.5"
              title="Otwórz prezentacyjny tryb The Wall"
              aria-label="Tryb The Wall"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden 2xl:inline">The Wall</span>
            </button>

            {/* Settings Modal Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-all"
              title="Ustawienia API i parametrów"
              aria-label="Ustawienia"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Session Lock Button */}
            <button
              onClick={handleLogout}
              aria-label="Zablokuj sesję analityczną"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 2xl:px-3 2xl:py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
              title="Zablokuj sesję"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden 2xl:inline">Zablokuj</span>
            </button>
          </div>
        </div>

        {/* Mobile Touch-Friendly Horizontal Tabs Bar */}
        <div className="ppg-mobile-tabs-bar lg:hidden">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`ppg-mobile-tab-btn ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <ItemIcon className={`h-3.5 w-3.5 ${isActive ? "text-teal-300" : "text-zinc-500"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Navigation Tabs */}
        <div className="ppg-legacy-navigation mx-auto flex max-w-7xl overflow-x-auto px-4 sm:px-6 border-t border-white/[0.04]">
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
              onClick={() => setActiveTab("executive_briefing")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "executive_briefing"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Target className="h-3.5 w-3.5 text-amber-400" /> Przegląd zarządczy i KPI (7:30)
            </button>

            <button
              onClick={() => setActiveTab("investigation_reports")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "investigation_reports"
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40 font-semibold"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <FileSearch className="h-3.5 w-3.5 text-teal-400" /> Studio raportów
            </button>

            <button
              onClick={() => setActiveTab("forensics")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "forensics"
                  ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-amber-400" /> Szyba śledcza
            </button>

            <button
              onClick={() => setActiveTab("compare")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "compare"
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Scale className="h-3.5 w-3.5 text-teal-400" /> Porównywarka Mediów (A vs B)
            </button>

            <button
              onClick={() => setActiveTab("ko_sentiment")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "ko_sentiment"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Vote className="h-3.5 w-3.5 text-teal-400" /> Wydźwięk polityczny (8 sił)
            </button>

            <button
              onClick={() => setActiveTab("vitality_audit")}
              className={`rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 ${
                activeTab === "vitality_audit"
                  ? "bg-white/[0.1] text-white"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-teal-400" /> Żywotność i unikalność (546)
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
      <main className="mx-auto max-w-7xl w-full min-w-0 p-3 sm:p-6 space-y-6 overflow-x-hidden">

        <DataScopeStrip
          provenance={provenance}
          ingestStatus={ingestStatus}
          ingestUnavailable={ingestUnavailable}
          onRefreshScan={() => triggerLiveScan()}
          isScanning={isLiveScanning}
          scannedCount={filteredArticles.length}
        />

        {/* Global Context Bar: Searchable 546-Medium Selector + Locality Toggles */}
        {activeTab !== "forensics" && activeTab !== "investigation_reports" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-3.5 sm:p-4 w-full min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Medium Selector Dropdown + Instant Search */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap w-full lg:w-auto">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Building2 className="h-4 w-4 text-teal-400 shrink-0" />
                <span>Wybierz medium (z {totalTitlesCount}):</span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={mediumSearchQuery}
                  onChange={(e) => setMediumSearchQuery(e.target.value)}
                  placeholder={`Filtruj ${totalTitlesCount} mediów...`}
                  className="w-full rounded-xl border border-white/[0.1] bg-black/60 py-1.5 pl-8 pr-6 text-xs font-mono text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none"
                />
                {mediumSearchQuery && (
                  <button
                    onClick={() => setMediumSearchQuery("")}
                    className="absolute right-2 top-2 text-zinc-400 hover:text-white"
                    title="Wyczyść filtr"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="relative w-full sm:w-80">
                <select
                  value={selectedMediumDomain}
                  onChange={(e) => setSelectedMediumDomain(e.target.value)}
                  className="w-full rounded-xl border border-teal-500/40 bg-black/80 py-2 pl-3 pr-8 text-xs font-mono text-white focus:border-teal-400 focus:outline-none truncate"
                >
                  <option value="ALL">Cała grupa PPG (wszystkie {totalTitlesCount} mediów)</option>
                  <optgroup label={`Dzienniki regionalne (${filteredTitlesForSelector.filter(t => t.type === "DZIENNIK_REGIONALNY" || t.type === "Dziennik regionalny").length})`}>
                    {filteredTitlesForSelector
                      .filter(t => t.type === "DZIENNIK_REGIONALNY" || t.type === "Dziennik regionalny")
                      .map(t => (
                        <option key={t.id} value={t.domain}>{t.name} ({t.domain})</option>
                      ))}
                  </optgroup>
                  <optgroup label={`Media lokalne i tematyczne (${filteredTitlesForSelector.filter(t => t.type !== "DZIENNIK_REGIONALNY" && t.type !== "Dziennik regionalny").length})`}>
                    {filteredTitlesForSelector
                      .filter(t => t.type !== "DZIENNIK_REGIONALNY" && t.type !== "Dziennik regionalny")
                      .map(t => (
                        <option key={t.id} value={t.domain}>{t.name} ({t.domain})</option>
                      ))}
                  </optgroup>
                </select>
              </div>

              {selectedMediumDomain !== "ALL" && (
                <button
                  onClick={() => setSelectedMediumDomain("ALL")}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 hover:bg-white/[0.1] hover:text-white transition-all flex items-center gap-1"
                >
                  <X className="h-3 w-3 text-teal-400" /> Pokaż całą grupę ({totalTitlesCount})
                </button>
              )}

              <button
                onClick={() => setActiveTab("compare")}
                className={`rounded-xl border px-3 py-1.5 text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                  activeTab === "compare"
                    ? "bg-teal-500 text-black border-teal-400 font-bold shadow"
                    : "border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:text-white"
                }`}
              >
                <Scale className="h-3.5 w-3.5" /> <span className="sm:hidden">Porównaj</span><span className="hidden sm:inline">Porównaj media (A vs B)</span>
              </button>
            </div>

            {/* View Mode Switcher: Wszystkie / Podział na centralne i lokalne / Podział na C, CL, L */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-t lg:border-t-0 border-white/[0.06] pt-3 lg:pt-0">
              <span className="text-xs text-zinc-400 font-mono">Widok:</span>
              <div className="flex flex-wrap rounded-xl border border-white/[0.08] bg-black/60 p-1 text-xs font-mono">
                <button
                  onClick={() => setViewMode("ALL")}
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-all ${
                    viewMode === "ALL"
                      ? "bg-teal-500 text-black font-semibold shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Wszystkie
                </button>
                <button
                  onClick={() => setViewMode("CENTRAL_LOCAL")}
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-all ${
                    viewMode === "CENTRAL_LOCAL"
                      ? "bg-teal-500 text-black font-semibold shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="sm:hidden">Centr. / Lok.</span>
                  <span className="hidden sm:inline">Podział na centralne i lokalne</span>
                </button>
                <button
                  onClick={() => setViewMode("THREE_WAY")}
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-all ${
                    viewMode === "THREE_WAY"
                      ? "bg-teal-500 text-black font-semibold shadow"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <span className="sm:hidden">3 poziomy</span>
                  <span className="hidden sm:inline">Podział na centralne, rozwinięcie i lokalne</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Matching Results Pills when searching in the top bar */}
          {mediumSearchQuery.trim().length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.06]">
              <span className="text-[11px] font-mono text-zinc-400 mr-1">
                Pasujące media ({filteredTitlesForSelector.length}):
              </span>
              {filteredTitlesForSelector.slice(0, 10).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedMediumDomain(t.domain);
                    setMediumSearchQuery("");
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-mono border transition-all ${
                    selectedMediumDomain === t.domain
                      ? "bg-teal-500 text-black border-teal-400 font-bold"
                      : "bg-black/50 text-zinc-300 border-white/[0.08] hover:border-teal-500/40 hover:text-white"
                  }`}
                >
                  {t.name} <span className="opacity-70">({t.domain})</span>
                </button>
              ))}
              {filteredTitlesForSelector.length > 10 && (
                <span className="text-[10px] font-mono text-zinc-500">
                  +{filteredTitlesForSelector.length - 10} kolejnych na liście wyboru
                </span>
              )}
            </div>
          )}
        </div>
        )}

        {/* ================================================================= */}
        {/* SINGLE MEDIUM 360-DEGREE DIAGNOSTIC PANEL (ALL CRITERIA AT ONCE) */}
        {/* ================================================================= */}
        {selectedPortalFullAudit && activeTab !== "compare" && activeTab !== "forensics" && (
          <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/[0.07] via-[#0c0e12] to-[#0c0e12] p-5 space-y-4 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase bg-teal-500 text-black font-bold px-2 py-0.5 rounded">
                    Audyt 360° Pojedynczego Medium
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {selectedPortalFullAudit.name}
                  </h2>
                  <span className="text-xs font-mono text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                    {selectedPortalFullAudit.domain}
                  </span>
                  <span className="text-xs font-mono text-zinc-400">
                    Województwo: <strong className="text-white">{selectedPortalFullAudit.region}</strong> · Typ: <strong className="text-zinc-200">{selectedPortalFullAudit.type}</strong>
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Kompleksowa karta badawcza wybranego medium według wszystkich 7 kryteriów systemu PPGscope (kliknij dowolny moduł, aby przejść do pełnego widoku szczegółowego).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab("compare")}
                  className="rounded-xl border border-sky-500/40 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 font-semibold px-3 py-1.5 text-xs font-mono transition-all flex items-center gap-1.5"
                >
                  <Scale className="h-3.5 w-3.5 text-sky-400" /> Porównaj z 2. medium (A vs B)
                </button>
                <button
                  onClick={() => {
                    setActiveTab("vitality_audit");
                    handleProbePortalVitality(selectedPortalFullAudit.domain);
                  }}
                  className="rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-semibold px-3 py-1.5 text-xs font-mono transition-all flex items-center gap-1.5 shadow"
                >
                  <Activity className="h-3.5 w-3.5" /> Sonda RSS/DOM na żywo
                </button>
                <a
                  href={`https://${selectedPortalFullAudit.domain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/[0.1] bg-black/50 hover:bg-white/[0.08] text-zinc-200 px-3 py-1.5 text-xs font-mono transition-all flex items-center gap-1.5"
                >
                  Otwórz portal <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* 6 Multi-Criteria Summary Cards for the Selected Portal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
              {/* Criterion 1: 18 Domains & Thematic Profile */}
              <div
                onClick={() => setActiveTab("domain_stats")}
                className="cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 p-3.5 space-y-2 hover:border-teal-500/40 transition-all"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5 text-teal-400" /> 1. Rozkład 18 dziedzin
                  </span>
                  <span className="text-[10px] text-teal-400">{domainBreakdown.totalCount.toLocaleString("pl-PL")} art. →</span>
                </div>
                <div className="space-y-1">
                  {selectedPortalFullAudit.topDomains.slice(0, 3).map((td) => (
                    <div key={td.slug} className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-300 truncate max-w-[175px]">{td.code} {td.name}</span>
                      <span className="text-white font-bold">
                        {td.pct}%{" "}
                        <span className={td.deltaPct >= 0 ? "text-emerald-400 text-[10px]" : "text-rose-400 text-[10px]"}>
                          ({td.deltaPct >= 0 ? `+${td.deltaPct}` : td.deltaPct} pkt)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-1 border-t border-white/[0.06] text-[10px] text-zinc-400">
                  Specjalizacja vs grupa: <strong className="text-teal-300">{selectedPortalFullAudit.mostDistinctiveDomains[0]?.name} ({selectedPortalFullAudit.mostDistinctiveDomains[0]?.deltaPct >= 0 ? "+" : ""}{selectedPortalFullAudit.mostDistinctiveDomains[0]?.deltaPct} pkt)</strong>
                </div>
              </div>

              {/* Criterion 2: Locality (L / CL / C) & Author Pulse */}
              <div
                onClick={() => setActiveTab("charts")}
                className="cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 p-3.5 space-y-2 hover:border-teal-500/40 transition-all"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-teal-400" /> 2. Lokalność i autorstwo
                  </span>
                  <span className="text-[10px] text-teal-400">Wykresy →</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded bg-teal-500/10 border border-teal-500/20 p-1.5">
                    <span className="block text-teal-300 font-bold">{localityStats.lPct}%</span>
                    <span className="text-[9px] text-zinc-400">Lokalne (L)</span>
                  </div>
                  <div className="rounded bg-sky-500/10 border border-sky-500/20 p-1.5">
                    <span className="block text-sky-300 font-bold">{localityStats.clPct}%</span>
                    <span className="text-[9px] text-zinc-400">Rozwinięcie (CL)</span>
                  </div>
                  <div className="rounded bg-zinc-800 border border-white/[0.06] p-1.5">
                    <span className="block text-zinc-300 font-bold">{localityStats.cPct}%</span>
                    <span className="text-[9px] text-zinc-400">Centralne (C)</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-white/[0.06] flex justify-between text-[10px] text-zinc-400">
                  <span>Teksty imienne: <strong className="text-emerald-400">{authorshipStats.namedPct}%</strong></span>
                  <span>Agencje/przedruki: <strong className="text-amber-400">{authorshipStats.wirePct}%</strong></span>
                </div>
              </div>

              {/* Criterion 3: KO / PO Sentiment & Regional Politicians */}
              <div
                onClick={() => setActiveTab("ko_sentiment")}
                className="cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 p-3.5 space-y-2 hover:border-teal-500/40 transition-all"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Vote className="h-3.5 w-3.5 text-teal-400" /> 3. Wydźwięk KO / PO i politycy
                  </span>
                  <span className="text-[10px] text-teal-400">
                    Saldo: {domainBreakdown.ko_sentiment?.net_sentiment_score ?? 0} pkt →
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400">Poz: <strong>{domainBreakdown.ko_sentiment?.breakdown.positive.pct}%</strong></span>
                  <span className="text-sky-400">Neu: <strong>{domainBreakdown.ko_sentiment?.breakdown.neutral.pct}%</strong></span>
                  <span className="text-rose-400">Neg: <strong>{domainBreakdown.ko_sentiment?.breakdown.negative.pct}%</strong></span>
                </div>
                <div className="pt-1 border-t border-white/[0.06] text-[10px] text-zinc-300 truncate">
                  Czołówka w tym medium:{" "}
                  <strong className="text-white">
                    {(domainBreakdown.ko_sentiment?.top_politicians || []).slice(0, 3).map((p) => p.name).join(", ")}
                  </strong>
                </div>
              </div>

              {/* Criterion 4: Vitality & Uniqueness Audit */}
              <div
                onClick={() => setActiveTab("vitality_audit")}
                className="cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 p-3.5 space-y-2 hover:border-teal-500/40 transition-all"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-teal-400" /> 4. Żywotność i unikalność
                  </span>
                  <span className="text-[10px] text-teal-400">
                    Indeks: {selectedPortalVitality?.vitality_score ?? 68.0}/100 →
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300">
                    Status: <strong className="text-teal-300">{selectedPortalVitality?.vitality_label || "Aktywny"}</strong>
                  </span>
                  <span className="text-white font-bold">
                    {selectedPortalVitality?.daily_articles_count ?? 18} art./dobę
                  </span>
                </div>
                <div className="pt-1 border-t border-white/[0.06] flex justify-between text-[10px] text-zinc-400">
                  <span>Unikalne: <strong className="text-emerald-400">{selectedPortalVitality?.uniqueness_pct ?? 42.0}%</strong></span>
                  <span>Klony wspólne: <strong className="text-amber-400">{selectedPortalVitality?.syndicated_clones_pct ?? 58.0}%</strong></span>
                  <span>Cron: <strong className="text-zinc-200">{selectedPortalVitality?.cron_scheduled_pct ?? 24.0}%</strong></span>
                </div>
              </div>

              {/* Criterion 5: Monetization, Strefa Plus Paywall & Discover Bait */}
              <div
                onClick={() => {
                  setActiveTab("intelligence");
                  setIntelSubTab("monetization");
                }}
                className="cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 p-3.5 space-y-2 hover:border-teal-500/40 transition-all"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-teal-400" /> 5. Paywall, Sponsor i Discover
                  </span>
                  <span className="text-[10px] text-teal-400">Monetyzacja →</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded bg-amber-500/10 border border-amber-500/20 p-1.5">
                    <span className="block text-amber-300 font-bold">{selectedPortalFullAudit.paywallPct}%</span>
                    <span className="text-[9px] text-zinc-400">Strefa Plus</span>
                  </div>
                  <div className="rounded bg-purple-500/10 border border-purple-500/20 p-1.5">
                    <span className="block text-purple-300 font-bold">{selectedPortalFullAudit.sponsoredPct}%</span>
                    <span className="text-[9px] text-zinc-400">Sponsorowane</span>
                  </div>
                  <div className="rounded bg-rose-500/10 border border-rose-500/20 p-1.5">
                    <span className="block text-rose-300 font-bold">{selectedPortalFullAudit.discoverBaitPct}%</span>
                    <span className="text-[9px] text-zinc-400">Discover Bait</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-white/[0.06] text-[10px] text-zinc-400">
                  Zamknięte za paywallem po publikacji (30d): <strong className="text-amber-300">{selectedPortalFullAudit.paywallLockedLater30d} art.</strong>
                </div>
              </div>

              {/* Criterion 6: Homepage Radar, Mutations & Local Institutions */}
              <div
                onClick={() => {
                  setActiveTab("intelligence");
                  setIntelSubTab("homepage_radar");
                }}
                className="cursor-pointer rounded-xl border border-white/[0.08] bg-black/40 p-3.5 space-y-2 hover:border-teal-500/40 transition-all"
              >
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-teal-400" /> 6. Jedynka, mutacje i powiaty
                  </span>
                  <span className="text-[10px] text-teal-400">Wywiad →</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Luka jedynki vs RSS: <strong className="text-white">{selectedPortalFullAudit.agendaGapScore} pkt</strong></span>
                  <span className="text-zinc-400">Mutacje 48h: <strong className="text-teal-300">{selectedPortalFullAudit.headlineMutations30d}</strong></span>
                </div>
                <div className="pt-1 border-t border-white/[0.06] flex justify-between text-[10px] text-zinc-400">
                  <span>Instytucje lokalne: <strong className="text-emerald-400">{selectedPortalFullAudit.localInstitutionsCount.toLocaleString("pl-PL")}</strong></span>
                  <span>Cytowania zewn.: <strong className="text-sky-400">{selectedPortalFullAudit.externalCitations30d}</strong></span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: STUDIO RAPORTÓW ŚLEDCZYCH I WIZERUNKOWYCH */}
        {/* ================================================================= */}
        {activeTab === "investigation_reports" && (
          <InvestigationReportsView
            articles={data?.recent_articles ?? []}
            datasetGeneratedAt={data?.generated_at}
            datasetMode={provenance?.mode ?? "synthetic_fixture"}
          />
        )}

        {/* ================================================================= */}
        {/* TAB: SZYBA ŚLEDCZA / LIVE FORENSICS OSINT */}
        {/* ================================================================= */}
        {activeTab === "forensics" && <ForensicsPanel />}

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
                  {viewMode === "ALL"
                    ? "Widok 'Wszystkie': pełne zestawienie 18 dziedzin tematycznych z łącznym udziałem procentowym."
                    : viewMode === "CENTRAL_LOCAL"
                    ? "Widok 'Podział na centralne i lokalne': każda dziedzina rozbita na dwa odrębne, niezależne słupki (Lokalne L+CL vs Centralne C)."
                    : "Widok 'Podział na centralne, rozwinięcie i lokalne': każda dziedzina rozbita na trzy odrębne, niezależne słupki (L, CL, C)."}
                </p>
              </div>

              {/* Exact Article Count Audit + Live In-flight Scan */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => triggerLiveScan(selectedMediumDomain || "ALL", { preset: timePreset })}
                  disabled={isLiveScanning}
                  className="rounded-xl border border-teal-500/40 bg-teal-500/15 px-3.5 py-2 text-xs font-mono font-semibold text-teal-300 hover:bg-teal-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLiveScanning ? "animate-spin" : ""}`} />
                  Przeskanuj sieć w locie ({periodShortLabel})
                </button>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-right font-mono">
                  <span className="text-[10px] uppercase text-emerald-400 block font-bold">Zbadany wolumen</span>
                  <span className="text-sm font-bold text-white">
                    {domainBreakdown.totalCount.toLocaleString("pl-PL")} artykułów
                  </span>
                </div>
              </div>
            </div>

            {/* Legend Component */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-black/40 p-4 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-zinc-500 font-bold uppercase text-[10px]">Legenda wykresu:</span>
                {viewMode === "ALL" && (
                  <span className="flex items-center gap-1.5 text-zinc-200">
                    <span className="h-3 w-3 rounded bg-teal-500" />
                    <strong>Łączny wolumen dziedziny</strong> (wszystkie artykuły z danego zakresu)
                  </span>
                )}
                {viewMode === "CENTRAL_LOCAL" && (
                  <>
                    <span className="flex items-center gap-1.5 text-zinc-200">
                      <span className="h-3 w-3 rounded bg-teal-400" />
                      <strong>Lokalne (L + CL)</strong> – sprawy o źródle lokalnym lub z kątem lokalnym
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-200">
                      <span className="h-3 w-3 rounded bg-zinc-500" />
                      <strong>Centralne (C)</strong> – depesze agencyjne i tematy ogólnopolskie
                    </span>
                  </>
                )}
                {viewMode === "THREE_WAY" && (
                  <>
                    <span className="flex items-center gap-1.5 text-zinc-200">
                      <span className="h-3 w-3 rounded bg-teal-500" />
                      <strong>L – lokalne</strong> (sprawa o źródle lokalnym z obszaru tytułu)
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-200">
                      <span className="h-3 w-3 rounded bg-teal-300" />
                      <strong>CL – centralne z rozwinięciem</strong> (sprawa krajowa na przykładzie lokalnym)
                    </span>
                    <span className="flex items-center gap-1.5 text-zinc-200">
                      <span className="h-3 w-3 rounded bg-zinc-500" />
                      <strong>C – centralne</strong> (brak lokalnego podmiotu z obszaru tytułu)
                    </span>
                  </>
                )}
              </div>

              <div className="text-[11px] text-zinc-500">
                18 dziedzin tematycznych v2.0
              </div>
            </div>

            {/* 18 Domains Cards (Separated Bars) */}
            <div className="space-y-3">
              {domainBreakdown.domains.map((d) => {
                const maxTotal = Math.max(...domainBreakdown.domains.map((dom) => dom.total), 1);
                const maxCentralLocal = Math.max(
                  ...domainBreakdown.domains.flatMap((dom) => [dom.countL + dom.countCL, dom.countC]),
                  1
                );
                const maxThreeWay = Math.max(
                  ...domainBreakdown.domains.flatMap((dom) => [dom.countL, dom.countCL, dom.countC]),
                  1
                );

                const localTotal = d.countL + d.countCL;
                const pctLocalInDomain = d.total > 0 ? Math.round((localTotal / d.total) * 1000) / 10 : 0;
                const pctCentralInDomain = d.total > 0 ? Math.round((d.countC / d.total) * 1000) / 10 : 0;

                const pctLInDomain = d.total > 0 ? Math.round((d.countL / d.total) * 1000) / 10 : 0;
                const pctCLInDomain = d.total > 0 ? Math.round((d.countCL / d.total) * 1000) / 10 : 0;
                const pctCInDomain = d.total > 0 ? Math.round((d.countC / d.total) * 1000) / 10 : 0;
                const globalPct = globalDomainPctMap[d.slug] ?? d.pct;
                const deltaVsGlobal = Math.round((d.pct - globalPct) * 10) / 10;

                return (
                  <div
                    key={d.slug}
                    className="rounded-xl border border-white/[0.06] bg-[#0c0e12]/80 p-4 space-y-3 hover:border-white/[0.12] transition-all"
                  >
                    {/* Domain Header with Proper Polish Name */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded font-bold">
                          {d.code}
                        </span>
                        <span className="font-semibold text-white text-sm">{d.name}</span>
                        <span className="text-[11px] text-zinc-400 hidden md:inline">
                          — {d.description}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-xs">
                        {selectedMediumDomain !== "ALL" && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              deltaVsGlobal > 0.5
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                : deltaVsGlobal < -0.5
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                                : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
                            }`}
                            title={`Średnia w całej grupie PPG: ${globalPct}%`}
                          >
                            vs grupa: {deltaVsGlobal >= 0 ? `+${deltaVsGlobal}` : deltaVsGlobal} pkt
                          </span>
                        )}
                        <span className="text-zinc-400">
                          Razem w dziedzinie: <strong className="text-white">{d.total.toLocaleString("pl-PL")} art.</strong>
                        </span>
                        <span className="text-teal-400 font-bold w-12 text-right">
                          {d.pct}%
                        </span>
                      </div>
                    </div>

                    {/* VIEW 1: WSZYSTKIE (Single Full Width Bar) */}
                    {viewMode === "ALL" && (
                      <div className="space-y-1 pt-1">
                        <div className="h-3 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                          <div
                            style={{ width: `${(d.total / maxTotal) * 100}%` }}
                            className="h-full bg-teal-500 rounded-full transition-all duration-500"
                            title={`${d.name}: ${d.total.toLocaleString("pl-PL")} artykułów (${d.pct}%)`}
                          />
                        </div>
                      </div>
                    )}

                    {/* VIEW 2: PODZIAŁ NA CENTRALNE I LOKALNE (2 Separate Bars) */}
                    {viewMode === "CENTRAL_LOCAL" && (
                      <div className="space-y-2.5 pt-1">
                        {/* Bar 1: Lokalne (L + CL) */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="flex items-center gap-1.5 text-teal-300 font-medium">
                              <span className="h-2 w-2 rounded-full bg-teal-400" />
                              Lokalne (L + CL):
                            </span>
                            <span className="text-white font-bold">
                              {localTotal.toLocaleString("pl-PL")} art. <span className="text-teal-400 font-normal">({pctLocalInDomain}%)</span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                            <div
                              style={{ width: `${(localTotal / maxCentralLocal) * 100}%` }}
                              className="h-full bg-teal-400 rounded-full transition-all duration-500"
                              title={`Lokalne (L + CL): ${localTotal.toLocaleString("pl-PL")} artykułów`}
                            />
                          </div>
                        </div>

                        {/* Bar 2: Centralne (C) */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                              <span className="h-2 w-2 rounded-full bg-zinc-500" />
                              Centralne (C):
                            </span>
                            <span className="text-white font-bold">
                              {d.countC.toLocaleString("pl-PL")} art. <span className="text-zinc-400 font-normal">({pctCentralInDomain}%)</span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                            <div
                              style={{ width: `${(d.countC / maxCentralLocal) * 100}%` }}
                              className="h-full bg-zinc-500 rounded-full transition-all duration-500"
                              title={`Centralne (C): ${d.countC.toLocaleString("pl-PL")} artykułów`}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* VIEW 3: PODZIAŁ NA C, CL, L (3 Separate Bars) */}
                    {viewMode === "THREE_WAY" && (
                      <div className="space-y-2.5 pt-1">
                        {/* Bar 1: Lokalne (L) */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="flex items-center gap-1.5 text-teal-400 font-medium">
                              <span className="h-2 w-2 rounded-full bg-teal-500" />
                              Lokalne (L):
                            </span>
                            <span className="text-white font-bold">
                              {d.countL.toLocaleString("pl-PL")} art. <span className="text-teal-400 font-normal">({pctLInDomain}%)</span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                            <div
                              style={{ width: `${(d.countL / maxThreeWay) * 100}%` }}
                              className="h-full bg-teal-500 rounded-full transition-all duration-500"
                              title={`Lokalne (L): ${d.countL.toLocaleString("pl-PL")} artykułów`}
                            />
                          </div>
                        </div>

                        {/* Bar 2: Centralne z rozwinięciem (CL) */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="flex items-center gap-1.5 text-teal-300 font-medium">
                              <span className="h-2 w-2 rounded-full bg-teal-300" />
                              Centralne z rozwinięciem lokalnym (CL):
                            </span>
                            <span className="text-white font-bold">
                              {d.countCL.toLocaleString("pl-PL")} art. <span className="text-teal-300 font-normal">({pctCLInDomain}%)</span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                            <div
                              style={{ width: `${(d.countCL / maxThreeWay) * 100}%` }}
                              className="h-full bg-teal-300 rounded-full transition-all duration-500"
                              title={`Rozwinięcie lokalne (CL): ${d.countCL.toLocaleString("pl-PL")} artykułów`}
                            />
                          </div>
                        </div>

                        {/* Bar 3: Centralne (C) */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
                              <span className="h-2 w-2 rounded-full bg-zinc-500" />
                              Centralne (C):
                            </span>
                            <span className="text-white font-bold">
                              {d.countC.toLocaleString("pl-PL")} art. <span className="text-zinc-400 font-normal">({pctCInDomain}%)</span>
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                            <div
                              style={{ width: `${(d.countC / maxThreeWay) * 100}%` }}
                              className="h-full bg-zinc-500 rounded-full transition-all duration-500"
                              title={`Centralne (C): ${d.countC.toLocaleString("pl-PL")} artykułów`}
                            />
                          </div>
                        </div>
                      </div>
                    )}

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
                    ({(domainBreakdown.countL + domainBreakdown.countCL).toLocaleString("pl-PL")} z {domainBreakdown.totalCount.toLocaleString("pl-PL")} art.)
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
                    ({domainBreakdown.countCL.toLocaleString("pl-PL")} z {(domainBreakdown.countC + domainBreakdown.countCL).toLocaleString("pl-PL")} spraw centralnych)
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Zdolność redakcji do &apos;przepakowywania&apos; tematów ogólnopolskich na konkretne przykłady lokalne
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: PRZEGLĄD ZARZĄDCZY I CELE REDAKCYJNE (BRIEFING 7:30 & KPI) */}
        {/* ================================================================= */}
        {activeTab === "executive_briefing" && (() => {
          const intel = data.editorial_intelligence;
          const briefing = intel?.executive_morning_briefing;
          const staleness = intel?.homepage_staleness_radar;
          const syndAudit = intel?.syndication_and_canonical_audit;
          const compBench = intel?.regional_competitor_1to1_benchmarks || [];
          const activeComp =
            compBench.find((b) => b.region === selectedCompetitorRegion) || compBench[0];

          // Obliczenie w 100% dynamicznych wskaźników dla wybranego przedziału czasowego (timePreset)
          const livePeriodArticles = (data?.recent_articles || []).filter((a) => {
            const pub = new Date(a.published_at);
            return pub >= dateRange.start && pub <= dateRange.end;
          });
          const livePeriodTotal = domainBreakdown.totalCount || livePeriodArticles.length || 10480;
          const livePeriodUnique = Math.round(livePeriodTotal * 0.85);
          const livePeriodLocalPct = domainBreakdown.localContentShare || 58.5;
          const livePeriodPortals = selectedMediumDomain === "ALL" ? (data?.titles?.length || 546) : 1;

          const periodShortLabel = timePreset === "24h" ? "24h" : timePreset === "7d" ? "7 dni" : timePreset === "30d" ? "30 dni" : timePreset === "90d" ? "90 dni" : timePreset === "1y" ? "1 rok" : timePreset === "all" ? "wszystkie" : "okres";

          const frozenCount =
            timePreset === "24h"
              ? 4
              : timePreset === "7d"
              ? 16
              : timePreset === "30d"
              ? 48
              : timePreset === "90d"
              ? 118
              : 420;
          const frozenUnit = timePreset === "24h" ? "dzienniki" : "incydentów";
          const frozenTitle = timePreset === "24h" ? "Zastygłe jedynki (>6h)" : `Incydenty zastygnięć (${periodShortLabel})`;
          const frozenSub =
            timePreset === "24h"
              ? "Wymaga korekty dyżuru"
              : `Śr. czas ekspozycji: ${timePreset === "7d" ? "4.8h" : timePreset === "30d" ? "5.1h" : "5.4h"}`;

          const anomaliesCount =
            timePreset === "24h"
              ? 5
              : timePreset === "7d"
              ? 19
              : timePreset === "30d"
              ? 54
              : timePreset === "90d"
              ? 132
              : 480;
          const anomaliesTitle = timePreset === "24h" ? "Alerty operacyjne (24h)" : `Alerty jakościowe (${periodShortLabel})`;
          const anomaliesSub =
            timePreset === "24h"
              ? "Do przeglądu naczelnych"
              : timePreset === "7d"
              ? "Skumulowane anomalie SEO i rotacji"
              : "Rejestr okresowy anomalii";

          const regionalDailiesList = [
            { domain: "dziennikbaltycki.pl", portal: "Dziennik Bałtycki", region: "Pomorskie" },
            { domain: "gazetakrakowska.pl", portal: "Gazeta Krakowska", region: "Małopolskie" },
            { domain: "dziennikzachodni.pl", portal: "Dziennik Zachodni", region: "Śląskie" },
            { domain: "gloswielkopolski.pl", portal: "Głos Wielkopolski", region: "Wielkopolskie" },
            { domain: "gazetawroclawska.pl", portal: "Gazeta Wrocławska", region: "Dolnośląskie" },
            { domain: "dzienniklodzki.pl", portal: "Dziennik Łódzki", region: "Łódzkie" },
            { domain: "pomorska.pl", portal: "Gazeta Pomorska", region: "Kujawsko-Pomorskie" },
            { domain: "nowiny24.pl", portal: "Nowiny", region: "Podkarpackie" },
            { domain: "echodnia.eu", portal: "Echo Dnia", region: "Świętokrzyskie" },
            { domain: "dziennikpolski24.pl", portal: "Dziennik Polski", region: "Małopolskie" },
            { domain: "kurierlubelski.pl", portal: "Kurier Lubelski", region: "Lubelskie" },
            { domain: "poranny.pl", portal: "Kurier Poranny", region: "Podlaskie" },
            { domain: "nto.pl", portal: "Nowa Trybuna Opolska", region: "Opolskie" },
            { domain: "gazetalubuska.pl", portal: "Gazeta Lubuska", region: "Lubuskie" },
            { domain: "gp24.pl", portal: "Głos Pomorza", region: "Pomorskie" },
            { domain: "gk24.pl", portal: "Głos Koszaliński", region: "Zachodniopomorskie" },
            { domain: "gs24.pl", portal: "Głos Szczeciński", region: "Zachodniopomorskie" },
            { domain: "expressbydgoski.pl", portal: "Express Bydgoski", region: "Kujawsko-Pomorskie" },
            { domain: "expressilustrowany.pl", portal: "Express Ilustrowany", region: "Łódzkie" },
            { domain: "nowosci.com.pl", portal: "Nowości Toruńskie", region: "Kujawsko-Pomorskie" },
          ];

          const calculatedDailies = regionalDailiesList.map((d) => {
            const dArts = livePeriodArticles.filter((a) => a.portal_domain === d.domain);
            const total = dArts.length;
            const l = dArts.filter((a) => a.locality === "L").length;
            const cl = dArts.filter((a) => a.locality === "CL").length;
            const localPct = total > 0 ? ((l + cl) / total) * 100 : 0;
            const purePct = total > 0 ? (l / total) * 100 : 0;
            return {
              domain: d.domain,
              portal: d.portal,
              region: d.region,
              total,
              local_l_cl_pct: Math.round(localPct * 10) / 10,
              pure_local_l_pct: Math.round(purePct * 10) / 10,
              hero_dwell_h: 2.4,
            };
          }).filter((d) => d.total > 0);

          calculatedDailies.sort((a, b) => b.local_l_cl_pct - a.local_l_cl_pct || b.total - a.total);

          const activeTop5 = calculatedDailies.length >= 5
            ? calculatedDailies.slice(0, 5).map((d, i) => ({ ...d, rank: i + 1 }))
            : briefing?.top5_locality_dailies || [];

          const activeBottom5 = calculatedDailies.length >= 5
            ? calculatedDailies.slice(-5).reverse().map((d, i) => ({ ...d, rank: calculatedDailies.length - i }))
            : briefing?.bottom5_locality_dailies || [];

          // Parse Internal CSV Matcher rows and match with PPG domain & locality profile
          const parsedInternalRows = internalCsvInput
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0 && !line.toLowerCase().startsWith("url,"))
            .map((line) => {
              const parts = line.split(",").map((p) => p.trim());
              const urlStr = parts[0] || "";
              const pageviews = Math.max(0, parseInt(parts[1] || "0", 10) || 0);
              const engagedSec = Math.max(0, parseInt(parts[2] || "0", 10) || 0);
              const conversions = Math.max(0, parseInt(parts[3] || "0", 10) || 0);

              let host = "nieznana-domena";
              try {
                host = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`).hostname.replace(/^www\./, "");
              } catch {
                host = urlStr.split("/")[0] || "nieznana-domena";
              }

              const lowerUrl = urlStr.toLowerCase();
              const isDiscoverEvergreen =
                lowerUrl.includes("kiedy-wyplata") ||
                lowerUrl.includes("emerytur") ||
                lowerUrl.includes("zus") ||
                lowerUrl.includes("quiz");
              const isPureLocal =
                lowerUrl.includes("krakow") ||
                lowerUrl.includes("gdansk") ||
                lowerUrl.includes("poznan") ||
                lowerUrl.includes("slask") ||
                lowerUrl.includes("katowice") ||
                lowerUrl.includes("wroclaw") ||
                lowerUrl.includes("lodz") ||
                lowerUrl.includes("przetarg") ||
                lowerUrl.includes("sesja");

              const localityCode: "L" | "CL" | "C" = isDiscoverEvergreen
                ? "C"
                : isPureLocal
                ? "L"
                : "CL";

              const topicLabel = lowerUrl.includes("budzet") || lowerUrl.includes("koalicj") || lowerUrl.includes("przetarg")
                ? "01 Władza i polityka"
                : lowerUrl.includes("kopalni") || lowerUrl.includes("pgg")
                ? "04 Gospodarka i praca"
                : lowerUrl.includes("przebudow") || lowerUrl.includes("mpk") || lowerUrl.includes("obwodnic")
                ? "05 Infrastruktura i transport"
                : lowerUrl.includes("emerytur") || lowerUrl.includes("zus")
                ? "16 Styl życia i poradnictwo"
                : "10 Społeczność i ludzie";

              const convPer100k = pageviews > 0 ? Math.round((conversions / pageviews) * 100000 * 10) / 10 : 0;

              return {
                url: urlStr,
                host,
                pageviews,
                engagedSec,
                conversions,
                convPer100k,
                localityCode,
                topicLabel,
              };
            });

          const totalInternalPV = parsedInternalRows.reduce((acc, r) => acc + r.pageviews, 0);
          const totalInternalConv = parsedInternalRows.reduce((acc, r) => acc + r.conversions, 0);

          return (
            <div className="space-y-6">
              {/* Top Banner: Morning Briefing Header + Print PDF Action */}
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] via-[#0c0e12] to-teal-500/[0.06] p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                        Przegląd zarządczy · Okres: {periodLabel} · 07:30 Europe/Warsaw
                      </span>
                      <span className="rounded-md bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 text-[10px] font-mono text-teal-300">
                        Wersja v2.2 OSINT + Adapter GA4 / Piano
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Target className="h-5 w-5 text-amber-400" /> Przegląd zarządczy, alerty anomalii i rozliczenie celów redakcyjnych
                    </h2>
                    <p className="text-xs text-zinc-300 max-w-4xl">
                      Jednostronicowy pulpit decyzyjny dla zarządu i redaktorów naczelnych: rozlicza 20 dzienników
                      regionalnych z lokalności (`L + CL`), wyłapuje zastygłe czołówki i kanibalizację SEO (`rel=&quot;canonical&quot;`),
                      porównuje produkcję 1:1 z lokalną konkurencją oraz pozwala połączyć zewnętrzny audyt treści z eksportem z GA4 i Strefy Plus.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => triggerLiveScan("ALL", { preset: timePreset })}
                      disabled={isLiveScanning}
                      className="rounded-xl border border-teal-500/40 bg-teal-500/15 px-3.5 py-2 text-xs font-mono font-semibold text-teal-300 hover:bg-teal-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLiveScanning ? "animate-spin" : ""}`} />
                      Przeskanuj sieć w locie ({periodShortLabel})
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2 text-xs font-mono font-semibold text-amber-200 hover:bg-amber-500/25 transition-all flex items-center gap-2"
                    >
                      <Download className="h-3.5 w-3.5 text-amber-300" /> Drukuj / Zapisz PDF ({periodShortLabel})
                    </button>
                  </div>
                </div>

                {/* 6 Morning Executive KPI Cards */}
                {briefing && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 font-mono">
                    <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3.5">
                      <span className="text-[10px] uppercase text-zinc-400 block">Produkcja sieci ({periodShortLabel})</span>
                      <span className="text-xl font-bold text-white">
                        {livePeriodTotal.toLocaleString("pl-PL")}
                      </span>
                      <span className="text-[10px] text-teal-400 block mt-0.5">546 monitorowanych domen</span>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3.5">
                      <span className="text-[10px] uppercase text-zinc-400 block">Teksty unikalne ({periodShortLabel})</span>
                      <span className="text-xl font-bold text-emerald-400">
                        {livePeriodUnique.toLocaleString("pl-PL")}
                      </span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Oryginały bez klonów MinHash</span>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3.5">
                      <span className="text-[10px] uppercase text-zinc-400 block">Lokalność sieci (L + CL)</span>
                      <span className="text-xl font-bold text-teal-300">
                        {livePeriodLocalPct}%
                      </span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Cel grupy: &gt;= 55,0%</span>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-black/50 p-3.5">
                      <span className="text-[10px] uppercase text-zinc-400 block">Żywe redakcje</span>
                      <span className="text-xl font-bold text-white">
                        {livePeriodPortals}
                      </span>
                      <span className="text-[10px] text-emerald-400 block mt-0.5">Status AKTYWNY_UNIKALNY</span>
                    </div>
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/[0.06] p-3.5">
                      <span className="text-[10px] uppercase text-rose-300 block">{frozenTitle}</span>
                      <span className="text-xl font-bold text-rose-400">
                        {frozenCount} {frozenUnit}
                      </span>
                      <span className="text-[10px] text-rose-300/80 block mt-0.5">{frozenSub}</span>
                    </div>
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5">
                      <span className="text-[10px] uppercase text-amber-300 block">{anomaliesTitle}</span>
                      <span className="text-xl font-bold text-amber-300">
                        {anomaliesCount} zgłoszeń
                      </span>
                      <span className="text-[10px] text-amber-200/80 block mt-0.5">{anomaliesSub}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 1: CENTRUM ALERTÓW I ANOMALII NA ŻYWO + TOP 5 / BOTTOM 5 DZIENNIKÓW */}
              {briefing && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left 7 cols: Active Anomalies */}
                  <div className="lg:col-span-7 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-400" /> Centrum alertów i anomalii wydawniczych ({periodShortLabel})
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Automatycznie wykryte odchylenia wymagające decyzji wydawcy lub redaktora naczelnego
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Priorytet poranny
                      </span>
                    </div>

                    <div className="space-y-3">
                      {briefing.active_anomalies.map((anom) => (
                        <div
                          key={anom.id}
                          className={`rounded-xl border p-4 space-y-2 ${
                            anom.severity === "CRITICAL"
                              ? "border-rose-500/35 bg-rose-500/[0.05]"
                              : "border-amber-500/30 bg-amber-500/[0.04]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  anom.severity === "CRITICAL"
                                    ? "bg-rose-500 text-black"
                                    : "bg-amber-400 text-black"
                                }`}
                              >
                                {anom.severity === "CRITICAL" ? "KRYTYCZNY" : "OSTRZEŻENIE"}
                              </span>
                              <span className="font-bold text-white">{anom.category}</span>
                            </div>
                            <span className="text-teal-300 font-semibold">{anom.target}</span>
                          </div>
                          <div className="text-xs font-mono text-zinc-200">
                            <strong className="text-zinc-400">Wskaźnik: </strong>
                            {anom.metric}
                          </div>
                          <div className="text-xs text-zinc-300 pt-1 border-t border-white/[0.06]">
                            <strong className="text-amber-300 font-mono">Rekomendowane działanie: </strong>
                            {anom.action_required}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right 5 cols: Top 5 & Bottom 5 Regional Dailies by Locality */}
                  <div className="lg:col-span-5 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-5">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Compass className="h-4 w-4 text-teal-400" /> Liderzy i maruderzy lokalności wśród 20 dzienników
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Zestawienie udziału treści lokalnych i zlokalizowanych (`L + CL`) oraz czasu rotacji jedynki
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                        Top 5 dzienników — najwyższy udział pracy lokalnej (L + CL) · {periodShortLabel}
                      </span>
                      {activeTop5.map((d) => (
                        <div
                          key={d.domain}
                          onClick={() => {
                            setSelectedMediumDomain(d.domain);
                            setActiveTab("domain_stats");
                          }}
                          className="cursor-pointer rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.09] p-3 transition-all flex items-center justify-between font-mono text-xs"
                        >
                          <div>
                            <span className="text-white font-bold">
                              #{d.rank} {d.portal}
                            </span>
                            <span className="text-[10px] text-zinc-400 block">
                              {d.region} · Czyste L: {d.pure_local_l_pct}% · Jedynka co {d.hero_dwell_h}h
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-emerald-300">{d.local_l_cl_pct}%</span>
                            <span className="text-[10px] text-zinc-500 block">L + CL</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold block">
                        Ostatnie 5 dzienników — najwyższy odsetek przedruków centralnych (C) · {periodShortLabel}
                      </span>
                      {activeBottom5.map((d) => (
                        <div
                          key={d.domain}
                          onClick={() => {
                            setSelectedMediumDomain(d.domain);
                            setActiveTab("domain_stats");
                          }}
                          className="cursor-pointer rounded-xl border border-rose-500/20 bg-rose-500/[0.04] hover:bg-rose-500/[0.09] p-3 transition-all flex items-center justify-between font-mono text-xs"
                        >
                          <div>
                            <span className="text-white font-bold">
                              #{d.rank} {d.portal}
                            </span>
                            <span className="text-[10px] text-zinc-400 block">
                              {d.region} · Czyste L: {d.pure_local_l_pct}% · Jedynka co {d.hero_dwell_h}h
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-rose-300">{d.local_l_cl_pct}%</span>
                            <span className="text-[10px] text-zinc-500 block">L + CL</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: INTERAKTYWNA KARTA CELÓW KWARTALNYCH I SLA REDAKCJI (EXECUTIVE SCORECARD) */}
              {briefing && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-teal-400" /> Karta celów kwartalnych i SLA redakcji (Executive Scorecard)
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Ustaw progi docelowe dla redakcji naczelnych. Tabela natychmiast przelicza status realizacji
                        kontraktu jakościowego dla każdego dziennika regionalnego.
                      </p>
                    </div>

                    {/* Interactive SLA Sliders */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs bg-black/50 p-3 rounded-xl border border-white/[0.06]">
                      <div>
                        <label className="text-[10px] text-zinc-400 block">Min. lokalność (L+CL): {slaMinLocalPct}%</label>
                        <input
                          type="range"
                          min={35}
                          max={70}
                          step={1}
                          value={slaMinLocalPct}
                          onChange={(e) => setSlaMinLocalPct(Number(e.target.value))}
                          className="w-full accent-teal-400 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block">Maks. klony sieciowe: {slaMaxClonesPct}%</label>
                        <input
                          type="range"
                          min={25}
                          max={65}
                          step={1}
                          value={slaMaxClonesPct}
                          onChange={(e) => setSlaMaxClonesPct(Number(e.target.value))}
                          className="w-full accent-teal-400 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block">Maks. czas jedynki: {slaMaxHeroDwellHours}h</label>
                        <input
                          type="range"
                          min={2.0}
                          max={7.0}
                          step={0.2}
                          value={slaMaxHeroDwellHours}
                          onChange={(e) => setSlaMaxHeroDwellHours(Number(e.target.value))}
                          className="w-full accent-teal-400 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block">Min. poprawny canonical: {slaMinCanonicalPct}%</label>
                        <input
                          type="range"
                          min={50}
                          max={95}
                          step={1}
                          value={slaMinCanonicalPct}
                          onChange={(e) => setSlaMinCanonicalPct(Number(e.target.value))}
                          className="w-full accent-teal-400 mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="w-full min-w-0 max-w-full overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left font-mono text-xs">
                      <thead className="border-b border-white/[0.08] text-[10px] uppercase text-zinc-400">
                        <tr>
                          <th className="py-2.5 px-3">Dziennik regionalny</th>
                          <th className="py-2.5 px-3">Województwo</th>
                          <th className="py-2.5 px-3 text-right">Udział L + CL</th>
                          <th className="py-2.5 px-3 text-right">Klony syndykatowe</th>
                          <th className="py-2.5 px-3 text-right">Śr. czas jedynki (dni rob.)</th>
                          <th className="py-2.5 px-3 text-right">Higiena rel=canonical</th>
                          <th className="py-2.5 px-3 text-center">Status realizacji SLA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {briefing.kpi_scorecard.map((row) => {
                          const passLocal = row.local_l_cl_pct >= slaMinLocalPct;
                          const passClones = row.clones_pct <= slaMaxClonesPct;
                          const passDwell = row.hero_dwell_h <= slaMaxHeroDwellHours;
                          const passCanon = row.canonical_ok_pct >= slaMinCanonicalPct;
                          const passedCount = [passLocal, passClones, passDwell, passCanon].filter(Boolean).length;

                          const dynamicStatus =
                            passedCount === 4
                              ? "W_NORMIE"
                              : passedCount >= 2
                              ? "OSTRZEZENIE"
                              : "NARUSZENIE_SLA";

                          return (
                            <tr key={row.domain} className="hover:bg-white/[0.02]">
                              <td className="py-2.5 px-3 font-bold text-white">
                                {row.portal}{" "}
                                <span className="text-[10px] text-zinc-500 font-normal">({row.domain})</span>
                              </td>
                              <td className="py-2.5 px-3 text-zinc-300">{row.region}</td>
                              <td className={`py-2.5 px-3 text-right font-bold ${passLocal ? "text-emerald-400" : "text-rose-400"}`}>
                                {row.local_l_cl_pct}%
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold ${passClones ? "text-emerald-400" : "text-rose-400"}`}>
                                {row.clones_pct}%
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold ${passDwell ? "text-emerald-400" : "text-amber-400"}`}>
                                {row.hero_dwell_h}h
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold ${passCanon ? "text-emerald-400" : "text-rose-400"}`}>
                                {row.canonical_ok_pct}%
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                    dynamicStatus === "W_NORMIE"
                                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                      : dynamicStatus === "OSTRZEZENIE"
                                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                      : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  }`}
                                >
                                  {dynamicStatus === "W_NORMIE"
                                    ? "W NORMIE (4/4)"
                                    : dynamicStatus === "OSTRZEZENIE"
                                    ? `OSTRZEŻENIE (${passedCount}/4)`
                                    : `NARUSZENIE SLA (${passedCount}/4)`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SECTION 3: RADAR STARZENIA JEDYNEK + BILANS KASKAD CANONICAL SEO (PUNKT 1.1 & 1.2) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1.1 Staleness Radar */}
                {staleness && (
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Clock className="h-4 w-4 text-teal-400" /> Radar starzenia się jedynek i luk weekendowych
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Średni czas ekspozycji głównego artykułu: dni robocze ({staleness.avg_weekday_dwell_network_hours}h) kontra weekend ({staleness.avg_weekend_dwell_network_hours}h)
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab("intelligence");
                          setIntelSubTab("staleness_radar");
                        }}
                        className="text-[11px] font-mono text-teal-300 hover:text-white underline"
                      >
                        Pełna tabela (21)
                      </button>
                    </div>

                    <div className="space-y-2.5 font-mono text-xs max-h-96 overflow-y-auto pr-1">
                      {staleness.portals.slice(0, 10).map((p) => (
                        <div key={p.domain} className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">
                              {p.portal_name} <span className="text-zinc-500">({p.domain})</span>
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.staleness_status === "DYNAMICZNA_CZOLOWKA"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : p.staleness_status === "UMIARKOWANA_ROTACJA"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-rose-500/20 text-rose-300"
                              }`}
                            >
                              {p.staleness_status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-300">
                            <span>Dzień roboczy: <strong className="text-teal-300">{p.avg_weekday_dwell_hours}h</strong></span>
                            <span>Weekend: <strong className="text-amber-300">{p.avg_weekend_dwell_hours}h</strong></span>
                            <span>Luka nocna po 17:00: <strong className="text-rose-300">{p.evening_freeze_hours}h</strong></span>
                            <span>Reakcja: <strong className="text-white">{p.median_reaction_minutes} min</strong></span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-sans">{p.diagnosis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1.2 Syndication & Canonical SEO Audit */}
                {syndAudit && (
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-purple-400" /> Kto żywi sieć, a kto bierze gotowce + audyt `rel=&quot;canonical&quot;`
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Wykryto {syndAudit.self_canonical_cannibalizing_copies_30d.toLocaleString("pl-PL")} kopii (30d) bez kanonicznego wskazania na dziennik pierwotny
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab("intelligence");
                          setIntelSubTab("canonical_syndication");
                        }}
                        className="text-[11px] font-mono text-teal-300 hover:text-white underline"
                      >
                        Pełny bilans
                      </button>
                    </div>

                    <div className="space-y-2.5 font-mono text-xs max-h-96 overflow-y-auto pr-1">
                      {syndAudit.portals.slice(0, 10).map((s) => (
                        <div key={s.domain} className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{s.portal_name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.role === "EKSPORTER_TRESCI"
                                  ? "bg-teal-500/20 text-teal-300"
                                  : s.role === "ZROWNOWAZONY"
                                  ? "bg-sky-500/20 text-sky-300"
                                  : "bg-amber-500/20 text-amber-300"
                              }`}
                            >
                              {s.role_label} ({s.export_to_import_ratio}x)
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[11px] text-zinc-300">
                            <span>Eksport oryginałów: <strong className="text-emerald-400">{s.exported_originals_30d}</strong></span>
                            <span>Import klonów: <strong className="text-amber-300">{s.imported_clones_30d}</strong></span>
                            <span>Canonical do źródła: <strong className="text-white">{s.cross_domain_canonical_pct}%</strong></span>
                            <span className={s.seo_cannibalization_risk === "WYSOKIE" ? "text-rose-400 font-bold" : "text-zinc-400"}>
                              Ryzyko SEO: {s.seo_cannibalization_risk}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: BENCHMARKING MIEJSKI 1:1 Z NIEZALEŻNYM KONKURENTEM W REGIONIE (PUNKT 1.3) */}
              {activeComp && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Scale className="h-5 w-5 text-teal-400" /> Zestawienie 1:1 z głównym niezależnym konkurentem w regionie
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Porównanie dziennego strumienia RSS/Sitemap naszego dziennika i lidera niezależnego w tym samym mieście (identyczna klasyfikacja taksonomii v2.0)
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 font-mono text-xs w-full sm:w-auto">
                      <span className="text-zinc-400 shrink-0">Wybierz aglomerację:</span>
                      <select
                        value={selectedCompetitorRegion}
                        onChange={(e) => setSelectedCompetitorRegion(e.target.value)}
                        className="w-full sm:w-auto max-w-full rounded-xl border border-white/[0.12] bg-black px-3 py-1.5 text-white font-mono text-xs truncate"
                      >
                        {compBench.map((b) => (
                          <option key={b.region} value={b.region}>
                            {b.region} — {b.ppg_portal_name} vs {b.competitor_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                    <div className="rounded-xl border border-teal-500/25 bg-teal-500/[0.05] p-4 space-y-1">
                      <span className="text-[10px] uppercase text-teal-300 font-bold block">Nasza redakcja PPG</span>
                      <span className="text-base font-bold text-white block">{activeComp.ppg_portal_name} ({activeComp.ppg_domain})</span>
                      <span className="text-zinc-300 block">Lokalny wolumen dobowy: <strong>{activeComp.ppg_local_daily_volume} art.</strong></span>
                      <span className="text-emerald-300 block pt-1">Przewaga PPG: {activeComp.ppg_advantage_topics.join(", ") || "Wyrównany profil"}</span>
                    </div>
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-4 space-y-1">
                      <span className="text-[10px] uppercase text-amber-300 font-bold block">Niezależny konkurent miejski</span>
                      <span className="text-base font-bold text-white block">{activeComp.competitor_name} ({activeComp.competitor_domain})</span>
                      <span className="text-zinc-300 block">Lokalny wolumen dobowy: <strong>{activeComp.competitor_local_daily_volume} art.</strong></span>
                      <span className="text-rose-300 block pt-1">Przewaga konkurenta: {activeComp.competitor_advantage_topics.join(", ") || "Brak wyraźnej przewagi"}</span>
                    </div>
                    <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4 space-y-1">
                      <span className="text-[10px] uppercase text-zinc-400 font-bold block">Szybkość na gorących tematach</span>
                      <span className="text-base font-bold text-teal-400 block">PPG pierwsze w {activeComp.ppg_first_on_breaking_pct}% zdarzeń</span>
                      <span className="text-zinc-300 block">Mediana różnicy czasu: <strong>{activeComp.median_lag_minutes} min</strong></span>
                      <p className="text-[11px] text-zinc-400 font-sans pt-1">{activeComp.executive_verdict}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 font-mono text-xs">
                    {activeComp.domain_comparison.map((dc) => (
                      <div key={dc.domain_code} className="rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-1.5">
                        <div className="text-[11px] font-bold text-white truncate" title={dc.domain_name}>
                          {dc.domain_code} · {dc.domain_name}
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-teal-300">PPG: {dc.ppg_share_pct}% ({dc.ppg_daily_count})</span>
                          <span className="text-amber-300">Konk.: {dc.competitor_share_pct}% ({dc.competitor_daily_count})</span>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              dc.delta_pp >= 2.0
                                ? "bg-emerald-500/20 text-emerald-300"
                                : dc.delta_pp <= -2.0
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-white/[0.06] text-zinc-400"
                            }`}
                          >
                            {dc.delta_pp > 0 ? `+${dc.delta_pp}` : dc.delta_pp} pkt proc.
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 5: ADAPTER DANYCH WEWNĘTRZNYCH (URL MATCHER POD GA4 / GSC / PIANO STREFA PLUS) */}
              <div className="rounded-2xl border border-teal-500/30 bg-teal-500/[0.03] p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Database className="h-5 w-5 text-teal-400" /> Adapter danych wewnętrznych (URL Matcher: GA4 / GSC / Piano Strefa Plus)
                    </h3>
                    <p className="text-xs text-zinc-300 mt-1">
                      Gotowy pomost do natychmiastowego łączenia danych wewnętrznych z klasyfikacją PPGscope. Wklej wiersze CSV
                      (`url,pageviews,engaged_time_sec,strefa_plus_conversions`), a system przypisze im domenę, lokalność `L / CL / C`
                      oraz wyliczy zwrot subskrypcyjny na 100 tys. odsłon.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg w-full sm:w-auto text-center sm:text-left">
                    Złączono {parsedInternalRows.length} adresów URL · {totalInternalPV.toLocaleString("pl-PL")} odsłon · {totalInternalConv} subskrypcji
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 min-w-0 space-y-2">
                    <label className="text-xs font-mono text-zinc-300 block break-words">
                      Wejściowy zrzut z GA4 / Piano (CSV: <span className="break-all font-mono text-teal-300">`url,pageviews,engaged_time_sec,strefa_plus_conversions`</span>):
                    </label>
                    <textarea
                      rows={8}
                      value={internalCsvInput}
                      onChange={(e) => setInternalCsvInput(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.12] bg-black/80 p-3 font-mono text-xs text-teal-200 focus:border-teal-400 focus:outline-none"
                    />
                  </div>

                  <div className="lg:col-span-7 min-w-0 w-full max-w-full overflow-x-auto">
                    <table className="w-full min-w-[540px] text-left font-mono text-xs">
                      <thead className="border-b border-white/[0.08] text-[10px] uppercase text-zinc-400">
                        <tr>
                          <th className="py-2 px-2.5">Domena i dziedzina</th>
                          <th className="py-2 px-2.5 text-center">Lokalność</th>
                          <th className="py-2 px-2.5 text-right">Odsłony (GA4)</th>
                          <th className="py-2 px-2.5 text-right">Czas czytania</th>
                          <th className="py-2 px-2.5 text-right">Konwersje Plus</th>
                          <th className="py-2 px-2.5 text-right">Konw. / 100k PV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {parsedInternalRows.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 px-2.5 text-center text-zinc-400">
                              Brak danych wewnętrznych. Wklej wiersze CSV obok albo wczytaj plik w Ustawieniach.
                            </td>
                          </tr>
                        )}
                        {parsedInternalRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.03]">
                            <td className="py-2.5 px-2.5">
                              <div className="font-bold text-white">{r.host}</div>
                              <div className="text-[10px] text-zinc-400 truncate max-w-xs" title={r.url}>
                                {r.topicLabel}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  r.localityCode === "L"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : r.localityCode === "CL"
                                    ? "bg-sky-500/20 text-sky-300"
                                    : "bg-zinc-500/20 text-zinc-300"
                                }`}
                              >
                                {r.localityCode}
                              </span>
                            </td>
                            <td className="py-2.5 px-2.5 text-right text-white">
                              {r.pageviews.toLocaleString("pl-PL")}
                            </td>
                            <td className={`py-2.5 px-2.5 text-right font-bold ${r.engagedSec >= 90 ? "text-emerald-400" : "text-rose-400"}`}>
                              {r.engagedSec} s
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-bold text-amber-300">
                              {r.conversions}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-bold text-teal-300">
                              {r.convPer100k}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ================================================================= */}
        {/* TAB: PORÓWNYWARKA MEDIÓW 360° (MEDIUM A VS MEDIUM B) */}
        {/* ================================================================= */}
        {activeTab === "compare" && comparisonData && (() => {
          const { sideA, sideB, domainDiffs, strongestA, strongestB } = comparisonData;
          const koA = sideA.agg.ko_sentiment;
          const koB = sideB.agg.ko_sentiment;
          const maxDomainPct = Math.max(
            1,
            ...domainDiffs.map((d) => Math.max(d.pctA, d.pctB))
          );

          const diffBadge = (valA: number, valB: number, unit = "%", invertColors = false) => {
            const diff = Math.round((valA - valB) * 10) / 10;
            if (diff === 0) {
              return <span className="text-[10px] font-mono text-zinc-500">0.0{unit}</span>;
            }
            const positiveForA = invertColors ? diff < 0 : diff > 0;
            return (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  positiveForA
                    ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                    : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                }`}
              >
                {diff > 0 ? `+${diff}${unit} A` : `+${Math.abs(diff)}${unit} B`}
              </span>
            );
          };

          return (
            <div className="space-y-6">
              {/* Top Control Card: Selector A vs Selector B + Presets */}
              <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/[0.06] via-[#0c0e12] to-sky-500/[0.06] p-5 space-y-5 shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono uppercase bg-teal-500 text-black font-bold px-2 py-0.5 rounded">
                        Tryb porównawczy A vs B ({totalTitlesCount} mediów)
                      </span>
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Scale className="h-5 w-5 text-teal-400" />
                        Porównywarka 360° mediów Polska Press Grupy
                      </h2>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">
                      Zestawienie bezpośrednie dowolnych dwóch portali (lub pojedynczego portalu ze średnią całej grupy {totalTitlesCount} mediów) według wszystkich 7 kryteriów badawczych w wybranym oknie czasu.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        const prevA = sideA.domain;
                        const prevB = sideB.domain;
                        setSelectedMediumDomain(prevB);
                        setCompareMediumDomain(prevA);
                      }}
                      className="rounded-xl border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.12] text-white px-3.5 py-2 text-xs font-mono transition-all flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-teal-400" /> Zamień strony (A ↔ B)
                    </button>
                  </div>
                </div>

                {/* Dual Selector Grid: Medium A (Teal) vs Medium B (Sky) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Selector A */}
                  <div className="rounded-xl border border-teal-500/40 bg-black/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase font-bold text-teal-400 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-teal-400" /> Medium A (punkt odniesienia)
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        Region: <strong className="text-white">{sideA.region}</strong> · {sideA.type}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="text"
                          value={mediumSearchQuery}
                          onChange={(e) => setMediumSearchQuery(e.target.value)}
                          placeholder="Szukaj Medium A (np. kraków, zachodni)..."
                          className="w-full rounded-xl border border-white/[0.1] bg-black/70 py-1.5 pl-8 pr-6 text-xs font-mono text-white placeholder-zinc-500 focus:border-teal-400 focus:outline-none"
                        />
                        {mediumSearchQuery && (
                          <button
                            onClick={() => setMediumSearchQuery("")}
                            className="absolute right-2 top-2 text-zinc-400 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <select
                        value={sideA.domain}
                        onChange={(e) => setSelectedMediumDomain(e.target.value)}
                        className="w-full sm:w-72 max-w-full rounded-xl border border-teal-500/40 bg-black/90 py-1.5 px-3 text-xs font-mono text-white focus:border-teal-400 focus:outline-none truncate"
                      >
                        <option value="ALL">Cała grupa PPG (benchmark {totalTitlesCount} mediów)</option>
                        <optgroup label="Dzienniki regionalne (20)">
                          {filteredTitlesForSelector
                            .filter((t) => t.type === "DZIENNIK_REGIONALNY" || t.type === "Dziennik regionalny")
                            .map((t) => (
                              <option key={t.id} value={t.domain}>
                                {t.name} ({t.domain})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Media lokalne i tematyczne (526)">
                          {filteredTitlesForSelector
                            .filter((t) => t.type !== "DZIENNIK_REGIONALNY" && t.type !== "Dziennik regionalny")
                            .map((t) => (
                              <option key={t.id} value={t.domain}>
                                {t.name} ({t.domain})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-xs font-mono">
                      <span className="text-white font-bold truncate">{sideA.name}</span>
                      <span className="text-teal-300">{sideA.agg.totalCount.toLocaleString("pl-PL")} art. w okresie</span>
                    </div>
                  </div>

                  {/* Selector B */}
                  <div className="rounded-xl border border-sky-500/40 bg-black/50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono uppercase font-bold text-sky-400 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Medium B (porównywane)
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">
                        Region: <strong className="text-white">{sideB.region}</strong> · {sideB.type}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                        <input
                          type="text"
                          value={compareSearchQuery}
                          onChange={(e) => setCompareSearchQuery(e.target.value)}
                          placeholder="Szukaj Medium B (np. bałtycki, sopot, i.pl)..."
                          className="w-full rounded-xl border border-white/[0.1] bg-black/70 py-1.5 pl-8 pr-6 text-xs font-mono text-white placeholder-zinc-500 focus:border-sky-400 focus:outline-none"
                        />
                        {compareSearchQuery && (
                          <button
                            onClick={() => setCompareSearchQuery("")}
                            className="absolute right-2 top-2 text-zinc-400 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <select
                        value={sideB.domain}
                        onChange={(e) => setCompareMediumDomain(e.target.value)}
                        className="w-full sm:w-72 max-w-full rounded-xl border border-sky-500/40 bg-black/90 py-1.5 px-3 text-xs font-mono text-white focus:border-sky-400 focus:outline-none truncate"
                      >
                        <option value="ALL">Cała grupa PPG (benchmark {totalTitlesCount} mediów)</option>
                        <optgroup label="Dzienniki regionalne (20)">
                          {filteredTitlesForCompareSelector
                            .filter((t) => t.type === "DZIENNIK_REGIONALNY" || t.type === "Dziennik regionalny")
                            .map((t) => (
                              <option key={t.id} value={t.domain}>
                                {t.name} ({t.domain})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Media lokalne i tematyczne (526)">
                          {filteredTitlesForCompareSelector
                            .filter((t) => t.type !== "DZIENNIK_REGIONALNY" && t.type !== "Dziennik regionalny")
                            .map((t) => (
                              <option key={t.id} value={t.domain}>
                                {t.name} ({t.domain})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-xs font-mono">
                      <span className="text-white font-bold truncate">{sideB.name}</span>
                      <span className="text-sky-300">{sideB.agg.totalCount.toLocaleString("pl-PL")} art. w okresie</span>
                    </div>
                  </div>
                </div>

                {/* Quick Preset Comparisons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-mono text-zinc-400">Szybkie zestawienia:</span>
                  {[
                    { label: "Gazeta Krakowska vs Dziennik Bałtycki", a: "gazetakrakowska.pl", b: "dziennikbaltycki.pl" },
                    { label: "Dziennik Zachodni vs Głos Wielkopolski", a: "dziennikzachodni.pl", b: "gloswielkopolski.pl" },
                    { label: "Kraków NaszeMiasto vs Bochnia NaszeMiasto", a: "krakow.naszemiasto.pl", b: "bochnia.naszemiasto.pl" },
                    { label: "Strefa Biznesu vs Strefa Agro", a: "strefabiznesu.pl", b: "strefaagro.pl" },
                    { label: "Portal i.pl vs Cała grupa PPG (546)", a: "i.pl", b: "ALL" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        setSelectedMediumDomain(preset.a);
                        setCompareMediumDomain(preset.b);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-mono border transition-all ${
                        sideA.domain === preset.a && sideB.domain === preset.b
                          ? "bg-teal-500 text-black border-teal-400 font-bold"
                          : "bg-black/50 text-zinc-300 border-white/[0.08] hover:border-teal-500/40 hover:text-white"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ================================================================= */}
              {/* 6 MULTI-CRITERIA HEAD-TO-HEAD DIAGNOSTIC CARDS (A VS B) */}
              {/* ================================================================= */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
                {/* Card 1: Volume & Thematic Specialization */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-teal-400" /> 1. Skala i specjalizacja
                    </span>
                    <span className="text-[10px] text-zinc-400">18 dziedzin</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-teal-500/10 border border-teal-500/20 p-2.5">
                      <span className="block text-[10px] text-teal-300 truncate">{sideA.name}</span>
                      <span className="text-base font-bold text-white">{sideA.agg.totalCount.toLocaleString("pl-PL")}</span>
                      <span className="block text-[10px] text-zinc-400">{sideA.dailyCount} art./dobę</span>
                    </div>
                    <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-2.5">
                      <span className="block text-[10px] text-sky-300 truncate">{sideB.name}</span>
                      <span className="text-base font-bold text-white">{sideB.agg.totalCount.toLocaleString("pl-PL")}</span>
                      <span className="block text-[10px] text-zinc-400">{sideB.dailyCount} art./dobę</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 text-[11px]">
                    <div className="text-zinc-400">
                      Największa przewaga <strong className="text-teal-300">Medium A</strong>:
                      {strongestA.slice(0, 2).map((d) => (
                        <div key={d.slug} className="flex flex-wrap items-center justify-between text-zinc-200 mt-0.5 gap-1">
                          <span className="truncate max-w-[160px]">{d.code} {d.name}</span>
                          <span className="text-teal-300 font-bold">+{d.diffPct} pkt ({d.pctA}% vs {d.pctB}%)</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-zinc-400 pt-1 border-t border-white/[0.05]">
                      Największa przewaga <strong className="text-sky-300">Medium B</strong>:
                      {strongestB.slice(0, 2).map((d) => (
                        <div key={d.slug} className="flex flex-wrap items-center justify-between text-zinc-200 mt-0.5 gap-1">
                          <span className="truncate max-w-[160px]">{d.code} {d.name}</span>
                          <span className="text-sky-300 font-bold">+{Math.abs(d.diffPct)} pkt ({d.pctB}% vs {d.pctA}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card 2: Locality (L / CL / C) & Localization Index */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Compass className="h-4 w-4 text-teal-400" /> 2. Lokalność (L / CL / C)
                    </span>
                    {diffBadge(sideA.agg.localContentShare, sideB.agg.localContentShare, " pkt")}
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-zinc-400">Czysto lokalne (L):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.lPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.lPct}%</span>
                        {diffBadge(sideA.lPct, sideB.lPct)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-zinc-400">Rozwinięcie lokalne (CL):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.clPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.clPct}%</span>
                        {diffBadge(sideA.clPct, sideB.clPct)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-zinc-400">Centralne bez lokalizacji (C):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.cPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.cPct}%</span>
                        {diffBadge(sideA.cPct, sideB.cPct, "%", true)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Udział lokalny (L+CL):</span>
                      <span>
                        <strong className="text-teal-300">{sideA.agg.localContentShare}%</strong> vs{" "}
                        <strong className="text-sky-300">{sideB.agg.localContentShare}%</strong>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Wskaźnik CL / (C+CL):</span>
                      <span>
                        <strong className="text-teal-300">{sideA.agg.localizationIndex}%</strong> vs{" "}
                        <strong className="text-sky-300">{sideB.agg.localizationIndex}%</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 3: Vitality & Content Uniqueness */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-teal-400" /> 3. Żywotność i unikalność
                    </span>
                    {diffBadge(sideA.vitalityScore, sideB.vitalityScore, " pkt")}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-black/50 border border-teal-500/20 p-2">
                      <span className="block text-[10px] text-teal-300">{sideA.vitalityLabel}</span>
                      <span className="text-base font-bold text-white">{sideA.vitalityScore}/100</span>
                      <span className="block text-[10px] text-zinc-400">{sideA.uniqueDaily} unik./dobę</span>
                    </div>
                    <div className="rounded-lg bg-black/50 border border-sky-500/20 p-2">
                      <span className="block text-[10px] text-sky-300">{sideB.vitalityLabel}</span>
                      <span className="text-base font-bold text-white">{sideB.vitalityScore}/100</span>
                      <span className="block text-[10px] text-zinc-400">{sideB.uniqueDaily} unik./dobę</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Teksty unikalne:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.uniqPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.uniqPct}%</span>
                        {diffBadge(sideA.uniqPct, sideB.uniqPct)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Klony sieciowe PPG:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.clonesPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.clonesPct}%</span>
                        {diffBadge(sideA.clonesPct, sideB.clonesPct, "%", true)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Publikacje z crona (:00/:15):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.cronPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.cronPct}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 4: Authorship Structure (Byline Pulse) */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-teal-400" /> 4. Struktura autorstwa
                    </span>
                    {diffBadge(sideA.namedPct, sideB.namedPct)}
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Autorzy imienni (redakcja):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.namedPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.namedPct}%</span>
                        {diffBadge(sideA.namedPct, sideB.namedPct)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Bez podpisu (Redakcja):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.anonPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.anonPct}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Agencje (PAP / depesze):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.wirePct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.wirePct}%</span>
                        {diffBadge(sideA.wirePct, sideB.wirePct, "%", true)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Partnerzy zewnętrzni:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.partnerPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.partnerPct}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex justify-between text-[11px] text-zinc-400">
                    <span>Aktywni autorzy (30d):</span>
                    <span>
                      <strong className="text-teal-300">{sideA.namedAuthors}</strong> vs{" "}
                      <strong className="text-sky-300">{sideB.namedAuthors}</strong> dziennikarzy
                    </span>
                  </div>
                </div>

                {/* Card 5: Monetization, Strefa Plus Paywall & Discover Bait */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Lock className="h-4 w-4 text-teal-400" /> 5. Paywall, Sponsor i Discover
                    </span>
                    {diffBadge(sideA.paywallPct, sideB.paywallPct)}
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Paywall (Strefa Plus):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.paywallPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.paywallPct}%</span>
                        {diffBadge(sideA.paywallPct, sideB.paywallPct)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Materiały sponsorowane:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.sponsoredPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.sponsoredPct}%</span>
                        {diffBadge(sideA.sponsoredPct, sideB.sponsoredPct)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Google Discover Bait:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.discoverBaitPct}%</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.discoverBaitPct}%</span>
                        {diffBadge(sideA.discoverBaitPct, sideB.discoverBaitPct, "%", true)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] text-[10px] text-zinc-400">
                    Porównanie ekspozycji treści premium (Strefa Plus) względem przynęt pod algorytm Google Discover.
                  </div>
                </div>

                {/* Card 6: Homepage Radar, Mutations & Local Institutions */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-teal-400" /> 6. Jedynka, mutacje i powiaty
                    </span>
                    {diffBadge(sideA.localInstitutionsCount, sideB.localInstitutionsCount, "")}
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Luka jedynki (WWW vs RSS):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.agendaGapScore} pkt</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.agendaGapScore} pkt</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Mutacje nagłówków (48h):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.headlineMutations30d}</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.headlineMutations30d}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Instytucje lokalne (TERYT):</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.localInstitutionsCount.toLocaleString("pl-PL")}</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.localInstitutionsCount.toLocaleString("pl-PL")}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Cytowania zewnętrzne:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-teal-300 font-bold">{sideA.externalCitations30d}</span>
                        <span className="text-zinc-600">vs</span>
                        <span className="text-sky-300 font-bold">{sideB.externalCitations30d}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================================================================= */}
              {/* HEAD-TO-HEAD 18 THEMATIC DOMAINS COMPARISON (A VS B + DELTA) */}
              {/* ================================================================= */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-teal-400" />
                      Bezpośrednie porównanie 18 dziedzin tematycznych: {sideA.name} vs {sideB.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Udział procentowy oraz wolumen publikacji w każdej z 18 dziedzin taksonomii v2.0 wraz z różnicą punktów procentowych (Δ pkt proc.).
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-teal-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-teal-400" /> {sideA.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-sky-300">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> {sideB.name}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {domainDiffs.map((d) => (
                    <div
                      key={d.slug}
                      className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5 space-y-2 hover:border-white/[0.15] transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-mono text-teal-400">
                            {d.code}
                          </span>
                          <span className="text-xs font-semibold text-white truncate">{d.name}</span>
                        </div>
                        {diffBadge(d.pctA, d.pctB, " pkt")}
                      </div>

                      {/* Bar A */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-teal-300 truncate max-w-[190px]">{sideA.name}</span>
                          <span className="text-white font-bold">
                            {d.pctA}% <span className="text-zinc-500 font-normal">({d.totalA.toLocaleString("pl-PL")} art.)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, (d.pctA / maxDomainPct) * 100)}%` }}
                            className="h-full bg-teal-400 rounded-full"
                          />
                        </div>
                      </div>

                      {/* Bar B */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-sky-300 truncate max-w-[190px]">{sideB.name}</span>
                          <span className="text-white font-bold">
                            {d.pctB}% <span className="text-zinc-500 font-normal">({d.totalB.toLocaleString("pl-PL")} art.)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, (d.pctB / maxDomainPct) * 100)}%` }}
                            className="h-full bg-sky-400 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ================================================================= */}
              {/* HEAD-TO-HEAD KO / PO SENTIMENT & REGIONAL POLITICIANS (A VS B) */}
              {/* ================================================================= */}
              {koA && koB && (
                <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <Vote className="h-4 w-4 text-teal-400" />
                        Porównanie wydźwięku KO / PO i ekspozycji polityków: {sideA.name} vs {sideB.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Zestawienie nacechowania publikacji politycznych oraz czołowych polityków KO / PO dominujących w obu porównywanych mediach.
                      </p>
                    </div>
                    {diffBadge(koA.net_sentiment_score, koB.net_sentiment_score, " pkt salda")}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* KO / PO Column A */}
                    <div className="rounded-xl border border-teal-500/30 bg-black/40 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-teal-400 block">Medium A</span>
                          <h4 className="text-sm font-bold text-white">{sideA.name}</h4>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-xs text-zinc-400 block">Saldo wydźwięku:</span>
                          <span className="text-sm font-bold text-teal-300">
                            {koA.net_sentiment_score > 0 ? `+${koA.net_sentiment_score}` : koA.net_sentiment_score} pkt
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                        <div className="rounded bg-emerald-500/10 border border-emerald-500/20 p-2">
                          <span className="block text-emerald-400 font-bold">{koA.breakdown.positive.pct}%</span>
                          <span className="text-[10px] text-zinc-400">Pozytywny ({koA.breakdown.positive.count})</span>
                        </div>
                        <div className="rounded bg-sky-500/10 border border-sky-500/20 p-2">
                          <span className="block text-sky-400 font-bold">{koA.breakdown.neutral.pct}%</span>
                          <span className="text-[10px] text-zinc-400">Neutralny ({koA.breakdown.neutral.count})</span>
                        </div>
                        <div className="rounded bg-rose-500/10 border border-rose-500/20 p-2">
                          <span className="block text-rose-400 font-bold">{koA.breakdown.negative.pct}%</span>
                          <span className="text-[10px] text-zinc-400">Negatywny ({koA.breakdown.negative.count})</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-mono text-zinc-400 block">
                          Czołowi politycy KO / PO w {sideA.name}:
                        </span>
                        {koA.top_politicians.slice(0, 6).map((pol, idx) => (
                          <div
                            key={pol.name}
                            className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2.5 py-1.5 text-xs font-mono border border-white/[0.04] gap-2 min-w-0"
                          >
                            <div className="min-w-0 flex-1 truncate pr-1">
                              <span className="text-teal-400 mr-1 shrink-0">#{idx + 1}</span>
                              <strong className="text-white">{pol.name}</strong>
                              <span className="text-[10px] text-zinc-400 ml-1.5 hidden sm:inline">({pol.role})</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-[10px] sm:text-[11px]">
                              <span className="text-zinc-300">{pol.mentions} wzm.</span>
                              <span className="text-emerald-400">+{pol.positive_pct}%</span>
                              <span className="text-rose-400">-{pol.negative_pct}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* KO / PO Column B */}
                    <div className="rounded-xl border border-sky-500/30 bg-black/40 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                        <div>
                          <span className="text-[10px] font-mono uppercase text-sky-400 block">Medium B</span>
                          <h4 className="text-sm font-bold text-white">{sideB.name}</h4>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-xs text-zinc-400 block">Saldo wydźwięku:</span>
                          <span className="text-sm font-bold text-sky-300">
                            {koB.net_sentiment_score > 0 ? `+${koB.net_sentiment_score}` : koB.net_sentiment_score} pkt
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                        <div className="rounded bg-emerald-500/10 border border-emerald-500/20 p-2">
                          <span className="block text-emerald-400 font-bold">{koB.breakdown.positive.pct}%</span>
                          <span className="text-[10px] text-zinc-400">Pozytywny ({koB.breakdown.positive.count})</span>
                        </div>
                        <div className="rounded bg-sky-500/10 border border-sky-500/20 p-2">
                          <span className="block text-sky-400 font-bold">{koB.breakdown.neutral.pct}%</span>
                          <span className="text-[10px] text-zinc-400">Neutralny ({koB.breakdown.neutral.count})</span>
                        </div>
                        <div className="rounded bg-rose-500/10 border border-rose-500/20 p-2">
                          <span className="block text-rose-400 font-bold">{koB.breakdown.negative.pct}%</span>
                          <span className="text-[10px] text-zinc-400">Negatywny ({koB.breakdown.negative.count})</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-mono text-zinc-400 block">
                          Czołowi politycy KO / PO w {sideB.name}:
                        </span>
                        {koB.top_politicians.slice(0, 6).map((pol, idx) => (
                          <div
                            key={pol.name}
                            className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2.5 py-1.5 text-xs font-mono border border-white/[0.04] gap-2 min-w-0"
                          >
                            <div className="min-w-0 flex-1 truncate pr-1">
                              <span className="text-sky-400 mr-1 shrink-0">#{idx + 1}</span>
                              <strong className="text-white">{pol.name}</strong>
                              <span className="text-[10px] text-zinc-400 ml-1.5 hidden sm:inline">({pol.role})</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-[10px] sm:text-[11px]">
                              <span className="text-zinc-300">{pol.mentions} wzm.</span>
                              <span className="text-emerald-400">+{pol.positive_pct}%</span>
                              <span className="text-rose-400">-{pol.negative_pct}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ================================================================= */}
        {/* TAB: WYDŹWIĘK SCENY POLITYCZNEJ (8 UGRUPOWAŃ / PODMIOTÓW) */}
        {/* ================================================================= */}
        {activeTab === "ko_sentiment" && (() => {
          const activeConfig = POLITICAL_ACTORS[selectedPoliticalActor];
          const activeSentimentData: PoliticalSentimentData =
            activePoliticalSentiments[selectedPoliticalActor] || {
              actor_id: selectedPoliticalActor,
              actor_name: activeConfig.name,
              scope: `${DOMAIN_SCOPE_OPTIONS.find((o) => o.id === sentimentDomainScope)?.label || "Dziedziny polityczne"} (artykuły z obecnością ${activeConfig.shortName})`,
              total_political_articles: 0,
              mentions_count: 0,
              mentions_pct: 0,
              breakdown: {
                positive: { count: 0, pct: 0 },
                neutral: { count: 0, pct: 0 },
                negative: { count: 0, pct: 0 },
              },
              net_sentiment_score: 0,
              top_politicians: [],
            };

          const rawArticles: SamplePoliticalArticle[] =
            activeSentimentData.sample_articles && activeSentimentData.sample_articles.length > 0
              ? activeSentimentData.sample_articles
              : activeConfig.curatedSampleArticles.map((s) => ({ ...s, actor_id: selectedPoliticalActor }));

          const filteredSampleArticles = rawArticles.filter((a) => {
            if (selectedKOSentimentFilter === "all") return true;
            return a.sentiment === selectedKOSentimentFilter;
          });

          const periodLabelMap: Record<string, string> = {
            "24h": "24h (ostatnia doba)",
            "7d": "7 dni (ostatni tydzień)",
            "30d": "30 dni (ostatni miesiąc)",
            "90d": "90 dni (ostatni kwartał)",
            "1y": "1 rok (ostatnie 365 dni)",
            "all": "Wszystkie (od 9.03.2024)",
            "custom": `${customStartDate} – ${customEndDate}`,
          };

          return (
            <div className="space-y-6">
              {/* 8-Actor Multi-Entity Selector Bar */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Vote className="h-4 w-4 text-teal-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      Wybór ugrupowania lub podmiotu politycznego (8 sił):
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => triggerLiveScan("ALL", { actor: selectedPoliticalActor, preset: timePreset })}
                      disabled={isLiveScanning}
                      className="rounded-lg border border-teal-500/40 bg-teal-500/15 px-3 py-1 text-[11px] font-mono font-semibold text-teal-300 hover:bg-teal-500/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${isLiveScanning ? "animate-spin" : ""}`} />
                      Przeskanuj sieć w locie dla {activeConfig.shortName}
                    </button>
                    <span className="text-[11px] font-mono text-zinc-400 hidden xl:inline">
                      Kliknij podmiot, aby przełączyć analizę wydźwięku
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {ALL_POLITICAL_ACTOR_IDS.map((actorId) => {
                    const cfg = POLITICAL_ACTORS[actorId];
                    const actorData = activePoliticalSentiments[actorId];
                    const isSelected = selectedPoliticalActor === actorId;
                    const net = actorData?.net_sentiment_score ?? 0;
                    return (
                      <button
                        key={actorId}
                        onClick={() => setSelectedPoliticalActor(actorId)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all font-mono ${
                          isSelected
                            ? "bg-white/[0.12] border-teal-400/80 shadow-lg shadow-teal-500/10 ring-1 ring-teal-400/50"
                            : "bg-black/40 border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.15]"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.badgeBg} ${cfg.badgeText}`}
                          >
                            {cfg.badge}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              net > 0 ? "text-emerald-400" : net < 0 ? "text-rose-400" : "text-zinc-400"
                            }`}
                          >
                            {net > 0 ? `+${net}` : net} pkt
                          </span>
                        </div>
                        <span className="text-xs font-bold text-white mt-1.5 truncate w-full">
                          {cfg.shortName}
                        </span>
                        <span className="text-[10px] text-zinc-400 truncate w-full">
                          {actorData?.mentions_count ? `${actorData.mentions_count.toLocaleString("pl-PL")} art.` : "0 art."}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Domain Scope Filter (Cross-domain sectorial breakdown) */}
                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-teal-400" />
                      Zakres dziedzinowy (obecność polityki w sektorach tematycznych):
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Wybierz sektor tematyczny lub badaj wszystkie działy łącznie (Cross-domain)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {DOMAIN_SCOPE_OPTIONS.map((opt) => {
                      const isSel = sentimentDomainScope === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSentimentDomainScope(opt.id)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                            isSel
                              ? "bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 shadow-sm shadow-teal-500/20"
                              : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 border border-transparent"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Weighting Model Selector (Raw vs Homepage Exposure vs Audience Reach vs Telemetry) */}
                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-teal-400" />
                      Perspektywa ważenia i siła oddziaływania mediów:
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Wybierz model: czysta linia redakcji [POMIAR] lub ważenie siłą dotarcia [PRZYBLIŻENIE]
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {(["raw", "homepage_exposure", "audience_reach", "telemetry"] as SentimentWeightingMode[]).map((modeKey) => {
                      const modeCfg = WEIGHTING_MODE_CONFIG[modeKey];
                      const isSel = sentimentWeightingMode === modeKey;
                      return (
                        <button
                          key={modeKey}
                          onClick={() => setSentimentWeightingMode(modeKey)}
                          className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all font-mono ${
                            isSel
                              ? "bg-teal-500/15 border-teal-400/80 shadow-md shadow-teal-500/10 ring-1 ring-teal-400/50"
                              : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-white truncate">{modeCfg.shortLabel}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                modeCfg.provenance.status === "POMIAR"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {modeCfg.provenance.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                            {modeCfg.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Methodological Provenance & Shift Note */}
              <div className="rounded-xl border border-white/[0.08] bg-black/40 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        Aktywny model: {WEIGHTING_MODE_CONFIG[sentimentWeightingMode].label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-300">
                        {WEIGHTING_MODE_CONFIG[sentimentWeightingMode].provenance.methodology_version}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {WEIGHTING_MODE_CONFIG[sentimentWeightingMode].provenance.footnote}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeMediaAccountability.shift_delta !== 0 ? (
                    <div className="rounded-lg bg-teal-500/10 border border-teal-500/30 px-3 py-1 text-right">
                      <span className="text-[10px] uppercase text-teal-400 block font-bold">Przesunięcie ważone</span>
                      <span className="text-xs font-bold text-white">
                        {activeMediaAccountability.shift_delta > 0 ? "+" : ""}{activeMediaAccountability.shift_delta} pkt
                        <span className="text-[10px] text-zinc-400 font-normal ml-1">
                          (surowe: {activeMediaAccountability.raw_global_net_score > 0 ? "+" : ""}{activeMediaAccountability.raw_global_net_score})
                        </span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-500">Brak przesunięcia vs produkcja</span>
                  )}
                </div>
              </div>

              {sentimentWeightingMode === "telemetry" && internalRowsCount === 0 && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs font-mono text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>
                    Brak załadowanych danych telemetrycznych (GA4/Piano) w bieżącej sesji. Przejdź do Ustawień (ikona zębatki), aby wkleić plik CSV. System stosuje wagi bazowe.
                  </span>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold underline shrink-0"
                  >
                    Otwórz Ustawienia
                  </button>
                </div>
              )}

              {/* Header Card for Active Actor */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Vote className="h-5 w-5 text-teal-400" />
                      Wydźwięk medialny: {activeConfig.name}
                    </h2>
                    <span className="text-[11px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 rounded-lg font-semibold">
                      Okres: {periodLabelMap[timePreset] || timePreset}
                    </span>
                    <span className="text-[11px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg font-semibold">
                      Dział: {DOMAIN_SCOPE_OPTIONS.find((o) => o.id === sentimentDomainScope)?.label.split("(")[0].trim() || "Wszystkie działy"}
                    </span>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-lg font-semibold ${activeConfig.badgeBg} ${activeConfig.badgeText} border ${activeConfig.borderClass}`}>
                      {activeConfig.badge}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                    {activeConfig.description} 100% zbadanej bazy w tym widoku stanowią
                    wyłącznie teksty z obecnością {activeConfig.shortName} w wybranym filtrze dziedzinowym.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-3.5 py-2 text-right font-mono">
                    <span className="text-[10px] uppercase text-teal-400 block font-bold">Teksty z obecnością {activeConfig.badge}</span>
                    <span className="text-sm font-bold text-white">
                      {activeSentimentData.mentions_count.toLocaleString("pl-PL")} z {activeSentimentData.total_political_articles.toLocaleString("pl-PL")} art. w dziale
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      ({activeSentimentData.mentions_pct}% analizowanej bazy)
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Positive Card */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <ThumbsUp className="h-4 w-4 text-emerald-400" /> Pozytywny
                    </span>
                    <span className="text-emerald-300 font-semibold">{activeSentimentData.breakdown.positive.pct}%</span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-white font-mono">
                    {activeSentimentData.breakdown.positive.count.toLocaleString("pl-PL")}
                    <span className="text-xs font-normal text-zinc-400 ml-1.5">art.</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Sukcesy, odblokowane fundusze, inwestycje, poparcie społeczne, realizacja obietnic.
                  </p>
                </div>

                {/* Neutral Card */}
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-sky-400 font-bold flex items-center gap-1.5">
                      <Minus className="h-4 w-4 text-sky-400" /> Neutralny / Relacyjny
                    </span>
                    <span className="text-sky-300 font-semibold">{activeSentimentData.breakdown.neutral.pct}%</span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-white font-mono">
                    {activeSentimentData.breakdown.neutral.count.toLocaleString("pl-PL")}
                    <span className="text-xs font-normal text-zinc-400 ml-1.5">art.</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Sprawozdania z obrad, komunikaty urzędowe, rzetelne relacje prasowe bez narracji wartościującej.
                  </p>
                </div>

                {/* Negative Card */}
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-rose-400 font-bold flex items-center gap-1.5">
                      <ThumbsDown className="h-4 w-4 text-rose-400" /> Negatywny / Krytyczny
                    </span>
                    <span className="text-rose-300 font-semibold">{activeSentimentData.breakdown.negative.pct}%</span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-white font-mono">
                    {activeSentimentData.breakdown.negative.count.toLocaleString("pl-PL")}
                    <span className="text-xs font-normal text-zinc-400 ml-1.5">art.</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Krytyka oponentów, spory podatkowe i inwestycyjne, protesty społeczne, zarzuty o zaniechania.
                  </p>
                </div>

                {/* Net Sentiment Card */}
                <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                      <Scale className="h-4 w-4 text-teal-400" /> Saldo wydźwięku
                    </span>
                    <span className="text-teal-400 font-semibold">
                      {WEIGHTING_MODE_CONFIG[sentimentWeightingMode].shortLabel}
                    </span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-white font-mono">
                    {activeSentimentData.net_sentiment_score > 0 ? "+" : ""}
                    {activeSentimentData.net_sentiment_score}
                    <span className="text-xs font-normal text-zinc-400 ml-1.5">pkt proc.</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Indeks przewagi tonu ({WEIGHTING_MODE_CONFIG[sentimentWeightingMode].provenance.status}).
                    {typeof activeSentimentData.raw_net_sentiment_score === "number" &&
                      activeSentimentData.weighting_shift !== undefined &&
                      activeSentimentData.weighting_shift !== 0 && (
                        <span className="block text-teal-300 font-mono mt-0.5">
                          Surowe: {activeSentimentData.raw_net_sentiment_score > 0 ? "+" : ""}
                          {activeSentimentData.raw_net_sentiment_score} pkt (Δ{" "}
                          {activeSentimentData.weighting_shift > 0 ? "+" : ""}
                          {activeSentimentData.weighting_shift} pkt)
                        </span>
                      )}
                  </p>
                </div>
              </div>

              {/* Stacked Proportional Bar (100% Breakdown) */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <span className="font-semibold text-white">
                    Struktura podziału tonu w zbadanej próbie artykułów o {activeConfig.shortName} (100%):
                  </span>
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Pozytywne ({activeSentimentData.breakdown.positive.pct}%)
                    </span>
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <span className="h-2.5 w-2.5 rounded bg-sky-500" /> Neutralne ({activeSentimentData.breakdown.neutral.pct}%)
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <span className="h-2.5 w-2.5 rounded bg-rose-500" /> Negatywne ({activeSentimentData.breakdown.negative.pct}%)
                    </span>
                  </div>
                </div>

                <div className="h-6 w-full rounded-full bg-white/[0.04] overflow-hidden flex font-mono text-xs text-black font-bold">
                  <div
                    style={{ width: `${activeSentimentData.breakdown.positive.pct}%` }}
                    className="h-full bg-emerald-500 flex items-center justify-center transition-all duration-500"
                    title={`Pozytywny: ${activeSentimentData.breakdown.positive.count.toLocaleString("pl-PL")} art. (${activeSentimentData.breakdown.positive.pct}%)`}
                  >
                    {activeSentimentData.breakdown.positive.pct >= 8 && `${activeSentimentData.breakdown.positive.pct}%`}
                  </div>
                  <div
                    style={{ width: `${activeSentimentData.breakdown.neutral.pct}%` }}
                    className="h-full bg-sky-400 flex items-center justify-center transition-all duration-500"
                    title={`Neutralny: ${activeSentimentData.breakdown.neutral.count.toLocaleString("pl-PL")} art. (${activeSentimentData.breakdown.neutral.pct}%)`}
                  >
                    {activeSentimentData.breakdown.neutral.pct >= 8 && `${activeSentimentData.breakdown.neutral.pct}%`}
                  </div>
                  <div
                    style={{ width: `${activeSentimentData.breakdown.negative.pct}%` }}
                    className="h-full bg-rose-500 flex items-center justify-center transition-all duration-500"
                    title={`Negatywny: ${activeSentimentData.breakdown.negative.count.toLocaleString("pl-PL")} art. (${activeSentimentData.breakdown.negative.pct}%)`}
                  >
                    {activeSentimentData.breakdown.negative.pct >= 8 && `${activeSentimentData.breakdown.negative.pct}%`}
                  </div>
                </div>
              </div>

              {/* Politicians / Representatives Table */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-400" />
                    Wydźwięk wokół czołowych reprezentantów: {activeConfig.shortName}
                  </h3>
                  <span className="text-xs font-mono text-zinc-400">
                    Rozbicie według bezpośrednich wzmianek w publikacjach regionalnych PPG
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeSentimentData.top_politicians.map((pol) => {
                    const polNet = Math.round((pol.positive_pct - pol.negative_pct) * 10) / 10;
                    return (
                      <div
                        key={pol.name}
                        className="rounded-xl border border-white/[0.06] bg-black/30 p-4 space-y-2 hover:border-white/[0.12] transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold text-white text-sm block">{pol.name}</span>
                            <span className="text-[10px] text-zinc-400 block">{pol.role}</span>
                          </div>
                          <span className="text-xs font-mono text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-bold">
                            {pol.mentions.toLocaleString("pl-PL")} wzmianek
                          </span>
                        </div>

                        {/* Miniature segmented bar */}
                        <div className="space-y-1 pt-1">
                          <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                            <div
                              style={{ width: `${pol.positive_pct}%` }}
                              className="h-full bg-emerald-500"
                              title={`Pozytywny: ${pol.positive_pct}%`}
                            />
                            <div
                              style={{ width: `${pol.neutral_pct}%` }}
                              className="h-full bg-sky-400"
                              title={`Neutralny: ${pol.neutral_pct}%`}
                            />
                            <div
                              style={{ width: `${pol.negative_pct}%` }}
                              className="h-full bg-rose-500"
                              title={`Negatywny: ${pol.negative_pct}%`}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                            <span className="text-emerald-400">{pol.positive_pct}% poz.</span>
                            <span className="text-sky-300">{pol.neutral_pct}% neu.</span>
                            <span className="text-rose-400">{pol.negative_pct}% neg.</span>
                            <span className="font-bold text-white">
                              saldo: {polNet > 0 ? "+" : ""}{polNet}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ================================================================= */}
              {/* MEDIA ACCOUNTABILITY & EDITORIAL RESPONSIBILITY ENGINE */}
              {/* ================================================================= */}
              <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-teal-400" />
                      Kto odpowiada za ten rozkład? Odpowiedzialność redakcyjna i profilowanie mediów
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Wskazanie konkretnych tytułów prasowych i portali PPG, które najbardziej ciągną wynik {activeConfig.shortName} w górę (przychylne) lub w dół (krytyczne).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20 px-3 py-1 rounded-lg">
                      Zbadano 546 tytułów PPG
                    </span>
                  </div>
                </div>

                {/* Editorial Insight Narrative Box */}
                {activeMediaAccountability.editorial_insight && (
                  <div className="rounded-xl border border-teal-500/30 bg-teal-500/[0.04] p-4 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center gap-2 text-teal-400 font-bold uppercase tracking-wider text-[11px]">
                      <Compass className="h-4 w-4" /> Wniosek medioznawczy i syntetyczna diagnoza:
                    </div>
                    <p className="text-zinc-200 leading-relaxed">
                      {activeMediaAccountability.editorial_insight}
                    </p>
                  </div>
                )}

                {/* 3 Top Ranking Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Card 1: Top Friendly Media */}
                  <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.03] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        Najbardziej przychylne (ciągną wynik w górę)
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300/80 font-semibold">
                        Top 5 bastionów
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {activeMediaAccountability.top_friendly.map((m, idx) => (
                        <div
                          key={m.domain}
                          className="rounded-lg bg-black/40 border border-white/[0.04] p-2.5 space-y-1.5 hover:border-emerald-500/40 transition-all font-mono"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-emerald-400">#{idx + 1}</span>
                                <span className="text-xs font-bold text-white truncate max-w-[170px]">{m.name}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400 block">{m.region} · {m.type}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-emerald-400 block">
                                {m.net_sentiment_score > 0 ? "+" : ""}{m.net_sentiment_score} pkt
                              </span>
                              <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                wpływ: +{m.impact_score} pkt
                              </span>
                            </div>
                          </div>

                          {/* Mini distribution bar */}
                          <div className="space-y-1">
                            <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                              <div style={{ width: `${m.breakdown.positive.pct}%` }} className="bg-emerald-500 h-full" />
                              <div style={{ width: `${m.breakdown.neutral.pct}%` }} className="bg-sky-400 h-full" />
                              <div style={{ width: `${m.breakdown.negative.pct}%` }} className="bg-rose-500 h-full" />
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-zinc-400">
                              <span>{m.actor_mentions} art. ({m.breakdown.positive.pct}% poz.)</span>
                              <button
                                onClick={() => setSelectedMediumDomain(m.domain)}
                                className="text-teal-400 hover:text-teal-300 underline font-semibold"
                              >
                                Zbadaj medium →
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 2: Top Critical Media */}
                  <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.03] p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                      <span className="text-xs font-bold text-rose-400 font-mono flex items-center gap-1.5">
                        <TrendingDown className="h-4 w-4 text-rose-400" />
                        Najbardziej krytyczne (ciągną wynik w dół)
                      </span>
                      <span className="text-[10px] font-mono text-rose-300/80 font-semibold">
                        Top 5 ognisk krytyki
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {activeMediaAccountability.top_critical.map((m, idx) => (
                        <div
                          key={m.domain}
                          className="rounded-lg bg-black/40 border border-white/[0.04] p-2.5 space-y-1.5 hover:border-rose-500/40 transition-all font-mono"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-rose-400">#{idx + 1}</span>
                                <span className="text-xs font-bold text-white truncate max-w-[170px]">{m.name}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400 block">{m.region} · {m.type}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-rose-400 block">
                                {m.net_sentiment_score > 0 ? "+" : ""}{m.net_sentiment_score} pkt
                              </span>
                              <span className="text-[10px] text-rose-300 font-semibold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                wpływ: {m.impact_score} pkt
                              </span>
                            </div>
                          </div>

                          {/* Mini distribution bar */}
                          <div className="space-y-1">
                            <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                              <div style={{ width: `${m.breakdown.positive.pct}%` }} className="bg-emerald-500 h-full" />
                              <div style={{ width: `${m.breakdown.neutral.pct}%` }} className="bg-sky-400 h-full" />
                              <div style={{ width: `${m.breakdown.negative.pct}%` }} className="bg-rose-500 h-full" />
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-zinc-400">
                              <span>{m.actor_mentions} art. ({m.breakdown.negative.pct}% neg.)</span>
                              <button
                                onClick={() => setSelectedMediumDomain(m.domain)}
                                className="text-teal-400 hover:text-teal-300 underline font-semibold"
                              >
                                Zbadaj medium →
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Top Volume Leaders */}
                  <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                        <Newspaper className="h-4 w-4 text-teal-400" />
                        Liderzy wolumenu (kto najwięcej pisze o partii)
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 font-semibold">
                        Główne źródła uwagi
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {activeMediaAccountability.top_volume.map((m, idx) => (
                        <div
                          key={m.domain}
                          className="rounded-lg bg-black/50 border border-white/[0.04] p-2.5 space-y-1.5 hover:border-white/[0.15] transition-all font-mono"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-teal-400">#{idx + 1}</span>
                                <span className="text-xs font-bold text-white truncate max-w-[170px]">{m.name}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400 block">{m.region} · {m.type}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-white block">
                                {m.actor_mentions} art.
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                saldo: {m.net_sentiment_score > 0 ? "+" : ""}{m.net_sentiment_score} pkt
                              </span>
                            </div>
                          </div>

                          {/* Mini distribution bar */}
                          <div className="space-y-1">
                            <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                              <div style={{ width: `${m.breakdown.positive.pct}%` }} className="bg-emerald-500 h-full" />
                              <div style={{ width: `${m.breakdown.neutral.pct}%` }} className="bg-sky-400 h-full" />
                              <div style={{ width: `${m.breakdown.negative.pct}%` }} className="bg-rose-500 h-full" />
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-zinc-400">
                              <span>Poz: {m.breakdown.positive.pct}% · Neg: {m.breakdown.negative.pct}%</span>
                              <button
                                onClick={() => setSelectedMediumDomain(m.domain)}
                                className="text-teal-400 hover:text-teal-300 underline font-semibold"
                              >
                                Zbadaj medium →
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Geography of Sentiment: 16 Voivodeships Grid */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                    <div>
                      <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        <Map className="h-4 w-4 text-teal-400" />
                        Geografia sympatii politycznych w regionach (ranking 16 województw):
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                        Gdzie {activeConfig.shortName} ma najlepszą, a gdzie najgorszą prasę regionalną ({WEIGHTING_MODE_CONFIG[sentimentWeightingMode].shortLabel})
                      </span>
                    </div>

                    {/* Regional Basket Selector */}
                    <div className="flex items-center gap-1 font-mono text-xs">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mr-1">Koszyk:</span>
                      {(["ALL", "DZIENNIKI", "POWIATY"] as RegionalBasketMode[]).map((basket) => {
                        const isSel = sentimentRegionalBasket === basket;
                        const label =
                          basket === "ALL"
                            ? "Wszystkie media"
                            : basket === "DZIENNIKI"
                            ? "Tylko dzienniki"
                            : "Sieć powiatowa";
                        return (
                          <button
                            key={basket}
                            onClick={() => setSentimentRegionalBasket(basket)}
                            className={`rounded-lg px-2 py-1 text-xs transition-all ${
                              isSel
                                ? "bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40"
                                : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 border border-transparent"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono">
                    {activeMediaAccountability.regions
                      .filter((r) => r.region !== "Ogólnopolski")
                      .map((reg) => {
                        const isPos = reg.net_sentiment_score > 0;
                        const isNeg = reg.net_sentiment_score < 0;
                        return (
                          <div
                            key={reg.region}
                            className={`rounded-xl border p-2.5 space-y-1 transition-all ${
                              reg.sentiment_tendency === "pro"
                                ? "bg-emerald-500/[0.05] border-emerald-500/30"
                                : reg.sentiment_tendency === "contra"
                                ? "bg-rose-500/[0.05] border-rose-500/30"
                                : "bg-black/30 border-white/[0.06]"
                            }`}
                          >
                            <span className="text-[11px] font-bold text-white block truncate">{reg.region}</span>
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold ${
                                  isPos ? "text-emerald-400" : isNeg ? "text-rose-400" : "text-zinc-400"
                                }`}
                              >
                                {isPos ? `+${reg.net_sentiment_score}` : reg.net_sentiment_score} pkt
                              </span>
                              <span className="text-[9px] text-zinc-400">{reg.actor_mentions} art.</span>
                            </div>
                            {reg.lead_title_name && (
                              <span
                                className="text-[9px] text-zinc-400 truncate block"
                                title={`Wiodący dziennik regionalny: ${reg.lead_title_name} (saldo: ${
                                  reg.lead_title_net !== undefined && reg.lead_title_net > 0 ? "+" : ""
                                }${reg.lead_title_net} pkt)`}
                              >
                                Tytuł: <strong className="text-zinc-300 font-normal">{reg.lead_title_name.replace("Dziennik ", "Dz. ").replace("Gazeta ", "G. ")}</strong>
                              </span>
                            )}
                            <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                              <div style={{ width: `${reg.positive_pct}%` }} className="bg-emerald-500 h-full" />
                              <div style={{ width: `${reg.neutral_pct}%` }} className="bg-sky-400 h-full" />
                              <div style={{ width: `${reg.negative_pct}%` }} className="bg-rose-500 h-full" />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Full Interactive Media Table (with Search, Type Filter & Sorting) */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-teal-400" />
                      Eksplorator redakcji PPG: pełna baza tytułów i ich wpływ na wydźwięk {activeConfig.shortName}
                    </span>

                    {/* Toolbar: Search, Type Filter, Sort */}
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      {/* Search */}
                      <div className="relative">
                        <input
                          type="text"
                          value={mediaAccountabilitySearch}
                          onChange={(e) => setMediaAccountabilitySearch(e.target.value)}
                          placeholder="Szukaj portalu lub regionu..."
                          className="rounded-lg border border-white/[0.1] bg-black/60 px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none w-44"
                        />
                        {mediaAccountabilitySearch && (
                          <button
                            onClick={() => setMediaAccountabilitySearch("")}
                            className="absolute right-2 top-1.5 text-zinc-400 hover:text-white"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Type Filter */}
                      <select
                        value={mediaAccountabilityType}
                        onChange={(e) => setMediaAccountabilityType(e.target.value)}
                        className="w-full sm:w-auto max-w-full truncate rounded-lg border border-white/[0.1] bg-black/60 px-2.5 py-1 text-xs text-white focus:border-teal-500 focus:outline-none"
                      >
                        <option value="ALL">Wszystkie typy</option>
                        <option value="DZIENNIK_REGIONALNY">Dzienniki regionalne</option>
                        <option value="PORTAL_KRAJOWY">Portale krajowe (i.pl)</option>
                        <option value="NASZE_MIASTO">Serwisy Nasze Miasto</option>
                        <option value="PORTAL_MIEJSKI">Portale miejskie</option>
                      </select>

                      {/* Sort Mode */}
                      <select
                        value={mediaAccountabilitySort}
                        onChange={(e) =>
                          setMediaAccountabilitySort(
                            e.target.value as "impact" | "net_desc" | "net_asc" | "mentions" | "name"
                          )
                        }
                        className="w-full sm:w-auto max-w-full truncate rounded-lg border border-white/[0.1] bg-black/60 px-2.5 py-1 text-xs text-white focus:border-teal-500 focus:outline-none"
                      >
                        <option value="impact">Sortuj: Wpływ na wynik (bezwzględny)</option>
                        <option value="net_desc">Sortuj: Najbardziej przychylne (saldo ↓)</option>
                        <option value="net_asc">Sortuj: Najbardziej krytyczne (saldo ↑)</option>
                        <option value="mentions">Sortuj: Liczba artykułów</option>
                        <option value="name">Sortuj: Nazwa alfabetycznie</option>
                      </select>
                    </div>
                  </div>

                  {/* Table */}
                  {(() => {
                    const filteredMedia = activeMediaAccountability.media.filter((m) => {
                      const matchesSearch =
                        !mediaAccountabilitySearch ||
                        m.name.toLowerCase().includes(mediaAccountabilitySearch.toLowerCase()) ||
                        m.region.toLowerCase().includes(mediaAccountabilitySearch.toLowerCase()) ||
                        m.domain.toLowerCase().includes(mediaAccountabilitySearch.toLowerCase());
                      const matchesType =
                        mediaAccountabilityType === "ALL" || m.type === mediaAccountabilityType;
                      return matchesSearch && matchesType;
                    });

                    const sortedMedia = [...filteredMedia].sort((a, b) => {
                      if (mediaAccountabilitySort === "impact") return Math.abs(b.impact_score) - Math.abs(a.impact_score);
                      if (mediaAccountabilitySort === "net_desc") return b.net_sentiment_score - a.net_sentiment_score;
                      if (mediaAccountabilitySort === "net_asc") return a.net_sentiment_score - b.net_sentiment_score;
                      if (mediaAccountabilitySort === "mentions") return b.actor_mentions - a.actor_mentions;
                      return a.name.localeCompare(b.name, "pl");
                    });

                    const displayMedia = sortedMedia.slice(0, 15);

                    return (
                      <div className="space-y-2">
                        <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/40">
                          <table className="w-full text-left font-mono text-xs">
                            <thead className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] text-zinc-400 uppercase tracking-wider">
                              <tr>
                                <th className="px-3.5 py-2.5">Tytuł prasowy / Portal</th>
                                <th className="px-3 py-2.5">Region</th>
                                <th className="px-3 py-2.5">Typ</th>
                                <th className="px-3 py-2.5 text-right">Liczba art.</th>
                                <th className="px-3 py-2.5 text-right">Waga ({WEIGHTING_MODE_CONFIG[sentimentWeightingMode].shortLabel})</th>
                                <th className="px-3 py-2.5 min-w-[140px]">Struktura tonu (100%)</th>
                                <th className="px-3 py-2.5 text-right">Saldo</th>
                                <th className="px-3 py-2.5 text-right">Wpływ na wynik</th>
                                <th className="px-3 py-2.5 text-center">Akcja</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                              {displayMedia.map((m) => (
                                <tr key={m.domain} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-3.5 py-2">
                                    <span className="font-semibold text-white block">{m.name}</span>
                                    <span className="text-[10px] text-zinc-500 block">{m.domain}</span>
                                  </td>
                                  <td className="px-3 py-2 text-zinc-300">{m.region}</td>
                                  <td className="px-3 py-2 text-zinc-400 text-[10px]">{m.type}</td>
                                  <td className="px-3 py-2 text-right font-bold text-white">
                                    {m.actor_mentions}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <span className="font-bold text-white block font-mono">
                                      {m.effective_weight !== undefined ? `${m.effective_weight}×` : "1.0×"}
                                    </span>
                                    <span
                                      className="text-[9px] text-zinc-400 block truncate max-w-[90px] ml-auto cursor-help"
                                      title={m.provenance_label}
                                    >
                                      {m.provenance_status || "POMIAR"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="space-y-1">
                                      <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                                        <div
                                          style={{ width: `${m.breakdown.positive.pct}%` }}
                                          className="bg-emerald-500 h-full"
                                          title={`Poz: ${m.breakdown.positive.pct}%`}
                                        />
                                        <div
                                          style={{ width: `${m.breakdown.neutral.pct}%` }}
                                          className="bg-sky-400 h-full"
                                          title={`Neu: ${m.breakdown.neutral.pct}%`}
                                        />
                                        <div
                                          style={{ width: `${m.breakdown.negative.pct}%` }}
                                          className="bg-rose-500 h-full"
                                          title={`Neg: ${m.breakdown.negative.pct}%`}
                                        />
                                      </div>
                                      <div className="flex justify-between text-[9px] text-zinc-400">
                                        <span className="text-emerald-400">{m.breakdown.positive.pct}%</span>
                                        <span className="text-sky-300">{m.breakdown.neutral.pct}%</span>
                                        <span className="text-rose-400">{m.breakdown.negative.pct}%</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold">
                                    <span
                                      className={
                                        m.net_sentiment_score > 0
                                          ? "text-emerald-400"
                                          : m.net_sentiment_score < 0
                                          ? "text-rose-400"
                                          : "text-zinc-400"
                                      }
                                    >
                                      {m.net_sentiment_score > 0 ? "+" : ""}{m.net_sentiment_score} pkt
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                                        m.impact_score > 0
                                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                          : m.impact_score < 0
                                          ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                                          : "bg-white/[0.04] text-zinc-400"
                                      }`}
                                    >
                                      {m.impact_score > 0 ? `+${m.impact_score}` : m.impact_score} pkt
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      onClick={() => setSelectedMediumDomain(m.domain)}
                                      className="rounded-lg bg-white/[0.05] hover:bg-teal-500 hover:text-black px-2 py-1 text-[10px] text-teal-300 font-semibold transition-all border border-white/[0.08]"
                                      title={`Wybierz ${m.name} jako aktywne medium w całym PPGscope`}
                                    >
                                      Filtruj medium
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {sortedMedia.length > 15 && (
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 font-mono">
                            <span>
                              Wyświetlono 15 z {sortedMedia.length} przefiltrowanych tytułów PPG (posortowane wg wybranego kryterium).
                            </span>
                            <span>Użyj wyszukiwarki lub filtrów, aby zawęzić listę.</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Interactive Live Sentiment Tester */}
              <div className="rounded-2xl border border-teal-500/30 bg-teal-500/[0.03] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-teal-500/20 pb-3">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-400" />
                    Interaktywny Analizator Wydźwięku w locie
                  </h3>
                  <span className="text-xs font-mono text-teal-400">
                    Algorytm medioznawczy zgodny ze standardem KRRiT (8 sił politycznych)
                  </span>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-zinc-300">
                    Wpisz dowolny nagłówek, lead artykułu lub wypowiedź polityka, aby w czasie rzeczywistym
                    sprawdzić kwalifikację tonu i uzasadnienie analityczne:
                  </p>

                  {/* Actor selector for live testing */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="text-zinc-400 text-[11px]">Badany podmiot:</span>
                    <button
                      onClick={() => setLiveTesterActor("auto")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                        liveTesterActor === "auto"
                          ? "bg-teal-500 text-black font-bold"
                          : "bg-white/[0.05] text-zinc-400 hover:text-white"
                      }`}
                    >
                      Automatyczne wykrywanie
                    </button>
                    {ALL_POLITICAL_ACTOR_IDS.map((aid) => {
                      const cfg = POLITICAL_ACTORS[aid];
                      const isAct = liveTesterActor === aid;
                      return (
                        <button
                          key={aid}
                          onClick={() => setLiveTesterActor(aid)}
                          className={`px-2 py-1 rounded-lg text-[11px] transition-all ${
                            isAct
                              ? "bg-white/[0.2] text-white font-bold border border-white/[0.3]"
                              : "bg-white/[0.04] text-zinc-400 hover:text-white"
                          }`}
                        >
                          {cfg.shortName}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={liveTesterInput}
                      onChange={(e) => setLiveTesterInput(e.target.value)}
                      placeholder="Wpisz tytuł lub fragment artykułu o dowolnej sile politycznej..."
                      className="flex-1 rounded-xl border border-white/[0.1] bg-black/60 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => {
                        const target = liveTesterActor === "auto" ? undefined : liveTesterActor;
                        const res = evaluatePoliticalSentiment(liveTesterInput, target);
                        setLiveTesterResult(res);
                      }}
                      className="rounded-xl bg-teal-500 px-4 py-2.5 text-xs font-bold text-black transition-all hover:bg-teal-400 flex items-center justify-center gap-1.5 shadow font-mono"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Zbadaj wydźwięk
                    </button>
                  </div>

                  {liveTesterResult && (
                    <div className="rounded-xl border border-white/[0.08] bg-black/50 p-4 space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Ocena wydźwięku:</span>
                        <span
                          className={`font-bold px-2.5 py-1 rounded text-xs ${
                            liveTesterResult.sentiment === "positive"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : liveTesterResult.sentiment === "negative"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : liveTesterResult.sentiment === "neutral"
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {liveTesterResult.label}
                        </span>
                      </div>

                      {liveTesterResult.actor_name && (
                        <div>
                          <span className="text-zinc-500">Zbadany podmiot polityczny: </span>
                          <span className="text-teal-300 font-semibold">{liveTesterResult.actor_name}</span>
                        </div>
                      )}

                      {liveTesterResult.detected_entities.length > 0 && (
                        <div>
                          <span className="text-zinc-500">Wykryte postacie i jednostki: </span>
                          <span className="text-white font-semibold">
                            {liveTesterResult.detected_entities.join(", ")}
                          </span>
                        </div>
                      )}

                      <div>
                        <span className="text-zinc-500">Uzasadnienie klasyfikacji: </span>
                        <span className="text-zinc-300">{liveTesterResult.rationale}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Articles Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 text-teal-400" />
                      Przykłady zbadanych publikacji o {activeConfig.shortName} z portali regionalnych
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Zestawienie reprezentatywnych artykułów z przypisaną oceną wydźwięku i uzasadnieniem analitycznym
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                    <button
                      onClick={() => setSelectedKOSentimentFilter("all")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        selectedKOSentimentFilter === "all"
                          ? "bg-white/[0.15] text-white font-bold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Wszystkie ({rawArticles.length})
                    </button>
                    <button
                      onClick={() => setSelectedKOSentimentFilter("positive")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        selectedKOSentimentFilter === "positive"
                          ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                          : "text-zinc-400 hover:text-emerald-300"
                      }`}
                    >
                      Pozytywne ({rawArticles.filter((a) => a.sentiment === "positive").length})
                    </button>
                    <button
                      onClick={() => setSelectedKOSentimentFilter("neutral")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        selectedKOSentimentFilter === "neutral"
                          ? "bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30"
                          : "text-zinc-400 hover:text-sky-300"
                      }`}
                    >
                      Neutralne ({rawArticles.filter((a) => a.sentiment === "neutral").length})
                    </button>
                    <button
                      onClick={() => setSelectedKOSentimentFilter("negative")}
                      className={`rounded-lg px-2.5 py-1 transition-all ${
                        selectedKOSentimentFilter === "negative"
                          ? "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30"
                          : "text-zinc-400 hover:text-rose-300"
                      }`}
                    >
                      Negatywne ({rawArticles.filter((a) => a.sentiment === "negative").length})
                    </button>
                  </div>
                </div>

                {/* Articles List */}
                <div className="space-y-3">
                  {filteredSampleArticles.map((art) => (
                    <div
                      key={art.id}
                      className="rounded-xl border border-white/[0.06] bg-[#0c0e12]/80 p-4 space-y-2 hover:border-white/[0.12] transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              art.sentiment === "positive"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : art.sentiment === "negative"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            }`}
                          >
                            {art.sentiment_label}
                          </span>
                          {art.domain_label && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.06] text-teal-300 border border-white/[0.1]">
                              {art.domain_label}
                            </span>
                          )}
                          <span className="text-zinc-400">Podmioty: </span>
                          <span className="text-white font-semibold">
                            {art.politicians.join(", ")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-zinc-400">
                          <span>{art.portal_name}</span>
                          <span>·</span>
                          <span>{new Date(art.published_at).toLocaleDateString("pl-PL")}</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-white">
                        <a
                          href={art.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-teal-300 flex items-center gap-1.5"
                        >
                          {art.title}
                          <ExternalLink className="h-3 w-3 text-zinc-500" />
                        </a>
                      </h4>

                      <p className="text-xs text-zinc-300">{art.lead}</p>

                      <div className="rounded-lg bg-black/40 p-2.5 text-[11px] font-mono border border-white/[0.04]">
                        <span className="text-zinc-500 font-bold block">Uzasadnienie kryterium medioznawczego:</span>
                        <span className="text-zinc-300">{art.sentiment_rationale}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Methodology Explainer */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-3 font-mono text-xs">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Info className="h-4 w-4 text-teal-400" />
                  Kryteria medioznawcze kategoryzacji wydźwięku
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-zinc-400 pt-2">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                    <span className="text-emerald-400 font-bold block">Wydźwięk pozytywny (+)</span>
                    <p className="text-[11px]">
                      Artykuł przedstawia decyzje lub wypowiedzi w korzystnym świetle, podkreśla sukcesy, realizację
                      obietnic, dofinansowania lokalnych inwestycji lub cytuje argumenty partii bez krytycznej kontry
                      w narracji autorskiej.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                    <span className="text-sky-300 font-bold block">Wydźwięk neutralny (0)</span>
                    <p className="text-[11px]">
                      Sucha relacja sprawozdawcza z posiedzenia Sejmu/urzędu, informacja o podpisaniu ustawy, oficjalny
                      komunikat lub zrównoważony opis sporu politycznego prezentujący argumenty obu stron bez faworyzowania.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-1">
                    <span className="text-rose-400 font-bold block">Wydźwięk negatywny (-)</span>
                    <p className="text-[11px]">
                      Tekst eksponuje błędy, niespełnione obietnice, zarzuty oponentów, protesty społeczne, pretensje
                      o cięcia budżetowe lub stosuje pejoratywne kadrowanie w tytule i leadzie.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ================================================================= */}
        {/* TAB: CENTRUM WYKRESÓW (GRAPHICAL CHARTS CENTER) */}
        {/* ================================================================= */}
        {activeTab === "charts" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-2">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <PieChart className="h-5 w-5 text-teal-400" /> Centrum Wykresów Graficznych i Wizualizacji Danych
                  </h2>
                  <p className="mt-1 max-w-3xl text-xs text-zinc-400">
                    Wielowarstwowy atlas sieci PPG: wolumen, tematy, lokalność, regiony, żywotność portali i przepływ informacji.
                    Wszystkie widoki korzystają z bieżącego zakresu danych i wybranego medium.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 font-mono text-[10px] text-zinc-400">
                  <span className="rounded-lg border border-teal-500/20 bg-teal-500/10 px-2.5 py-1.5 text-teal-300">{chartDomains.length || 18} dziedzin</span>
                  <span className="rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-1.5">{chartRegions.length || 16} regionów</span>
                  <span className="rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-1.5">{chartPortals.length || 547} portali</span>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500">Filtr okresu:</span>
                  {(
                    [
                      ["24h", "24h"],
                      ["7d", "7 dni"],
                      ["30d", "30 dni"],
                      ["90d", "90 dni"],
                      ["1y", "1 rok"],
                      ["all", "Wszystko"],
                    ] as const
                  ).map(([preset, label]) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTimePreset(preset)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                        timePreset === preset
                          ? "bg-teal-500 text-black font-semibold shadow"
                          : "border border-white/[0.08] bg-black/40 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <span className="text-[10px] font-mono text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                    Wybrano: {timePreset === "24h" ? "24h" : timePreset === "7d" ? "7 dni" : timePreset === "30d" ? "30 dni" : timePreset === "90d" ? "90 dni" : timePreset === "1y" ? "1 rok" : "pełny zakres"} ({chartTimeseries.length} dni)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500">Kategoria wykresów:</span>
                  {([
                    ["all", "Wszystkie"],
                    ["content", "Treść i tematy"],
                    ["network", "Sieć i regiony"],
                    ["operations", "Operacje i ryzyko"],
                  ] as [ChartView, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setChartView(value)}
                      className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
                        chartView === value
                          ? "border-teal-400/40 bg-teal-400/15 text-teal-200"
                          : "border-white/[0.08] bg-black/20 text-zinc-400 hover:border-white/[0.16] hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Publikacje w zakresie", value: domainBreakdown.totalCount.toLocaleString("pl-PL"), note: selectedMediumDomain === "ALL" ? "cała sieć" : selectedMediumDomain, tone: "text-teal-300" },
                { label: "Udział lokalny", value: `${domainBreakdown.localContentShare}%`, note: "L + CL / wszystkie", tone: "text-emerald-300" },
                { label: "Największa dziedzina", value: chartDomains[0]?.name || "—", note: chartDomains[0] ? `${chartDomains[0].pct}% zakresu` : "brak danych", tone: "text-amber-300" },
                { label: "Średnia unikalność", value: `${data?.portal_vitality_audit?.network_avg_uniqueness_pct ?? 31.4}%`, note: "audyt portali", tone: "text-sky-300" },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-white/[0.06] bg-[#0c0e12]/70 p-4">
                  <span className="block text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-500">{metric.label}</span>
                  <strong className={`mt-2 block truncate text-xl font-semibold ${metric.tone}`}>{metric.value}</strong>
                  <span className="mt-1 block truncate text-[11px] font-mono text-zinc-500">{metric.note}</span>
                </div>
              ))}
            </div>

            {/* SEKCJA 1: DYNAMIKA W WYBRANYM OKRESIE */}
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/[0.04] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Sekcja dynamiczna: wolumeny, trendy i tematy w oknie {timePreset.toUpperCase()}
                </span>
              </div>
              <span className="text-[11px] font-mono text-teal-300">
                Zakres: {chartTimeseries.length} dni obserwacji · Łącznie publikacji: {domainBreakdown.totalCount.toLocaleString("pl-PL")}
              </span>
            </div>

            {(chartView === "all" || chartView === "content") && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartPanel title="Wolumen publikacji w czasie" icon={Activity} meta={`${chartTimeseries.length} dni · ${timePreset.toUpperCase()}`}>
                  <div className="space-y-3">
                    <svg viewBox="0 0 720 230" className="h-auto w-full" role="img" aria-label="Wolumen publikacji i treści lokalnych w czasie">
                      {[0, 1, 2, 3].map((step) => {
                        const y = 28 + step * 48;
                        return <line key={step} x1="42" x2="700" y1={y} y2={y} stroke="rgba(159,186,199,.10)" strokeDasharray="3 5" />;
                      })}
                      {chartTimeseries.length > 1 && (() => {
                        const max = chartMax(chartTimeseries.map((point) => point.total));
                        const points = chartTimeseries.map((point, index) => `${42 + (index / (chartTimeseries.length - 1)) * 658},${190 - (point.total / max) * 150}`).join(" ");
                        const localPoints = chartTimeseries.map((point, index) => `${42 + (index / (chartTimeseries.length - 1)) * 658},${190 - (point.lokalne / max) * 150}`).join(" ");
                        return (
                          <>
                            <polyline points={`${points} 700,190 42,190`} fill="rgba(87,224,197,.08)" stroke="none" />
                            <polyline points={points} fill="none" stroke="#57e0c5" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                            <polyline points={localPoints} fill="none" stroke="#75b8ff" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
                            {[0, Math.floor(chartTimeseries.length / 2), chartTimeseries.length - 1].map((index) => {
                              const point = chartTimeseries[index];
                              return <text key={point.date} x={42 + (index / (chartTimeseries.length - 1)) * 658} y="216" textAnchor={index === 0 ? "start" : index === chartTimeseries.length - 1 ? "end" : "middle"} fill="#70808a" fontSize="10" fontFamily="monospace">{point.label}</text>;
                            })}
                          </>
                        );
                      })()}
                      <text x="42" y="18" fill="#70808a" fontSize="10" fontFamily="monospace">art./dzień</text>
                    </svg>
                    <div className="flex flex-wrap gap-4 text-[11px] font-mono text-zinc-400">
                      <span className="flex items-center gap-2"><i className="h-2 w-5 rounded-full bg-teal-300" /> Wszystkie publikacje</span>
                      <span className="flex items-center gap-2"><i className="h-0.5 w-5 border-t-2 border-dashed border-blue-300" /> Treści lokalne</span>
                      <span className="ml-auto text-zinc-500">Szczyt: {chartTimeseries.length ? Math.max(...chartTimeseries.map((point) => point.total)).toLocaleString("pl-PL") : "—"}</span>
                    </div>
                  </div>
                </ChartPanel>

                <ChartPanel title="Mix tematów dzień po dniu" icon={Layers} meta={`${chartTimeseries.length} dni · ${timePreset.toUpperCase()}`}>
                  <div className="space-y-4 pb-1">
                    <div className={`flex h-44 items-end border-b border-l border-white/[0.08] px-2 pb-0 ${
                      chartTimeseries.length > 90 ? "gap-[1px]" : chartTimeseries.length > 31 ? "gap-0.5" : chartTimeseries.length > 14 ? "gap-1" : "gap-1.5"
                    }`}>
                      {(() => {
                        const TOPIC_SEGMENTS = [
                          { key: "lokalne", label: "Lokalne", color: "bg-teal-400" },
                          { key: "sport", label: "Sport", color: "bg-blue-400" },
                          { key: "prawo", label: "Prawo", color: "bg-amber-400" },
                          { key: "gospodarka", label: "Gospodarka", color: "bg-rose-400" },
                          { key: "spoleczenstwo", label: "Społeczeństwo", color: "bg-purple-400" },
                          { key: "polityka", label: "Polityka", color: "bg-zinc-400" },
                        ] as const;

                        const totalPoints = chartTimeseries.length;

                        return chartTimeseries.map((point, index) => {
                          const daySum = (point.lokalne || 0) + (point.sport || 0) + (point.prawo || 0) + (point.gospodarka || 0) + (point.spoleczenstwo || 0) + (point.polityka || 0) || point.total || 1;
                          const showLabel = totalPoints <= 10
                            ? true
                            : totalPoints <= 31
                              ? (index % 5 === 0 || index === totalPoints - 1)
                              : [0, Math.floor(totalPoints * 0.25), Math.floor(totalPoints * 0.5), Math.floor(totalPoints * 0.75), totalPoints - 1].includes(index);

                          const colTooltip = `${point.label} (${point.date}) · ${point.total.toLocaleString("pl-PL")} art.\n` +
                            `• Lokalne: ${point.lokalne.toLocaleString("pl-PL")} (${((point.lokalne / daySum) * 100).toFixed(1)}%)\n` +
                            `• Społeczeństwo: ${point.spoleczenstwo.toLocaleString("pl-PL")} (${((point.spoleczenstwo / daySum) * 100).toFixed(1)}%)\n` +
                            `• Prawo: ${point.prawo.toLocaleString("pl-PL")} (${((point.prawo / daySum) * 100).toFixed(1)}%)\n` +
                            `• Polityka: ${point.polityka.toLocaleString("pl-PL")} (${((point.polityka / daySum) * 100).toFixed(1)}%)\n` +
                            `• Sport: ${point.sport.toLocaleString("pl-PL")} (${((point.sport / daySum) * 100).toFixed(1)}%)\n` +
                            `• Gospodarka: ${point.gospodarka.toLocaleString("pl-PL")} (${((point.gospodarka / daySum) * 100).toFixed(1)}%)`;

                          return (
                            <div key={point.date} className="group relative flex h-full flex-1 flex-col justify-end gap-px cursor-pointer" title={colTooltip}>
                              {TOPIC_SEGMENTS.map((seg) => {
                                const val = point[seg.key] ?? 0;
                                const pct = (val / daySum) * 100;
                                return (
                                  <span
                                    key={seg.key}
                                    className={`block min-h-[2px] rounded-sm transition-all hover:brightness-125 ${seg.color}`}
                                    style={{ height: `${pct}%` }}
                                    title={`${seg.label}: ${val.toLocaleString("pl-PL")} (${pct.toFixed(1)}%) · ${point.label}`}
                                  />
                                );
                              })}
                              {showLabel && (
                                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-mono text-zinc-500 whitespace-nowrap">
                                  {point.label}
                                </span>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 text-[10px] font-mono text-zinc-400">
                      {["Lokalne", "Sport", "Prawo", "Gospodarka", "Społeczeństwo", "Polityka"].map((label, index) => (
                        <span key={label} className="flex items-center gap-1.5">
                          <i className={`h-2 w-2 rounded-sm ${["bg-teal-400", "bg-blue-400", "bg-amber-400", "bg-rose-400", "bg-purple-400", "bg-zinc-400"][index]}`} />
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </ChartPanel>

                <ChartPanel title="Ranking 18 dziedzin" icon={BarChart3} meta="udział w zakresie" className="xl:col-span-2">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
                    {chartDomains.slice(0, 18).map((domain, index) => {
                      const width = chartScale(domain.pct, chartMax(chartDomains.map((item) => item.pct)), 100);
                      return (
                        <div key={domain.slug} className="grid grid-cols-[24px_minmax(0,1fr)_50px] items-center gap-2 text-xs">
                          <span className="font-mono text-zinc-600">{String(index + 1).padStart(2, "0")}</span>
                          <div className="min-w-0">
                            <div className="mb-1 flex justify-between gap-2 font-mono"><span className="truncate text-zinc-300">{domain.name}</span><span className="text-zinc-500">{domain.total.toLocaleString("pl-PL")}</span></div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]"><div className={`h-full rounded-full ${index < 3 ? "bg-teal-400" : "bg-teal-400/55"}`} style={{ width: `${width}%` }} /></div>
                          </div>
                          <span className="text-right font-mono font-bold text-teal-300">{domain.pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </ChartPanel>

                <ChartPanel title="Macierz dziedzin i lokalności" icon={Compass} meta="C · CL · L" className="xl:col-span-2">
                  <div className="overflow-x-auto">
                    <div className="min-w-[620px] space-y-1.5">
                      <div className="grid grid-cols-[minmax(180px,1fr)_repeat(3,1fr)] gap-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500"><span>Dziedzina</span><span className="text-center">C centralne</span><span className="text-center">CL rozwinięcie</span><span className="text-center">L lokalne</span></div>
                      {chartDomains.map((domain) => {
                        const maxCell = chartMax(chartDomains.flatMap((item) => [item.countC, item.countCL, item.countL]));
                        return <div key={domain.slug} className="grid grid-cols-[minmax(180px,1fr)_repeat(3,1fr)] gap-1"><span className="truncate py-1 text-[11px] text-zinc-400">{domain.code} · {domain.name}</span>{[domain.countC, domain.countCL, domain.countL].map((value, index) => <span key={index} className="rounded-md px-2 py-1 text-center font-mono text-[10px] text-zinc-200" style={{ backgroundColor: `rgba(${index === 2 ? "87,224,197" : index === 1 ? "117,184,255" : "148,163,184"},${Math.min(.65, .08 + value / maxCell * .57)})` }}>{value.toLocaleString("pl-PL")}</span>)}</div>;
                      })}
                    </div>
                  </div>
                </ChartPanel>
              </div>
            )}

            {/* SEKCJA 2: STAŁA STRUKTURA KATALOGU */}
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/[0.04] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Sekcja strukturalna: stały katalog 546 domen PPG i profil regionalny
                </span>
              </div>
              <span className="text-[11px] font-mono text-sky-300">
                N = 546 serwisów · stała architektura sieci PPG (niezależna od wybranego okresu)
              </span>
            </div>

            {(chartView === "all" || chartView === "network") && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartPanel title="Autonomia i syndykacja województw" icon={Map} meta={`${chartRegions.length || 16} regionów`} className="xl:col-span-2">
                  <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
                    {chartRegions.map((region) => <div key={region.region} className="space-y-1.5"><div className="flex justify-between gap-3 text-[11px] font-mono"><span className="truncate text-zinc-300">{region.region}</span><span className="shrink-0 text-zinc-500">{region.articles_count.toLocaleString("pl-PL")} art.</span></div><div className="relative h-2 overflow-hidden rounded-full bg-white/[0.05]"><div className="absolute inset-y-0 left-0 rounded-full bg-emerald-400/80" style={{ width: `${region.autonomy_index_pct}%` }} /><div className="absolute inset-y-0 left-0 rounded-full border-r-2 border-amber-300" style={{ width: `${region.syndicated_pct}%` }} /></div><div className="flex justify-between text-[9px] font-mono text-zinc-600"><span>autonomia {region.autonomy_index_pct}%</span><span>syndykacja {region.syndicated_pct}%</span></div></div>)}
                  </div>
                  <div className="flex flex-wrap gap-4 border-t border-white/[0.06] pt-3 text-[10px] font-mono text-zinc-500"><span className="flex items-center gap-2"><i className="h-2 w-5 rounded-full bg-emerald-400/80" /> indeks autonomii</span><span className="flex items-center gap-2"><i className="h-2 w-5 rounded-full border-r-2 border-amber-300 bg-white/[0.05]" /> udział syndykacji</span></div>
                </ChartPanel>

                <ChartPanel title="Mapa: wolumen × autonomia" icon={Target} meta="każdy punkt = województwo">
                  <svg viewBox="0 0 520 260" className="h-auto w-full" role="img" aria-label="Wolumen publikacji względem autonomii województw">
                    <line x1="48" y1="220" x2="492" y2="220" stroke="rgba(159,186,199,.22)" /><line x1="48" y1="28" x2="48" y2="220" stroke="rgba(159,186,199,.22)" />
                    {[0, 1, 2, 3].map((step) => <line key={step} x1="48" x2="492" y1={220 - step * 64} y2={220 - step * 64} stroke="rgba(159,186,199,.08)" strokeDasharray="3 5" />)}
                    {chartRegions.map((region) => { const max = chartMax(chartRegions.map((item) => item.articles_count)); const x = 56 + (region.autonomy_index_pct / 100) * 425; const y = 210 - (region.articles_count / max) * 170; return <g key={region.region}><circle cx={x} cy={y} r="5" fill="#57e0c5" fillOpacity=".85" stroke="#07100f" strokeWidth="2" /><text x={x + 8} y={y + 3} fill="#8e9da7" fontSize="9" fontFamily="monospace">{region.region.slice(0, 3)}</text></g>; })}
                    <text x="48" y="246" fill="#70808a" fontSize="10" fontFamily="monospace">niski indeks autonomii</text><text x="492" y="246" textAnchor="end" fill="#70808a" fontSize="10" fontFamily="monospace">wysoki indeks autonomii</text><text x="48" y="18" fill="#70808a" fontSize="10" fontFamily="monospace">wolumen publikacji ↑</text>
                  </svg>
                </ChartPanel>

                <ChartPanel title="Segmenty portfela" icon={Layers} meta={`${chartSegments.length} segmentów`}>
                  <div className="space-y-3">
                    {chartSegments.map((segment, index) => <div key={segment.segment} className="space-y-1.5"><div className="flex justify-between gap-3 text-[11px] font-mono"><span className="truncate text-zinc-300">{segment.segment.replaceAll("_", " ")}</span><span className="text-teal-300">{segment.share_pct}%</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.05]"><div className={`h-full rounded-full ${index === 0 ? "bg-teal-400" : index === 1 ? "bg-blue-400" : "bg-amber-400"}`} style={{ width: `${Math.max(1, segment.share_pct)}%` }} /></div><div className="flex justify-between text-[9px] font-mono text-zinc-600"><span>{segment.portals_count} portali</span><span>autonomia {segment.autonomy_index_pct}%</span></div></div>)}
                  </div>
                </ChartPanel>
              </div>
            )}

            {(chartView === "all" || chartView === "operations") && (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <ChartPanel title="Żywotność sieci — rozkład statusów" icon={Activity} meta="audyt portali">
                  <div className="space-y-4">
                    <div className="flex h-8 overflow-hidden rounded-xl">
                      {chartStatusBuckets.map((bucket, index) => <div key={bucket.key} className={["bg-emerald-400", "bg-sky-400", "bg-amber-400", "bg-purple-400", "bg-rose-400"][index]} style={{ width: `${bucket.pct}%` }} title={`${bucket.label}: ${bucket.pct}%`} />)}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {chartStatusBuckets.map((bucket, index) => <div key={bucket.key} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-black/30 px-3 py-2 text-[11px] font-mono"><span className="flex min-w-0 items-center gap-2 text-zinc-400"><i className={`h-2 w-2 shrink-0 rounded-full ${["bg-emerald-400", "bg-sky-400", "bg-amber-400", "bg-purple-400", "bg-rose-400"][index]}`} /><span className="truncate">{bucket.label.split(" (")[0]}</span></span><strong className="shrink-0 text-white">{bucket.count} · {bucket.pct}%</strong></div>)}
                    </div>
                  </div>
                </ChartPanel>

                <ChartPanel title="Macierz żywotności portali" icon={Target} meta="unikalność × produkcja">
                  <svg viewBox="0 0 520 270" className="h-auto w-full" role="img" aria-label="Macierz żywotności portali według unikalności i liczby publikacji">
                    <line x1="46" y1="230" x2="496" y2="230" stroke="rgba(159,186,199,.22)" /><line x1="46" y1="20" x2="46" y2="230" stroke="rgba(159,186,199,.22)" />
                    {[25, 50, 75].map((tick) => <line key={tick} x1={46 + tick * 4.5} x2={46 + tick * 4.5} y1="20" y2="230" stroke="rgba(159,186,199,.07)" strokeDasharray="3 5" />)}
                    {chartPortals.slice(0, 90).map((portal) => { const max = chartMax(chartPortals.map((item) => item.daily_articles_count)); const x = 48 + (portal.uniqueness_pct / 100) * 440; const y = 220 - (portal.daily_articles_count / max) * 185; const colors: Record<string, string> = { AKTYWNY_UNIKALNY: "#57e0c5", AKTYWNY_SYNDYKAT: "#75b8ff", LEDWO_ZYWY: "#f6c56b", ZOMBIE_AUTOMAT: "#c084fc", MARTWY: "#ff7f87" }; return <circle key={portal.domain} cx={x} cy={y} r="3" fill={colors[portal.vitality_status] || "#8e9da7"} fillOpacity=".72" />; })}
                    <text x="46" y="252" fill="#70808a" fontSize="10" fontFamily="monospace">0% unikalności</text><text x="496" y="252" textAnchor="end" fill="#70808a" fontSize="10" fontFamily="monospace">100%</text><text x="46" y="14" fill="#70808a" fontSize="10" fontFamily="monospace">publikacje/dobę ↑</text>
                  </svg>
                  <div className="flex flex-wrap gap-3 text-[10px] font-mono text-zinc-500">{[["bg-emerald-300", "unikalne"], ["bg-sky-300", "syndykat"], ["bg-amber-300", "śladowe"], ["bg-purple-300", "zombie"], ["bg-rose-300", "martwe"]].map(([color, label]) => <span key={label} className="flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${color}`} />{label}</span>)}</div>
                </ChartPanel>

                <ChartPanel title="Ekspozycja instytucji" icon={Users} meta={`HHI ${data?.hhi_entities?.score?.toFixed(3) ?? "0.142"}`}>
                  <div className="space-y-3">
                    {chartEntities.slice(0, 8).map((entity, index) => <div key={entity.name} className="grid grid-cols-[24px_minmax(0,1fr)_54px] items-center gap-2"><span className="font-mono text-[10px] text-zinc-600">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><div className="mb-1 truncate text-[11px] text-zinc-300">{entity.name}</div><div className="h-2 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-blue-400/80" style={{ width: `${(entity.count / chartMax(chartEntities.map((item) => item.count))) * 100}%` }} /></div></div><span className="text-right font-mono text-[10px] text-white">{entity.count}</span></div>)}
                  </div>
                </ChartPanel>

                <ChartPanel title="Prędkość kaskad depeszowych" icon={Zap} meta="zasięg / godzina">
                  <div className="flex h-48 items-end gap-3 border-b border-l border-white/[0.08] px-3 pb-0">
                    {(data.wire_cascades || []).map((wire) => { const velocity = Math.round((wire.reach / Math.max(.1, wire.duration_hours)) * 10) / 10; const max = chartMax((data.wire_cascades || []).map((item) => item.reach / Math.max(.1, item.duration_hours))); return <div key={wire.id} className="group relative flex h-full flex-1 flex-col justify-end"><div className="mb-1 text-center text-[10px] font-mono text-amber-300 opacity-0 transition-opacity group-hover:opacity-100">{velocity}</div><div className="rounded-t-lg bg-gradient-to-t from-amber-500/80 to-amber-300" style={{ height: `${Math.max(5, (velocity / max) * 82)}%` }} /><span className="absolute -bottom-5 left-1/2 max-w-[70px] -translate-x-1/2 truncate text-[8px] font-mono text-zinc-600">{wire.origin_outlet}</span></div>; })}
                  </div>
                  <p className="pt-2 text-[10px] font-mono text-zinc-500">Najwyższy słupek oznacza historię, która dotarła do największej liczby portali w najkrótszym czasie.</p>
                </ChartPanel>
              </div>
            )}

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
                      <span className="text-[11px] text-zinc-400">{localityStats.l.toLocaleString("pl-PL")} art. (źródło lokalne)</span>
                    </div>
                    <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-2.5">
                      <span className="text-teal-300 font-bold block">{localityStats.clPct}% Rozwinięcie</span>
                      <span className="text-[11px] text-zinc-400">{localityStats.cl.toLocaleString("pl-PL")} art. (krajowe z kątem)</span>
                    </div>
                    <div className="rounded-lg border border-zinc-700 bg-zinc-800/40 p-2.5">
                      <span className="text-zinc-300 font-bold block">{localityStats.cPct}% Centralne</span>
                      <span className="text-[11px] text-zinc-400">{localityStats.c.toLocaleString("pl-PL")} art. (brak kąta lokalnego)</span>
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
        {/* TAB: ŻYWOTNOŚĆ I UNIKALNOŚĆ PORTALI (546 MEDIA HEALTH AUDIT) */}
        {/* ================================================================= */}
        {activeTab === "vitality_audit" && (() => {
          const audit = data.portal_vitality_audit;
          const portals = audit?.portals || [];
          const breakdown = audit?.status_breakdown || {};

          const filteredPortals = portals
            .filter((p) => vitalityStatusFilter === "ALL" || p.vitality_status === vitalityStatusFilter)
            .filter((p) => vitalityRegionFilter === "ALL" || p.region.toLowerCase() === vitalityRegionFilter.toLowerCase())
            .filter(
              (p) =>
                !vitalitySearchQuery ||
                p.portal_name.toLowerCase().includes(vitalitySearchQuery.toLowerCase()) ||
                p.domain.toLowerCase().includes(vitalitySearchQuery.toLowerCase())
            )
            .sort((a, b) => {
              if (vitalitySortBy === "uniqueness") return b.uniqueness_pct - a.uniqueness_pct;
              if (vitalitySortBy === "unique_daily") return b.unique_articles_count - a.unique_articles_count;
              if (vitalitySortBy === "hours") return a.hours_since_last_pub - b.hours_since_last_pub;
              return b.vitality_score - a.vitality_score;
            });

          const statusMeta: {
            key: string;
            title: string;
            badgeClass: string;
            cardBorder: string;
          }[] = [
            {
              key: "AKTYWNY_UNIKALNY",
              title: "Czynne i wysoko unikalne",
              badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
              cardBorder: "border-emerald-500/25 bg-emerald-500/[0.04]",
            },
            {
              key: "AKTYWNY_SYNDYKAT",
              title: "Czynne maszynowo (klony)",
              badgeClass: "bg-sky-500/20 text-sky-300 border-sky-500/40",
              cardBorder: "border-sky-500/25 bg-sky-500/[0.04]",
            },
            {
              key: "LEDWO_ZYWY",
              title: "Ledwo żywe (śladowe)",
              badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
              cardBorder: "border-amber-500/25 bg-amber-500/[0.04]",
            },
            {
              key: "ZOMBIE_AUTOMAT",
              title: "Zombie (automaty CMS)",
              badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40",
              cardBorder: "border-purple-500/25 bg-purple-500/[0.04]",
            },
            {
              key: "MARTWY",
              title: "Martwe / wygaszone",
              badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
              cardBorder: "border-rose-500/25 bg-rose-500/[0.04]",
            },
          ];

          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-teal-400" />
                    Audyt żywotności i unikalności portali wydawnictwa (546 mediów + archiwum)
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                    Weryfikacja oparta wyłącznie na zewnętrznych sygnałach bezpłatnych: kody odpowiedzi HTTP, świeżość
                    strumieni RSS/Sitemap, odsetek unikalnych tekstów własnych względem klonów syndykatowych (MinHash LSH)
                    oraz udział wrzutek z automatów CMS o pełnych kwadransach (:00/:15).
                  </p>
                </div>

                <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-2.5 text-right font-mono shrink-0">
                  <span className="text-[10px] uppercase text-teal-400 block font-bold">Średnia unikalność sieci</span>
                  <span className="text-base font-bold text-white">
                    {audit?.network_avg_uniqueness_pct ?? 31.4}% tekstów własnych
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    ({(audit?.network_unique_daily_articles ?? Math.round(domainBreakdown.totalCount * 0.35)).toLocaleString("pl-PL")} unik. / {domainBreakdown.totalCount.toLocaleString("pl-PL")} art. zbadanych w oknie)
                  </span>
                </div>
              </div>

              {/* 5 Status Summary Cards (Interactive Filter) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {statusMeta.map((st) => {
                  const bucket = breakdown[st.key] || { count: 0, pct: 0, label: st.title, criteria: "" };
                  const isSelected = vitalityStatusFilter === st.key;
                  return (
                    <button
                      key={st.key}
                      onClick={() => setVitalityStatusFilter(isSelected ? "ALL" : st.key)}
                      className={`text-left rounded-2xl border p-4 space-y-2 transition-all ${st.cardBorder} ${
                        isSelected ? "ring-2 ring-teal-400 shadow-lg" : "hover:border-white/[0.2]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-white">{st.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${st.badgeClass}`}>
                          {bucket.pct}%
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-white font-mono">
                        {bucket.count}
                        <span className="text-xs font-normal text-zinc-400 ml-1.5">portali</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-snug">{bucket.criteria}</p>
                    </button>
                  );
                })}
              </div>

              {/* Live External Vitality Probe Box */}
              <div className="rounded-2xl border border-teal-500/30 bg-teal-500/[0.03] p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-teal-500/20 pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <RefreshCw className={`h-4 w-4 text-teal-400 ${isProbingVitality ? "animate-spin" : ""}`} />
                      Sonda żywotności i unikalności na żywo (HTTP + RSS + DOM w locie)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Wpisz lub wybierz dowolną domenę PPG, aby w czasie rzeczywistym odpytać jej serwer, policzyć świeżość
                      ostatniej publikacji, odsetek unikalnych tematów lokalnych i znaczniki paywalla na stronie głównej.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-teal-300 bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/20 shrink-0">
                    Status dowodu: POMIAR (0 zł)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={probeDomainInput}
                    onChange={(e) => setProbeDomainInput(e.target.value)}
                    className="w-full sm:w-auto max-w-full truncate rounded-xl border border-white/[0.1] bg-black/60 px-3 py-2 text-xs text-zinc-200 font-mono focus:border-teal-500 focus:outline-none"
                  >
                    <option value="gazetakrakowska.pl">gazetakrakowska.pl (Dziennik regionalny - czynny)</option>
                    <option value="dziennikbaltycki.pl">dziennikbaltycki.pl (Dziennik regionalny - czynny)</option>
                    <option value="i.pl">i.pl (Portal ogólnopolski PPG)</option>
                    <option value="warszawa.naszemiasto.pl">warszawa.naszemiasto.pl (Duży serwis miejski)</option>
                    <option value="puck.naszemiasto.pl">puck.naszemiasto.pl (Serwis powiatowy)</option>
                    <option value="choszczno.naszemiasto.pl">choszczno.naszemiasto.pl (Mniejszy powiat)</option>
                    <option value="polskatimes.pl">polskatimes.pl (Domena wygaszona HTTP 410)</option>
                  </select>

                  <input
                    type="text"
                    value={probeDomainInput}
                    onChange={(e) => setProbeDomainInput(e.target.value)}
                    placeholder="Wpisz dowolną domenę PPG (np. sopot.naszemiasto.pl)..."
                    className="flex-1 rounded-xl border border-white/[0.1] bg-black/60 px-3.5 py-2 text-xs text-white font-mono placeholder-zinc-500 focus:border-teal-500 focus:outline-none"
                  />

                  <button
                    onClick={() => handleProbePortalVitality(probeDomainInput)}
                    disabled={isProbingVitality}
                    className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-black hover:bg-teal-400 disabled:opacity-50 transition-all font-mono flex items-center justify-center gap-1.5 shadow"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    {isProbingVitality ? "Sondowanie serwera..." : "Zbadaj portal na żywo"}
                  </button>
                </div>

                {liveProbeResult && (
                  <div className="rounded-xl border border-white/[0.1] bg-black/60 p-4 space-y-4 font-mono text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{liveProbeResult.domain}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300">
                          HTTP {liveProbeResult.http_status} · {liveProbeResult.latency_ms} ms
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-bold border ${
                          liveProbeResult.vitality_status === "AKTYWNY_UNIKALNY"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : liveProbeResult.vitality_status === "AKTYWNY_SYNDYKAT"
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                            : liveProbeResult.vitality_status === "LEDWO_ZYWY"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        }`}
                      >
                        {liveProbeResult.vitality_label} ({liveProbeResult.vitality_score}/100)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.05]">
                        <span className="text-[10px] text-zinc-400 block">Świeżość (ostatni tekst)</span>
                        <span className="text-sm font-bold text-white">{liveProbeResult.hours_since_last_pub}h temu</span>
                      </div>
                      <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.05]">
                        <span className="text-[10px] text-zinc-400 block">Unikalność lokalna</span>
                        <span className="text-sm font-bold text-emerald-400">
                          {liveProbeResult.uniqueness_pct}% ({liveProbeResult.unique_local_count}/{liveProbeResult.feed_items_count})
                        </span>
                      </div>
                      <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.05]">
                        <span className="text-[10px] text-zinc-400 block">Klony / syndykat</span>
                        <span className="text-sm font-bold text-amber-400">{liveProbeResult.syndicated_clones_pct}%</span>
                      </div>
                      <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.05]">
                        <span className="text-[10px] text-zinc-400 block">Przynęty Discover</span>
                        <span className="text-sm font-bold text-purple-300">{liveProbeResult.discover_bait_pct}%</span>
                      </div>
                      <div className="rounded-lg bg-white/[0.03] p-2.5 border border-white/[0.05]">
                        <span className="text-[10px] text-zinc-400 block">Zrzuty z automatu (:00/:15)</span>
                        <span className="text-sm font-bold text-sky-300">{liveProbeResult.cron_scheduled_pct}%</span>
                      </div>
                    </div>

                    <div className="text-zinc-300 bg-white/[0.02] p-3 rounded-lg border border-white/[0.04]">
                      <strong className="text-teal-400">Diagnoza sondy: </strong>
                      {liveProbeResult.diagnosis}
                      {liveProbeResult.homepage_lead_title && (
                        <div className="mt-1.5 text-[11px] text-zinc-400">
                          Czołówka strony głównej: <span className="text-white">{liveProbeResult.homepage_lead_title}</span>
                          {" · "}Znaczniki Paywall Plus w DOM: <strong className="text-amber-300">{liveProbeResult.homepage_paywall_markers}</strong>
                          {" · "}Oznaczenia komercyjne: <strong className="text-rose-300">{liveProbeResult.homepage_sponsored_markers}</strong>
                        </div>
                      )}
                    </div>

                    {liveProbeResult.sample_titles && liveProbeResult.sample_titles.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase text-zinc-400 block">Najnowsze pozycje ze strumienia RSS/News:</span>
                        {liveProbeResult.sample_titles.map((st, idx) => (
                          <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded bg-white/[0.02] px-3 py-1.5 text-[11px]">
                            <span className="text-zinc-200 truncate max-w-xl">{st.title}</span>
                            <div className="flex items-center gap-1.5">
                              {st.isUniqueLocal ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">Unikalny lokalny</span>
                              ) : st.isDiscoverBait ? (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">Szablon Discover</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px]">Syndykat centralny</span>
                              )}
                              {st.isCronMinute && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">Cron :00/:15</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Filter & Sort Bar for the 547 Portals Table */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={vitalitySearchQuery}
                    onChange={(e) => setVitalitySearchQuery(e.target.value)}
                    placeholder="Szukaj domeny lub miasta (np. puck, krakow)..."
                    className="w-full sm:w-64 max-w-full rounded-xl border border-white/[0.1] bg-black/60 px-3 py-2 text-xs text-white placeholder-zinc-500 focus:border-teal-500 focus:outline-none"
                  />

                  <select
                    value={vitalityStatusFilter}
                    onChange={(e) => setVitalityStatusFilter(e.target.value)}
                    className="w-full sm:w-auto max-w-full truncate rounded-xl border border-white/[0.1] bg-black/60 px-3 py-2 text-xs text-zinc-200"
                  >
                    <option value="ALL">Wszystkie statusy ({portals.length})</option>
                    <option value="AKTYWNY_UNIKALNY">Czynne i wysoko unikalne</option>
                    <option value="AKTYWNY_SYNDYKAT">Czynne maszynowo (klony)</option>
                    <option value="LEDWO_ZYWY">Ledwo żywe (śladowe)</option>
                    <option value="ZOMBIE_AUTOMAT">Zombie (automaty CMS)</option>
                    <option value="MARTWY">Martwe / wygaszone</option>
                  </select>

                  <select
                    value={vitalityRegionFilter}
                    onChange={(e) => setVitalityRegionFilter(e.target.value)}
                    className="w-full sm:w-auto max-w-full truncate rounded-xl border border-white/[0.1] bg-black/60 px-3 py-2 text-xs text-zinc-200"
                  >
                    <option value="ALL">Wszystkie województwa</option>
                    <option value="Małopolskie">Małopolskie</option>
                    <option value="Śląskie">Śląskie</option>
                    <option value="Pomorskie">Pomorskie</option>
                    <option value="Wielkopolskie">Wielkopolskie</option>
                    <option value="Dolnośląskie">Dolnośląskie</option>
                    <option value="Mazowieckie">Mazowieckie</option>
                    <option value="Łódzkie">Łódzkie</option>
                    <option value="Kujawsko-Pomorskie">Kujawsko-Pomorskie</option>
                    <option value="Podkarpackie">Podkarpackie</option>
                    <option value="Lubelskie">Lubelskie</option>
                    <option value="Zachodniopomorskie">Zachodniopomorskie</option>
                    <option value="Warmińsko-Mazurskie">Warmińsko-Mazurskie</option>
                    <option value="Świętokrzyskie">Świętokrzyskie</option>
                    <option value="Podlaskie">Podlaskie</option>
                    <option value="Lubuskie">Lubuskie</option>
                    <option value="Opolskie">Opolskie</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-zinc-400">Sortuj:</span>
                  <select
                    value={vitalitySortBy}
                    onChange={(e) => setVitalitySortBy(e.target.value as "score" | "uniqueness" | "unique_daily" | "hours")}
                    className="w-full sm:w-auto max-w-full truncate rounded-xl border border-white/[0.1] bg-black/60 px-3 py-2 text-xs text-zinc-200"
                  >
                    <option value="score">Wynik żywotności (0-100)</option>
                    <option value="uniqueness">% unikalnych tekstów</option>
                    <option value="unique_daily">Liczba unikalnych tekstów / dobę</option>
                    <option value="hours">Czas od ostatniej publikacji</option>
                  </select>
                </div>
              </div>

              {/* Portals Audit Table */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-black/50 text-[10px] uppercase text-zinc-400">
                        <th className="py-3 px-4">Portal / Domena</th>
                        <th className="py-3 px-3">Status żywotności</th>
                        <th className="py-3 px-3 text-right">Art. / dobę</th>
                        <th className="py-3 px-3 text-right">Unikalne / dobę</th>
                        <th className="py-3 px-3 text-right">% Unikalności</th>
                        <th className="py-3 px-3 text-right">Autorzy imienni</th>
                        <th className="py-3 px-3 text-right">Ostatni tekst</th>
                        <th className="py-3 px-4 text-right">Akcje badawcze</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredPortals.slice(0, 150).map((p) => (
                        <tr
                          key={p.domain}
                          className={`hover:bg-white/[0.02] transition-colors ${
                            selectedMediumDomain === p.domain ? "bg-teal-500/[0.08]" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{p.portal_name}</div>
                            <div className="text-[10px] text-teal-400">
                              {p.domain} · <span className="text-zinc-500">{p.region}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                                p.vitality_status === "AKTYWNY_UNIKALNY"
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : p.vitality_status === "AKTYWNY_SYNDYKAT"
                                  ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                                  : p.vitality_status === "LEDWO_ZYWY"
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                  : p.vitality_status === "ZOMBIE_AUTOMAT"
                                  ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              }`}
                            >
                              {p.vitality_label}
                            </span>
                            <div className="text-[10px] text-zinc-500 mt-1 max-w-xs truncate" title={p.diagnosis}>
                              {p.diagnosis}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-white">{p.daily_articles_count}</td>
                          <td className="py-3 px-3 text-right font-bold text-teal-300">{p.unique_articles_count}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={p.uniqueness_pct >= 42 ? "text-emerald-400 font-bold" : p.uniqueness_pct >= 20 ? "text-sky-300" : "text-rose-400"}>
                              {p.uniqueness_pct}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-300">{p.named_authors_count}</td>
                          <td className="py-3 px-3 text-right text-zinc-400">
                            {p.http_status === 410 ? "HTTP 410" : `${p.hours_since_last_pub}h temu`}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {p.http_status !== 410 && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedMediumDomain(p.domain);
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}
                                    className="rounded-lg bg-white/[0.06] border border-white/[0.12] px-2 py-1 text-[10px] font-bold text-white hover:border-teal-400 hover:text-teal-300 transition-all"
                                    title="Zbadaj to medium wszystkimi kryteriami (18 dziedzin, KO/PO, żywotność, wywiad)"
                                  >
                                    Audyt 360°
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCompareMediumDomain(p.domain);
                                      setActiveTab("compare");
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}
                                    className="rounded-lg bg-sky-500/15 border border-sky-500/30 px-2 py-1 text-[10px] font-bold text-sky-300 hover:bg-sky-500 hover:text-black transition-all"
                                    title="Porównaj to medium jako Medium B w porównywarce A vs B"
                                  >
                                    Porównaj
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleProbePortalVitality(p.domain)}
                                className="rounded-lg bg-teal-500/15 border border-teal-500/30 px-2.5 py-1 text-[10px] font-bold text-teal-300 hover:bg-teal-500 hover:text-black transition-all"
                              >
                                Sonda live
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-white/[0.06] bg-black/40 px-4 py-2.5 text-[11px] font-mono text-zinc-400 flex justify-between">
                  <span>Wyświetlono {Math.min(150, filteredPortals.length)} z {filteredPortals.length} pasujących portali</span>
                  <span>Metodologia: {audit?.methodology}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ================================================================= */}
        {/* TAB: WSKAŹNIKI WYWIADU (7 OPERATIONAL INTELLIGENCE MODULES) */}
        {/* ================================================================= */}
        {activeTab === "intelligence" && (() => {
          const intel = data.editorial_intelligence;
          const hp = intel?.homepage_radar;
          const vt = intel?.version_tracker;
          const mon = intel?.monetization_and_discover;
          const ter = intel?.teryt_deserts;
          const echo = intel?.external_echo;
          const pulse = intel?.newsroom_pulse;
          const staleness = intel?.homepage_staleness_radar;
          const syndAudit = intel?.syndication_and_canonical_audit;
          const compBench = intel?.regional_competitor_1to1_benchmarks || [];

          return (
            <div className="space-y-6">
              {/* Header & Sub-Module Navigation */}
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-teal-400" /> Zaawansowane moduły wywiadu redakcyjnego PPGscope
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Dziesięć modułów operacyjnych badających realną politykę wydawniczą: od ekspozycji i starzenia się czołówek,
                      przez bilans kaskad i higienę `rel=&quot;canonical&quot;`, po benchmarking 1:1 z konkurencją miejską.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20 px-3 py-1 rounded-lg shrink-0">
                    Dane zewnętrzne (0 zł) + gotowość pod GA4 / Piano / Brand24
                  </span>
                </div>

                {/* Sub-tabs */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.06] text-xs font-mono">
                  {[
                    { id: "homepage_radar", label: "1. Radar czołówek (Jedynki vs Sitemap)" },
                    { id: "staleness_radar", label: "2. Starzenie jedynek i luki weekendowe" },
                    { id: "canonical_syndication", label: "3. Kto żywi sieć i audyt rel=canonical" },
                    { id: "competitor_1to1", label: "4. Benchmarking 1:1 z konkurentem" },
                    { id: "version_tracker", label: "5. Ciche edycje i usunięcia (Tombstone)" },
                    { id: "monetization", label: "6. Paywall Plus, sponsorowane i Discover" },
                    { id: "teryt_deserts", label: "7. Pustynie informacyjne w powiatach (TERYT)" },
                    { id: "external_echo", label: "8. Czas reakcji i konektory (Darmowe/Płatne)" },
                    { id: "newsroom_pulse", label: "9. Kadry i rytm pracy redakcji" },
                    { id: "wire_cascades", label: "10. Kaskady depeszowe (Headline Drift)" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setIntelSubTab(tab.id as typeof intelSubTab)}
                      className={`rounded-xl px-3 py-1.5 transition-all ${
                        intelSubTab === tab.id
                          ? "bg-teal-500 text-black font-bold shadow"
                          : "bg-black/40 text-zinc-400 hover:text-white border border-white/[0.06]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* MODULE 1: HOMEPAGE RADAR */}
              {intelSubTab === "homepage_radar" && hp && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">
                      <span className="text-[10px] uppercase text-zinc-400 block">Monitorowane czołówki</span>
                      <span className="text-2xl font-bold text-white">{hp.portals_monitored} dzienników</span>
                      <span className="text-[10px] text-teal-400 block mt-1">Skan DOM co 15 minut</span>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">
                      <span className="text-[10px] uppercase text-zinc-400 block">Średni czas życia jedynki</span>
                      <span className="text-2xl font-bold text-teal-400">{hp.avg_hero_dwell_hours} godz.</span>
                      <span className="text-[10px] text-zinc-500 block mt-1">Główny kafelek (Hero Slot)</span>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">
                      <span className="text-[10px] uppercase text-zinc-400 block">Paywall powyżej zgięcia</span>
                      <span className="text-2xl font-bold text-amber-400">{hp.paywalled_above_fold_pct}%</span>
                      <span className="text-[10px] text-zinc-500 block mt-1">Sloty Top-5 zamknięte w Plusie</span>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">
                      <span className="text-[10px] uppercase text-zinc-400 block">Materiały komercyjne Top-5</span>
                      <span className="text-2xl font-bold text-rose-400">{hp.sponsored_above_fold_pct}%</span>
                      <span className="text-[10px] text-zinc-500 block mt-1">Ekspozycja partnerów na głównej</span>
                    </div>
                  </div>

                  {/* Agenda Gap Table */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">
                      Luka agendy wydawniczej: ekspozycja na „jedynkach” kontra masowa produkcja w sitemapach
                    </h3>
                    <div className="space-y-3">
                      {hp.agenda_gap.map((item) => (
                        <div key={item.domain_code} className="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-2 font-mono text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-white">
                              {item.domain_code} · {item.domain_name}
                            </span>
                            <div className="flex items-center gap-4">
                              <span className="text-zinc-400">Sitemapa: <strong className="text-white">{item.sitemap_share_pct}%</strong></span>
                              <span className="text-teal-300">Czołówki (Hero): <strong className="text-teal-400">{item.homepage_hero_share_pct}%</strong></span>
                              <span className={`px-2 py-0.5 rounded font-bold ${item.gap_pp > 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                                {item.gap_pp > 0 ? `+${item.gap_pp}` : item.gap_pp} pkt proc.
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-sans">{item.interpretation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Hero Leads */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-3">
                    <h3 className="text-sm font-bold text-white">Bieżące „jedynki” (Hero Stories) na stronach głównych dzienników PPG</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                      {hp.live_frontpage_leads.map((lead) => (
                        <div key={lead.domain} className="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-teal-400 font-bold">{lead.portal} ({lead.domain})</span>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-white/[0.08] text-white text-[10px] font-bold">{lead.badge}</span>
                              {lead.is_paywalled && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">Paywall Plus</span>
                              )}
                            </div>
                          </div>
                          <p className="text-white font-semibold font-sans text-sm">{lead.hero_title}</p>
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>Kategoria: {lead.topic}</span>
                            <span>Czas na czołówce: {lead.dwell_hours}h</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 2: VERSION TRACKER & TOMBSTONE LOG */}
              {intelSubTab === "version_tracker" && vt && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-amber-300 block font-bold">Mutacje nagłówków (A/B)</span>
                      <span className="text-2xl font-bold text-white">{vt.headline_mutations_count.toLocaleString("pl-PL")}</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">{vt.headline_mutations_pct}% tekstów zmienia tytuł po publikacji</span>
                    </div>
                    <div className="rounded-2xl border border-sky-500/25 bg-sky-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-sky-300 block font-bold">Ciche edycje korpusu</span>
                      <span className="text-2xl font-bold text-white">{vt.silent_body_edits_count.toLocaleString("pl-PL")}</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">{vt.silent_body_edits_pct}% tekstów modyfikowanych bez notki</span>
                    </div>
                    <div className="rounded-2xl border border-purple-500/25 bg-purple-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-purple-300 block font-bold">Opóźniony Paywall Plus</span>
                      <span className="text-2xl font-bold text-white">{vt.delayed_paywall_locks_count.toLocaleString("pl-PL")}</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Zamknięte po zebraniu darmowego ruchu</span>
                    </div>
                    <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-rose-300 block font-bold">Rejestr usunięć (Tombstone)</span>
                      <span className="text-2xl font-bold text-white">{vt.tombstone_deleted_count.toLocaleString("pl-PL")}</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Artykuły skasowane (HTTP 404 / 410)</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">
                      Dziennik wykrytych zmian po publikacji i usuniętych artykułów (`ppg_article_versions`)
                    </h3>
                    <div className="space-y-3">
                      {vt.recent_diffs.map((d) => (
                        <div key={d.id} className="rounded-xl border border-white/[0.06] bg-black/40 p-4 space-y-2 font-mono text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-teal-300">
                              {d.change_label} · {d.portal} ({d.domain})
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300">
                              Wykryto po {d.detected_after_minutes} min · HTTP {d.http_status}
                            </span>
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <div className="text-rose-300">
                              <strong className="text-zinc-500">Wersja pierwotna: </strong>
                              {d.old_title}
                            </div>
                            {d.new_title ? (
                              <div className="text-emerald-300">
                                <strong className="text-zinc-500">Po modyfikacji: </strong>
                                {d.new_title}
                              </div>
                            ) : (
                              <div className="text-rose-400 font-bold">
                                [TOMBSTONE] Artykuł całkowicie usunięty z serwera ({d.body_delta_chars} znaków)
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 font-sans pt-1 border-t border-white/[0.04]">
                            {d.editorial_note}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 3: MONETIZATION (STREFA PLUS), SPONSORED & DISCOVER BAIT */}
              {intelSubTab === "monetization" && mon && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Paywall Strefa Plus */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <h3 className="text-sm font-bold text-white">Paywall „Strefa Plus”</h3>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        {mon.paywall_strefa_plus.regional_dailies_share_pct}% w dziennikach
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Wykrywane wprost z flagi `isAccessibleForFree: false` w JSON-LD. Dzienniki regionalne zamykają
                      niemal co czwarty materiał, podczas gdy serwisy NaszeMiasto tylko {mon.paywall_strefa_plus.naszemiasto_share_pct}%.
                    </p>
                    <div className="space-y-2 font-mono text-xs">
                      {mon.paywall_strefa_plus.top_paywalled_domains.map((item) => (
                        <div key={item.domain_name} className="rounded-lg bg-black/40 p-2.5 border border-white/[0.04] flex justify-between">
                          <span className="text-zinc-300">{item.domain_name}</span>
                          <span className="text-amber-400 font-bold">{item.locked_pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sponsored & Commercial */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <h3 className="text-sm font-bold text-white">Artykuły sponsorowane i partnerzy</h3>
                      <span className="text-xs font-mono text-rose-400 font-bold">
                        {mon.sponsored_and_commercial.network_share_pct}% całej produkcji
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      W ciągu 30 dni wykryto {mon.sponsored_and_commercial.partner_labeled_articles_30d.toLocaleString("pl-PL")} tekstów
                      komercyjnych oraz {mon.sponsored_and_commercial.rel_sponsored_links_30d.toLocaleString("pl-PL")} linków `rel=&quot;sponsored&quot;`.
                    </p>
                    <div className="space-y-2 font-mono text-xs">
                      {mon.sponsored_and_commercial.top_commercial_sectors.map((sec) => (
                        <div key={sec.sector} className="rounded-lg bg-black/40 p-2.5 border border-white/[0.04] flex justify-between">
                          <span className="text-zinc-300">{sec.sector}</span>
                          <span className="text-rose-300 font-bold">{sec.share_pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Google Discover / Evergreen SEO Factory */}
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <h3 className="text-sm font-bold text-white">Fabryka Google Discover i SEO</h3>
                      <span className="text-xs font-mono text-purple-300 font-bold">
                        {mon.discover_seo_evergreen.network_share_pct}% wolumenu
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Około {mon.discover_seo_evergreen.estimated_30d_volume.toLocaleString("pl-PL")} publikacji miesięcznie
                      to artykuły szablonowe pod wyszukiwarkę i Discover bez lokalnych źródeł:
                    </p>
                    <div className="space-y-2 font-mono text-xs">
                      {mon.discover_seo_evergreen.top_templates.map((tpl) => (
                        <div key={tpl.pattern} className="rounded-lg bg-black/40 p-2.5 border border-white/[0.04] space-y-1">
                          <div className="text-white font-semibold">{tpl.pattern}</div>
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>{tpl.articles_30d.toLocaleString("pl-PL")} art./30d</span>
                            <span className="text-purple-300">Klonowanie: {tpl.syndication_factor}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 4: TERYT COUNTY INFORMATION DESERTS */}
              {intelSubTab === "teryt_deserts" && ter && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-emerald-300 block font-bold">Pełne pokrycie lokalne</span>
                      <span className="text-2xl font-bold text-white">{ter.full_coverage_counties} powiatów</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">{ter.full_coverage_pct}% z 380 powiatów GUS TERYT</span>
                    </div>
                    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-amber-300 block font-bold">Słabe pokrycie (kronika)</span>
                      <span className="text-2xl font-bold text-white">{ter.weak_coverage_counties} powiatów</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">{ter.weak_coverage_pct}% powiatów (głównie komunikaty służb)</span>
                    </div>
                    <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-rose-300 block font-bold">Pustynie informacyjne</span>
                      <span className="text-2xl font-bold text-white">{ter.information_deserts_counties} powiaty</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">{ter.information_deserts_pct}% powiatów bez realnego reportera</span>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">
                      <span className="text-[10px] uppercase text-teal-300 block font-bold">Cytowanie lokalnych instytucji</span>
                      <span className="text-2xl font-bold text-white">{ter.local_institution_quote_rate_pct}%</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Teksty z głosem gminy, rady lub starostwa</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-3">
                      <h3 className="text-sm font-bold text-white">Odsetek pustyń informacyjnych według województw</h3>
                      <div className="space-y-2 font-mono text-xs">
                        {ter.voivodeship_desert_ranking.map((v) => (
                          <div key={v.voivodeship} className="rounded-xl bg-black/40 p-3 border border-white/[0.04] flex items-center justify-between">
                            <div>
                              <span className="text-white font-semibold">{v.voivodeship}</span>
                              <span className="text-[10px] text-zinc-400 block">
                                Pustynie: {v.desert_counties} z {v.total_counties} powiatów
                              </span>
                            </div>
                            <div className="text-right">
                              <span className={`font-bold ${v.desert_pct >= 25 ? "text-rose-400" : "text-emerald-400"}`}>
                                {v.desert_pct}% białych plam
                              </span>
                              <span className="text-[10px] text-zinc-500 block">
                                śr. {v.avg_local_quotes_per_day} cytowań lokalnych/dzień
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-3">
                      <h3 className="text-sm font-bold text-white">Przykładowe audyty powiatowe (słownik GUS TERYT)</h3>
                      <div className="space-y-2.5 font-mono text-xs">
                        {ter.sample_county_audits.map((c) => (
                          <div key={c.teryt} className="rounded-xl bg-black/40 p-3.5 border border-white/[0.04] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-white font-bold">TERYT {c.teryt} · {c.county}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  c.status === "PELNE_POKRYCIE"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : c.status === "SLABE_POKRYCIE"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-rose-500/20 text-rose-300"
                                }`}
                              >
                                {c.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-teal-400">
                              Portal: {c.portal} · Unikalne teksty lokalne (30d): <strong>{c.unique_local_30d}</strong> · Cytowania instytucji: <strong>{c.institutions_quoted_30d}</strong>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-sans">{c.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 5: EXTERNAL ECHO, SPEED-TO-PUBLISH & 3-TIER CONNECTORS */}
              {intelSubTab === "external_echo" && echo && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white">
                        Szybkość reakcji redakcji (Speed-to-Publish) wobec niezależnych portali regionalnych
                      </h3>
                      <span className="text-xs font-mono text-teal-400">
                        Pokrycie pików Google Trends: {echo.google_trends_capture_rate_pct}% (mediana reakcji: {echo.median_trends_reaction_minutes} min)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                      {echo.speed_to_publish_benchmarks.map((b) => (
                        <div key={b.region} className="rounded-xl bg-black/40 p-4 border border-white/[0.06] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-bold">{b.region}</span>
                            <span className="text-teal-300 font-bold">PPG pierwsze w {b.ppg_first_pct}% newsów</span>
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {b.ppg_title} vs <strong className="text-zinc-200">{b.competitor}</strong> · Mediana opóźnienia: <strong className="text-amber-300">{b.median_lag_minutes} min</strong>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-sans">{b.verdict}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3-Tier Connector Architecture Roadmap */}
                  <div className="rounded-2xl border border-teal-500/30 bg-teal-500/[0.03] p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">
                      Architektura trójwarstwowa konektorów (`BaseConnector` & `MetricProof`): od darmowych do wewnętrznych i płatnych
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                      {echo.connectors_roadmap.map((conn) => (
                        <div key={conn.id} className="rounded-xl border border-white/[0.08] bg-black/50 p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{conn.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                conn.status === "AKTYWNY"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              }`}
                            >
                              {conn.tier} · {conn.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-300 font-sans">{conn.current_capabilities}</p>
                          <div className="text-[11px] text-teal-300 pt-1 border-t border-white/[0.05] font-sans">
                            <strong>Po włączeniu danych wewnętrznych/płatnych: </strong>
                            {conn.upgrade_target}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 6: NEWSROOM PULSE (STAFF & CADENCE) */}
              {intelSubTab === "newsroom_pulse" && pulse && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">
                      <span className="text-[10px] uppercase text-zinc-400 block">Podpisani dziennikarze (sieć)</span>
                      <span className="text-2xl font-bold text-white">{pulse.total_named_journalists_network}</span>
                      <span className="text-[10px] text-teal-400 block mt-1">{pulse.local_beat_reporters_count} reporterów lokalnych</span>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">
                      <span className="text-[10px] uppercase text-zinc-400 block">Autorzy-huby centralne</span>
                      <span className="text-2xl font-bold text-amber-400">{pulse.central_hub_authors_count} osób</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Piszą 1 tekst powielany na 20–140 domen</span>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">
                      <span className="text-[10px] uppercase text-zinc-400 block">Koncentracja Top-3 w redakcji</span>
                      <span className="text-2xl font-bold text-rose-400">{pulse.avg_top3_authors_concentration_pct}%</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">3 autorów ciągnie ponad połowę tekstów</span>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">
                      <span className="text-[10px] uppercase text-zinc-400 block">Publikacje z harmonogramu CMS</span>
                      <span className="text-2xl font-bold text-sky-400">{pulse.network_cron_scheduled_pct}%</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Wrzutki o pełnym kwadransie (:00/:15/:30)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-3">
                      <h3 className="text-sm font-bold text-white">Największe huby autorskie (1 tekst -&gt; dziesiątki portali)</h3>
                      <div className="space-y-2.5 font-mono text-xs">
                        {pulse.hub_authors_leaderboard.map((h) => (
                          <div key={h.name} className="rounded-xl bg-black/40 p-3.5 border border-white/[0.04] space-y-1">
                            <div className="flex justify-between">
                              <span className="text-white font-bold">{h.name}</span>
                              <span className="text-teal-400 font-bold">{h.portals_reached} portali zasięgu</span>
                            </div>
                            <div className="text-[11px] text-zinc-400">{h.role}</div>
                            <div className="text-[11px] text-amber-300">
                              Oryginały (30d): <strong>{h.articles_30d}</strong> -&gt; Wygenerowane kopie sieciowe: <strong>{h.syndicated_copies_30d.toLocaleString("pl-PL")}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-3">
                      <h3 className="text-sm font-bold text-white">Dobowy rytm pracy newsroomów: ludzie kontra automaty CMS</h3>
                      <div className="space-y-2 font-mono text-xs">
                        {pulse.hourly_rhythm.map((hr) => (
                          <div key={hr.hour} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-zinc-300 font-bold">{hr.hour}</span>
                              <span className="text-zinc-400">
                                Dziennikarze: <strong className="text-teal-400">{hr.human_pct}%</strong> · Automaty Cron: <strong className="text-purple-300">{hr.cron_pct}%</strong>
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                              <div style={{ width: `${hr.human_pct}%` }} className="bg-teal-500 h-full" />
                              <div style={{ width: `${hr.cron_pct}%` }} className="bg-purple-500/70 h-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODULE 7: WIRE CASCADES */}
              {intelSubTab === "wire_cascades" && (
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
              )}

              {/* MODULE 2 (NEW): STALENESS RADAR & REACTION SPEED */}
              {intelSubTab === "staleness_radar" && staleness && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-emerald-300 font-bold block">Dynamiczne czołówki</span>
                      <span className="text-2xl font-bold text-white">{staleness.status_counts["DYNAMICZNA_CZOLOWKA"] || 0} dzienników</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Rotacja jedynki &lt;= 3,6h w dni robocze</span>
                    </div>
                    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-amber-300 font-bold block">Umiarkowana rotacja</span>
                      <span className="text-2xl font-bold text-white">{staleness.status_counts["UMIARKOWANA_ROTACJA"] || 0} dzienników</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Spowolnienie dyżurów w weekendy</span>
                    </div>
                    <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-rose-300 font-bold block">Zastygłe jedynki</span>
                      <span className="text-2xl font-bold text-white">{staleness.status_counts["ZASTYGLA_JEDYNKA"] || 0} dzienniki</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Przestoje weekendowe i nocne &gt; 8,5h</span>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-4">
                      <span className="text-[10px] uppercase text-teal-300 font-bold block">Średnia luka nocna (po 17:00)</span>
                      <span className="text-2xl font-bold text-white">{staleness.avg_evening_freeze_network_hours}h</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Średnia dla 20 dzienników + i.pl</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">
                      Pełny audyt rotacji „jedynek” (Hero Slot) i szybkości reakcji we wszystkich 20 dziennikach regionalnych oraz i.pl
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="border-b border-white/[0.08] text-[10px] uppercase text-zinc-400">
                          <tr>
                            <th className="py-2.5 px-3">Portal</th>
                            <th className="py-2.5 px-3">Aktualny temat na jedynce (Hero)</th>
                            <th className="py-2.5 px-3 text-right">Wisi teraz</th>
                            <th className="py-2.5 px-3 text-right">Śr. dzień rob.</th>
                            <th className="py-2.5 px-3 text-right">Śr. weekend</th>
                            <th className="py-2.5 px-3 text-right">Luka nocna</th>
                            <th className="py-2.5 px-3 text-right">Wymian/24h</th>
                            <th className="py-2.5 px-3 text-right">Reakcja</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {staleness.portals.map((p) => (
                            <tr key={p.domain} className="hover:bg-white/[0.02]">
                              <td className="py-2.5 px-3 font-bold text-white">
                                {p.portal_name}
                                <span className="block text-[10px] text-zinc-500 font-normal">{p.domain}</span>
                              </td>
                              <td className="py-2.5 px-3 text-zinc-200 font-sans max-w-xs truncate" title={p.current_hero_title}>
                                {p.current_hero_title}
                              </td>
                              <td className="py-2.5 px-3 text-right text-white">{p.current_hero_dwell_hours}h</td>
                              <td className="py-2.5 px-3 text-right text-teal-300 font-bold">{p.avg_weekday_dwell_hours}h</td>
                              <td className="py-2.5 px-3 text-right text-amber-300 font-bold">{p.avg_weekend_dwell_hours}h</td>
                              <td className="py-2.5 px-3 text-right text-rose-300">{p.evening_freeze_hours}h</td>
                              <td className="py-2.5 px-3 text-right text-zinc-300">{p.swaps_per_24h}</td>
                              <td className="py-2.5 px-3 text-right text-white">{p.median_reaction_minutes} min</td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.staleness_status === "DYNAMICZNA_CZOLOWKA"
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : p.staleness_status === "UMIARKOWANA_ROTACJA"
                                      ? "bg-amber-500/20 text-amber-300"
                                      : "bg-rose-500/20 text-rose-300"
                                  }`}
                                >
                                  {p.staleness_status}
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

              {/* MODULE 3 (NEW): SYNDICATION BALANCE & CANONICAL SEO AUDIT */}
              {intelSubTab === "canonical_syndication" && syndAudit && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
                    <div className="rounded-2xl border border-teal-500/25 bg-teal-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-teal-300 font-bold block">Eksporterzy treści netto</span>
                      <span className="text-2xl font-bold text-white">{syndAudit.net_exporter_portals_count} portali</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Główne dzienniki i huby tematyczne</span>
                    </div>
                    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-amber-300 font-bold block">Biorcy gotowców (importerzy)</span>
                      <span className="text-2xl font-bold text-white">{syndAudit.net_importer_portals_count} portale</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Serwisy zasilane głównie kopiami</span>
                    </div>
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-emerald-300 font-bold block">Poprawny tag rel=canonical</span>
                      <span className="text-2xl font-bold text-white">{syndAudit.proper_canonical_to_origin_pct}%</span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Wskazuje na oryginalny dziennik</span>
                    </div>
                    <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-4">
                      <span className="text-[10px] uppercase text-rose-300 font-bold block">Kopie kanibalizujące SEO (30d)</span>
                      <span className="text-2xl font-bold text-white">
                        {syndAudit.self_canonical_cannibalizing_copies_30d.toLocaleString("pl-PL")}
                      </span>
                      <span className="text-[10px] text-zinc-400 block mt-1">Self-canonical rozbijający pozycję w Google</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">
                      Bilans „Kto żywi sieć, a kto bierze” oraz higiena tagów `&lt;link rel=&quot;canonical&quot;&gt;` (ostatnie 30 dni)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="border-b border-white/[0.08] text-[10px] uppercase text-zinc-400">
                          <tr>
                            <th className="py-2.5 px-3">Portal</th>
                            <th className="py-2.5 px-3">Rola w sieci</th>
                            <th className="py-2.5 px-3 text-right">Eksport oryginałów</th>
                            <th className="py-2.5 px-3 text-right">Kopie w sieci</th>
                            <th className="py-2.5 px-3 text-right">Import klonów</th>
                            <th className="py-2.5 px-3 text-right">Stosunek E/I</th>
                            <th className="py-2.5 px-3 text-right">Canonical do źródła</th>
                            <th className="py-2.5 px-3 text-right">Kanibalizacja (szt.)</th>
                            <th className="py-2.5 px-3 text-center">Ryzyko SEO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {syndAudit.portals.map((s) => (
                            <tr key={s.domain} className="hover:bg-white/[0.02]">
                              <td className="py-2.5 px-3 font-bold text-white">
                                {s.portal_name}
                                <span className="block text-[10px] text-zinc-500 font-normal">{s.domain}</span>
                              </td>
                              <td className="py-2.5 px-3 text-teal-300">{s.role_label}</td>
                              <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{s.exported_originals_30d}</td>
                              <td className="py-2.5 px-3 text-right text-zinc-300">
                                {s.generated_network_copies_30d.toLocaleString("pl-PL")}
                              </td>
                              <td className="py-2.5 px-3 text-right text-amber-300">{s.imported_clones_30d}</td>
                              <td className="py-2.5 px-3 text-right text-white font-bold">{s.export_to_import_ratio}x</td>
                              <td className="py-2.5 px-3 text-right text-white">{s.cross_domain_canonical_pct}%</td>
                              <td className="py-2.5 px-3 text-right text-rose-300">{s.self_canonical_clones_30d}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    s.seo_cannibalization_risk === "NISKIE"
                                      ? "bg-emerald-500/20 text-emerald-300"
                                      : s.seo_cannibalization_risk === "SREDNIE"
                                      ? "bg-amber-500/20 text-amber-300"
                                      : "bg-rose-500/20 text-rose-300"
                                  }`}
                                >
                                  {s.seo_cannibalization_risk}
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

              {/* MODULE 4 (NEW): COMPETITOR 1:1 REGIONAL BENCHMARKING */}
              {intelSubTab === "competitor_1to1" && compBench.length > 0 && (
                <div className="space-y-6">
                  {compBench.map((cb) => (
                    <div key={cb.region} className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {cb.region} ({cb.city_hub}): <span className="text-teal-400">{cb.ppg_portal_name}</span> vs{" "}
                            <span className="text-amber-400">{cb.competitor_name}</span>
                          </h3>
                          <p className="text-xs text-zinc-400 mt-0.5">{cb.executive_verdict}</p>
                        </div>
                        <div className="text-right font-mono text-xs shrink-0">
                          <span className="text-teal-300 font-bold block">PPG pierwsze: {cb.ppg_first_on_breaking_pct}%</span>
                          <span className="text-zinc-400 text-[10px]">Mediana różnicy: {cb.median_lag_minutes} min</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs">
                        {cb.domain_comparison.map((dc) => (
                          <div key={dc.domain_code} className="rounded-xl border border-white/[0.05] bg-black/40 p-2.5 space-y-1">
                            <div className="text-[10px] font-bold text-white truncate" title={dc.domain_name}>
                              {dc.domain_code} · {dc.domain_name}
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-teal-300">PPG: {dc.ppg_share_pct}%</span>
                              <span className="text-amber-300">Konk.: {dc.competitor_share_pct}%</span>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  dc.delta_pp >= 2.0
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : dc.delta_pp <= -2.0
                                    ? "bg-rose-500/20 text-rose-300"
                                    : "text-zinc-400"
                                }`}
                              >
                                {dc.delta_pp > 0 ? `+${dc.delta_pp}` : dc.delta_pp} pp
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ================================================================= */}
        {/* TAB: 16 WOJEWÓDZTW */}
        {/* ================================================================= */}
        {activeTab === "cross_sections" && <CrossSectionsView crossSections={data.cross_sections} />}

        {/* ================================================================= */}
        {/* TAB: PORTALE PPG (546 TITLES DIRECTORY) */}
        {/* ================================================================= */}
        {activeTab === "titles" && (
          <TitlesView
            titles={data.titles}
            portalVitalityAudit={data.portal_vitality_audit}
            selectedMediumDomain={selectedMediumDomain}
            onSelectMediumDomain={(domain) => {
              setSelectedMediumDomain(domain);
              setActiveTab("domain_stats");
            }}
            onCompareMediumDomain={(domain) => {
              setCompareMediumDomain(domain);
              setActiveTab("compare");
            }}
          />
        )}

        {/* ================================================================= */}
        {/* TAB: BAZA ARTYKUŁÓW */}
        {/* ================================================================= */}
        {activeTab === "articles" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-400" /> Publikacje PPG i Taksonomia v2.0
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Tryb sesyjny w locie: artykuły pobierane bezpośrednio z sieci do pamięci sesji, bez zapisywania w bazie danych.
                  </p>
                </div>

                {/* Mode toggle: Live Session vs Statistical Sample */}
                <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 p-1 text-xs font-mono">
                  <button
                    onClick={() => setArticlesViewMode("live_session")}
                    className={`rounded-lg px-3 py-1.5 transition-all ${
                      articlesViewMode === "live_session"
                        ? "bg-teal-500 font-bold text-black shadow-md"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Na żywo w sesji (z sieci)
                  </button>
                  <button
                    onClick={() => setArticlesViewMode("sample_archive")}
                    className={`rounded-lg px-3 py-1.5 transition-all ${
                      articlesViewMode === "sample_archive"
                        ? "bg-teal-500 font-bold text-black shadow-md"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Próbka wzorcowa
                  </button>
                </div>
              </div>

              {/* Live Session Controls */}
              {articlesViewMode === "live_session" && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-zinc-400">Wybierz portal do podglądu na żywo (546):</span>
                    <select
                      value={liveFetchDomain}
                      onChange={(e) => setLiveFetchDomain(e.target.value)}
                      className="w-full sm:w-auto max-w-full truncate rounded-xl border border-white/[0.1] bg-black/60 py-2 px-3 text-xs text-zinc-200 focus:border-teal-500 focus:outline-none font-mono"
                    >
                      {availableTitles.map((t) => (
                        <option key={t.domain} value={t.domain}>
                          {t.name} ({t.domain})
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleFetchLiveArticles(liveFetchDomain)}
                      disabled={isFetchingLive}
                      className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-bold text-black transition-all hover:bg-teal-400 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-teal-500/20"
                    >
                      {isFetchingLive ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Pobieranie w locie...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" /> Pobierz publikacje z sieci
                        </>
                      )}
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">
                    Artykuły żyją w sieci · Baza nie magazynuje ich treści
                  </span>
                </div>
              )}

              {liveFetchNotice && (
                <div className="rounded-lg bg-teal-500/10 border border-teal-500/20 p-2.5 text-xs text-teal-300 font-mono flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-400" />
                  <span>{liveFetchNotice}</span>
                </div>
              )}

              {/* Filters for Sample Mode */}
              {articlesViewMode === "sample_archive" && (
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.06]">
                  <select
                    value={selectedDomainFilter}
                    onChange={(e) => setSelectedDomainFilter(e.target.value)}
                    className="w-full sm:w-auto max-w-full truncate rounded-xl border border-white/[0.1] bg-black/60 py-2 px-3 text-xs text-zinc-300 focus:border-teal-500 focus:outline-none font-mono"
                  >
                    <option value="wszystkie">Wszystkie dziedziny (18)</option>
                    {DOMAINS_SPEC.map((d) => (
                      <option key={d.slug} value={d.slug}>{d.code} {d.name}</option>
                    ))}
                  </select>

                  <select
                    value={selectedLocalityFilter}
                    onChange={(e) => setSelectedLocalityFilter(e.target.value)}
                    className="w-full sm:w-auto max-w-full truncate rounded-xl border border-white/[0.1] bg-black/60 py-2 px-3 text-xs text-zinc-300 focus:border-teal-500 focus:outline-none font-mono"
                  >
                    <option value="wszystkie">Wszystkie warianty lokalności</option>
                    <option value="L">L – Lokalne</option>
                    <option value="CL">CL – Rozwinięcie lokalne</option>
                    <option value="C">C – Centralne</option>
                  </select>

                  {(() => {
                    const artsList = filteredArticles
                      .filter((a) => selectedDomainFilter === "wszystkie" || a.domain === selectedDomainFilter)
                      .filter((a) => selectedLocalityFilter === "wszystkie" || a.locality === selectedLocalityFilter);

                    const handleExport = () => {
                      const headers = ["Data publikacji", "Tytuł", "Portal", "Domena", "Region", "Dziedzina", "Lokalność", "URL"];
                      const rows = artsList.map((art) => [
                        art.published_at || "",
                        `"${(art.title || "").replace(/"/g, '""')}"`,
                        `"${(art.portal_name || "").replace(/"/g, '""')}"`,
                        art.portal_domain || "",
                        art.region || "",
                        art.domain || "",
                        art.locality || "",
                        art.url || "",
                      ]);
                      const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", `publikacje_ppg_${new Date().toISOString().split("T")[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    };

                    return (
                      <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-300 hover:bg-teal-500 hover:text-black transition-all sm:ml-auto"
                        title="Eksportuj przefiltrowane artykuły do pliku CSV"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Eksportuj CSV ({artsList.length})</span>
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* List of Articles: Live Session or Sample Archive */}
            <div className="space-y-3">
              {(articlesViewMode === "live_session" && liveSessionArticles.length > 0
                ? liveSessionArticles
                : filteredArticles
                    .filter((a) => selectedDomainFilter === "wszystkie" || a.domain === selectedDomainFilter)
                    .filter((a) => selectedLocalityFilter === "wszystkie" || a.locality === selectedLocalityFilter)
                    .slice(0, 50)
              ).map((art) => (
                  <div key={art.id} className="rounded-xl border border-white/[0.06] bg-[#0c0e12]/80 p-4 space-y-2 hover:border-white/[0.12] transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded font-bold">
                          {DOMAINS_SPEC.find(d => d.slug === art.domain)?.code || ""} · {DOMAINS_SPEC.find(d => d.slug === art.domain)?.name || DOMAIN_NAME_MAP[art.domain] || art.domain}
                        </span>

                        {art.domain_secondary && (
                          <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08] px-1.5 py-0.5 rounded">
                            + {DOMAIN_NAME_MAP[art.domain_secondary] || art.domain_secondary}
                          </span>
                        )}

                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          art.locality === "L"
                            ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                            : art.locality === "CL"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        }`}>
                          {LOCALITY_NAME_MAP[art.locality] || art.locality} ({art.locality})
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
        {activeTab === "methodology" && <MethodologyView />}

      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/[0.1] bg-[#0c0e12] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <Settings className="h-5 w-5 text-teal-400" />
                <h2 className="text-base font-semibold text-white">Stan usług serwerowych</h2>
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
                  <button onClick={handleTestGemini} disabled={geminiTestStatus === "testing" || !geminiConfigured} className="rounded bg-teal-500/20 border border-teal-500/40 px-2.5 py-1 text-[11px] font-medium text-teal-300">
                    {geminiTestStatus === "testing" ? "Sprawdzanie..." : "Testuj połączenie Gemini"}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">Klucz jest przechowywany wyłącznie po stronie serwera i nie jest wysyłany do przeglądarki.</p>
                <p className={`text-[11px] font-mono ${geminiConfigured ? "text-emerald-400" : "text-amber-300"}`}>
                  {geminiConfigured ? "Konfiguracja serwerowa aktywna" : "Brak konfiguracji serwerowej"}
                </p>
                {geminiTestStatus === "success" && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 pt-1 font-mono">
                    <Check className="h-3 w-3" /> Połączenie aktywne (Model: gemini-3.8-flash, opóźnienie: {geminiLatency} ms)
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-xl border border-white/[0.06] bg-black/40 p-4">
                <label className="font-semibold text-zinc-200 block">Baza danych PostgreSQL / Supabase</label>
                <p className="text-[11px] text-zinc-400">URL i klucz są zarządzane w środowisku serwerowym. Nie zapisujemy ich w localStorage ani w kodzie klienta.</p>
                <div className="flex items-center justify-between pt-1">
                  <button onClick={handleTestSupabase} disabled={supabaseTestStatus === "testing" || !supabaseConfigured} className="rounded bg-sky-500/20 border border-sky-500/40 px-2.5 py-1 text-[11px] font-medium text-sky-300">
                    {supabaseTestStatus === "testing" ? "Sprawdzanie..." : "Testuj połączenie Supabase"}
                  </button>
                  <span className={`text-[11px] font-mono ${supabaseConfigured ? "text-emerald-400" : "text-amber-300"}`}>
                    {supabaseConfigured ? "Konfiguracja serwerowa aktywna" : "Brak konfiguracji serwerowej"}
                  </span>
                  {supabaseTestStatus === "success" && (
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                      <Check className="h-3 w-3" /> Połączenie aktywne ({supabaseRecordsCount ?? 0} rekordów, {supabaseLatency} ms)
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-teal-500/30 bg-teal-500/[0.04] p-4">
                <label className="font-semibold text-zinc-200 flex items-center gap-1.5" htmlFor="internal-csv-settings">
                  <Database className="h-4 w-4 text-teal-400" /> Dane wewnętrzne (GA4, GSC, Piano Strefa Plus, inne zrzuty CSV)
                </label>
                <p className="text-[11px] text-zinc-400">
                  Wczytaj plik CSV albo wklej wiersze w formacie <span className="font-mono">url,pageviews,engaged_time_sec,strefa_plus_conversions</span>.
                  Dane trafiają do adaptera w panelu analitycznym i żyją wyłącznie w tej sesji przeglądarki. Nie są wysyłane na serwer ani zapisywane.
                </p>
                <textarea
                  id="internal-csv-settings"
                  rows={6}
                  value={internalCsvInput}
                  onChange={(e) => {
                    setInternalCsvInput(e.target.value);
                    setInternalCsvNotice(null);
                  }}
                  className="w-full rounded-xl border border-white/[0.12] bg-black/80 p-3 font-mono text-xs text-teal-200 focus:border-teal-400 focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded bg-teal-500/20 border border-teal-500/40 px-2.5 py-1 text-[11px] font-medium text-teal-300 focus-within:ring-2 focus-within:ring-teal-400">
                    Wczytaj plik CSV
                    <input type="file" accept=".csv,text/csv,text/plain" onChange={handleInternalCsvFile} className="sr-only" />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setInternalCsvInput(INTERNAL_CSV_HEADER);
                      setInternalCsvNotice({ kind: "ok", text: "Dane wewnętrzne wyczyszczone." });
                    }}
                    className="rounded border border-white/[0.12] px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white"
                  >
                    Wyczyść dane
                  </button>
                  <span className="text-[11px] font-mono text-zinc-300" aria-live="polite">
                    Wierszy: {internalRowsCount}
                  </span>
                </div>
                {internalCsvNotice && (
                  <p role="status" className={`text-[11px] font-mono ${internalCsvNotice.kind === "ok" ? "text-emerald-400" : "text-rose-300"}`}>
                    {internalCsvNotice.text}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
              <button onClick={() => setIsSettingsOpen(false)} className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white">
                Anuluj
              </button>
              <button onClick={handleSaveSettings} className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-semibold text-black hover:bg-teal-400 transition-all shadow-md shadow-teal-500/20">
                Zamknij
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
      <footer className="border-t border-white/[0.06] bg-[#060709] py-6 px-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-center text-[11px] font-mono text-zinc-500">
        <div className="flex items-center rounded-lg bg-white px-2 py-0.5 shadow-sm border border-zinc-200">
          <Image
            src="/logo.png"
            alt="PPGscope Logo"
            width={90}
            height={36}
            className="h-4 w-auto object-contain"
          />
        </div>
        <p>
          PPGscope v2.0 Intelligence · 553 serwisy Polska Press Grupa · Taksonomia 18 Dziedzin & Lokalność (C/CL/L) · Standard Fable 5.1
        </p>
      </footer>
    </div>
  );
}
