"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  Link2,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";

import type { BlindspotStatus } from "@/lib/forensics/blindspot";
import type { ForensicsPayload } from "@/lib/forensics/run";

type ApiResponse = ({ ok: true; cached: boolean } & ForensicsPayload) | { ok: false; error: string };
type ReadyData = Extract<ApiResponse, { ok: true }>;
type PanelState =
  | { status: "loading"; data: ReadyData | null }
  | { status: "error"; message: string; data: ReadyData | null }
  | { status: "ready"; data: ReadyData };
type SignalFilter = "ALL" | BlindspotStatus;

const REQUEST_TIMEOUT_MS = 30_000;
const TIMELINE_WINDOW_MINUTES = 360;

function formatTime(iso: string | null): string {
  if (!iso) return "brak daty";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "brak daty";
  return date.toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" });
}

function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function statusLabel(status: BlindspotStatus): string {
  if (status === "POKRYTE") return "POKRYTE";
  if (status === "BRAK_W_PPG") return "BRAK W PPG";
  return "NIEROZSTRZYGALNE";
}

function statusDot(status: BlindspotStatus): string {
  if (status === "POKRYTE") return "bg-emerald-400";
  if (status === "BRAK_W_PPG") return "bg-rose-400";
  return "bg-amber-300";
}

function statusClasses(status: BlindspotStatus): string {
  if (status === "POKRYTE") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (status === "BRAK_W_PPG") return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  return "border-amber-300/20 bg-amber-300/10 text-amber-200";
}

function PanelCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a111b]/85 shadow-[0_12px_45px_rgba(0,0,0,0.18)] ${className}`}>
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sky-300">{icon}</span>
          <div className="min-w-0">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-100">{title}</h2>
            {subtitle ? <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {action ? <div className="shrink-0 text-[11px] text-sky-300">{action}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatusBadge({ status }: { status: BlindspotStatus }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${statusClasses(status)}`}><span className={`h-1.5 w-1.5 rounded-full ${statusDot(status)}`} />{statusLabel(status)}</span>;
}

function MetricTile({ label, value, detail, tone = "sky" }: { label: string; value: string; detail: string; tone?: "sky" | "rose" | "amber" | "emerald" }) {
  const tones = {
    sky: "text-sky-300",
    rose: "text-rose-300",
    amber: "text-amber-200",
    emerald: "text-emerald-300",
  } as const;
  return <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p><p className={`mt-1 text-2xl font-semibold tracking-tight ${tones[tone]}`}>{value}</p><p className="mt-1 text-[10px] text-slate-500">{detail}</p></div>;
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-sky-300 transition hover:text-sky-200 hover:underline">{children}<ExternalLink className="h-3 w-3 shrink-0" /></a>;
}

export default function ForensicsPanel() {
  const [state, setState] = useState<PanelState>({ status: "loading", data: null });
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("ALL");
  const [selectedAlertLink, setSelectedAlertLink] = useState<string | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    setState((previous) => ({ status: "loading", data: previous.data }));
    try {
      const response = await fetch(`/api/forensics${refresh ? "?refresh=1" : ""}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok || !body.ok) throw new Error(body.ok ? `HTTP ${response.status}` : body.error);
      setState({ status: "ready", data: body });
    } catch (error) {
      const message = error instanceof DOMException && error.name === "TimeoutError" ? "Skan trwał zbyt długo. Zachowano ostatni wynik." : error instanceof Error ? error.message : "Nie udało się pobrać skanu.";
      setState((previous) => ({ status: "error", message, data: previous.data }));
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(false), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const data = state.data;
  const counts = useMemo(() => {
    const result: Record<BlindspotStatus, number> = { POKRYTE: 0, BRAK_W_PPG: 0, NIEROZSTRZYGALNE: 0 };
    for (const comparison of data?.blindspot ?? []) for (const row of comparison.rows) result[row.status] += 1;
    return result;
  }, [data]);

  const alerts = useMemo(() => (data?.blindspot ?? []).flatMap((comparison) => comparison.rows.map((row) => ({ ...row, competitorName: comparison.competitorName, competitorId: comparison.competitorId, region: comparison.region, feedOk: comparison.feedOk }))).sort((a, b) => a.ageMinutes - b.ageMinutes), [data]);
  const visibleAlerts = useMemo(() => signalFilter === "ALL" ? alerts : alerts.filter((row) => row.status === signalFilter), [alerts, signalFilter]);
  const selectedAlert = alerts.find((row) => row.link === selectedAlertLink) ?? alerts[0] ?? null;
  const timelineAlerts = alerts.filter((row) => row.ageMinutes <= TIMELINE_WINDOW_MINUTES).slice(0, 12);
  const onlineSources = data?.sources.filter((source) => source.ok).length ?? 0;
  const outageCount = data?.sources.filter((source) => !source.ok).length ?? 0;
  const sourceCount = data?.sources.length ?? 0;
  const maxCompetitorSignals = Math.max(...(data?.blindspot.map((comparison) => comparison.rows.length) ?? []), 1);
  const regions = useMemo(() => (data?.blindspot ?? []).map((comparison) => ({ ...comparison, unresolved: comparison.rows.filter((row) => row.status === "NIEROZSTRZYGALNE").length })).sort((a, b) => b.rows.length - a.rows.length), [data]);

  if (!data) {
    return <div className="min-h-[calc(100vh-7rem)] bg-[#060b12] p-4 text-slate-100 sm:p-6"><LoadingState message={state.status === "error" ? state.message : "Uruchamiam skan źródeł publicznych…"} /></div>;
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden text-slate-100">
      <div className="mx-auto w-full min-w-0 max-w-[1640px] space-y-5">
        <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500"><span className="inline-flex items-center gap-2 text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />LIVE OSINT</span><span className="text-slate-700">/</span><span>ostatni skan {formatTime(data.measuredAt)}</span><span className="text-slate-700">/</span><span>{data.cached ? "cache 5 min" : "świeży skan"}</span></div>
            <h1 className="max-w-4xl text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.045em] text-white">Co przeoczyliśmy dzisiaj?</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">Sygnały z publicznych kanałów konkurencji, których nie znaleźliśmy w próbce PPG. Każdy wiersz ma źródło, czas i status dowodu — to system do weryfikacji, nie automatyczny wyrok.</p>
          </div>
          <div className="flex flex-wrap shrink-0 items-center gap-2"><span className="hidden rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-300 sm:inline-flex">metodologia {data.methodologyVersion}</span><button type="button" onClick={() => void load(true)} className="inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-sky-300/40 hover:bg-sky-300/10"><RefreshCw className={`h-3.5 w-3.5 ${state.status === "loading" ? "animate-spin" : ""}`} />Odśwież skan</button></div>
        </header>

        {state.status === "error" ? <div className="flex items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-xs text-amber-100"><AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" /><span>{state.message} Widoczny wynik pochodzi z ostatniego udanego pomiaru.</span></div> : null}

        <section className="grid gap-4 rounded-2xl border border-white/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_36%),#09121e] p-4 sm:p-6 shadow-[0_16px_70px_rgba(0,0,0,0.24)] lg:grid-cols-[1fr_420px] lg:items-end w-full min-w-0 max-w-full overflow-hidden">
          <div><div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500"><ShieldAlert className="h-4 w-4 text-sky-300" />panel dowodowy / przybliżenie</div><p className="max-w-2xl text-sm leading-7 text-slate-300">Porównanie obejmuje RSS/Atom i leady z kanałów publicznych. Brak dopasowania jest sygnałem do sprawdzenia, a nie dowodem, że temat nie został opublikowany gdzie indziej.</p><div className="mt-5 flex flex-wrap gap-2 text-[10px] text-slate-400"><span className="rounded-md border border-white/[0.1] px-2.5 py-1.5">źródła zweryfikowane: {data.verifiedSourcesOn}</span><span className="rounded-md border border-white/[0.1] px-2.5 py-1.5">okno analizy: 24 h</span><span className="rounded-md border border-white/[0.1] px-2.5 py-1.5">bez pełnego HTML</span></div></div>
          <div className="grid grid-cols-2 gap-2"><MetricTile label="brak w próbce PPG" value={`${counts.BRAK_W_PPG}`} detail="zweryfikowane sygnały" tone="rose" /><MetricTile label="do rozstrzygnięcia" value={`${counts.NIEROZSTRZYGALNE}`} detail="jawny powód niepewności" tone="amber" /><MetricTile label="źródła online" value={`${onlineSources}/${sourceCount}`} detail={outageCount ? `${outageCount} z błędem` : "bez awarii"} tone="emerald" /><MetricTile label="pokryte" value={`${counts.POKRYTE}`} detail="znaleziony odpowiednik PPG" tone="sky" /></div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#09121e] w-full min-w-0 max-w-full"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sky-300" /><span className="text-[12px] font-bold uppercase tracking-[0.12em]">Aktywność w monitorowanych regionach</span><span className="text-[10px] text-slate-500">ostatnie 24 godziny</span></div><span className="text-[10px] text-slate-500">{regions.length} pary konkurencyjne</span></div><div className="grid divide-y divide-white/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0">{regions.length ? regions.map((region) => <div key={region.competitorId} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{region.region}</p><p className="mt-1 text-sm font-semibold text-slate-200">{region.competitorName}</p></div><div className="text-right"><p className="text-xl font-semibold text-white">{region.rows.length}</p><p className="text-[10px] text-slate-500">sygnałów <span className="text-amber-200">/ {region.unresolved} niepewnych</span></p></div></div>) : <div className="px-5 py-6 text-xs text-slate-500">Brak danych regionalnych.</div>}</div></section>

        <div className="grid items-start gap-5 xl:grid-cols-[1.08fr_0.92fr_0.95fr] w-full min-w-0 max-w-full">
          <PanelCard title="Sygnały do weryfikacji" subtitle="Konkurencja vs próbka PPG · sortowanie od najnowszych" icon={<Bell className="h-4 w-4" />} action={<span>{visibleAlerts.length} z {alerts.length}</span>}>
            <div className="mb-4 flex flex-wrap gap-1.5">{(["ALL", "BRAK_W_PPG", "NIEROZSTRZYGALNE", "POKRYTE"] as SignalFilter[]).map((filter) => <button key={filter} type="button" onClick={() => setSignalFilter(filter)} className={`rounded-md px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] transition ${signalFilter === filter ? "bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/30" : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"}`}>{filter === "ALL" ? "wszystkie" : statusLabel(filter)}</button>)}</div>
            <div className="space-y-2">{visibleAlerts.length ? visibleAlerts.slice(0, 9).map((row) => <button key={row.link} type="button" onClick={() => setSelectedAlertLink(row.link)} className={`group w-full rounded-xl border p-3 text-left transition ${selectedAlert?.link === row.link ? "border-sky-300/40 bg-sky-300/[0.08]" : "border-white/[0.07] bg-black/15 hover:border-white/[0.15] hover:bg-white/[0.04]"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-1 flex items-center gap-2 text-[10px] text-slate-500"><span>{formatClock(row.publishedAt)}</span><span className="h-1 w-1 rounded-full bg-slate-700" /><span className="truncate">{row.competitorName}</span></div><p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-100 group-hover:text-sky-100">{row.title}</p></div><StatusBadge status={row.status} /></div><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500"><span>{row.ageMinutes < 60 ? `${row.ageMinutes} min temu` : `${formatAge(row.ageMinutes)} temu`}</span>{row.match ? <span className="text-emerald-300">dopasowanie: {row.match.portalName}</span> : row.undecidedReason ? <span className="text-amber-200">{row.undecidedReason}</span> : null}</div></button>) : <EmptyState icon={<Search className="h-4 w-4" />} text="Brak sygnałów w tym filtrze." />}</div>
            {visibleAlerts.length > 9 ? <p className="mt-4 text-center text-[10px] text-slate-500">Pokazano 9 najnowszych. Zawęź filtr, aby przejść do szczegółów.</p> : null}
          </PanelCard>

          <PanelCard title="Rotacja i świeżość czołówki" subtitle="Analiza odstępów publikacyjnych i przestojów w strumieniach RSS" icon={<Clock3 className="h-4 w-4" />} action={<span>{data.streamIntelligence?.rotation.activeFeedsCount ?? 0} aktywnych</span>}>
            {data.streamIntelligence?.rotation ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <MetricTile
                    label="aktywne redakcje"
                    value={`${data.streamIntelligence.rotation.activeFeedsCount}`}
                    detail="świeży news < 2 h"
                    tone="emerald"
                  />
                  <MetricTile
                    label="zastygła czołówka"
                    value={`${data.streamIntelligence.rotation.staleFeedsCount}`}
                    detail="brak newsa > 6 h"
                    tone={data.streamIntelligence.rotation.staleFeedsCount > 0 ? "rose" : "sky"}
                  />
                </div>

                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Świeżość wydań dzienników PPG</p>
                  {data.streamIntelligence.rotation.sources.map((source) => {
                    const statusColor =
                      source.status === "AKTYWNA_ROTACJA"
                        ? "text-emerald-300 border-emerald-400/20 bg-emerald-400/10"
                        : source.status === "SPOWOLNIONA"
                        ? "text-amber-200 border-amber-300/20 bg-amber-300/10"
                        : "text-rose-300 border-rose-400/20 bg-rose-400/10";
                    const statusText =
                      source.status === "AKTYWNA_ROTACJA"
                        ? "aktywna rotacja"
                        : source.status === "SPOWOLNIONA"
                        ? "spowolniony rytm"
                        : source.status === "ZASTYGLA_CZOLOWKA"
                        ? "zastygła czołówka"
                        : source.error
                        ? "błąd źródła"
                        : "brak danych";

                    const metricDetail =
                      source.medianIntervalMinutes !== null
                        ? `mediana: co ${source.medianIntervalMinutes} min (${source.itemCount} mat.)`
                        : source.itemCount === 1
                        ? "1 materiał"
                        : source.itemCount > 1
                        ? `${source.itemCount} materiałów`
                        : source.error
                        ? `błąd: ${source.error}`
                        : "0 materiałów";

                    return (
                      <div key={source.sourceId} className="rounded-xl border border-white/[0.07] bg-black/20 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold text-slate-200">{source.sourceName}</span>
                          <span
                            title={source.error ?? undefined}
                            className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${statusColor}`}
                          >
                            {statusText}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            ostatnia: {source.ageMinutes !== null ? formatAge(source.ageMinutes) + " temu" : "brak daty"}
                          </span>
                          <span className={source.error ? "text-rose-300" : ""}>
                            {metricDetail}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {data.streamIntelligence.rotation.regionalComparisons.length > 0 ? (
                  <div className="border-t border-white/[0.07] pt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Tempo: PPG vs Konkurencja</p>
                    <div className="space-y-1.5">
                      {data.streamIntelligence.rotation.regionalComparisons.map((c) => (
                        <div key={c.competitorSourceId} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2.5 py-1.5 text-[11px]">
                          <span className="text-slate-400">{c.region}</span>
                          <span className={c.fasterMedium === "PPG" ? "font-semibold text-emerald-300" : c.fasterMedium === "KONKURENT" ? "font-semibold text-rose-300" : "text-slate-400"}>
                            {c.fasterMedium === "PPG"
                              ? `PPG szybsze o ${c.freshnessGapMinutes !== null ? formatAge(Math.abs(c.freshnessGapMinutes)) : ""}`
                              : c.fasterMedium === "KONKURENT"
                              ? `${c.competitorSourceName} szybsze o ${c.freshnessGapMinutes !== null ? formatAge(Math.abs(c.freshnessGapMinutes)) : ""}`
                              : "remis"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {data.blindspot.map((comparison) => {
                  const width = Math.max(8, Math.round((comparison.rows.length / maxCompetitorSignals) * 100));
                  return (
                    <div key={comparison.competitorId}>
                      <div className="mb-1.5 flex justify-between gap-3 text-xs">
                        <span className="truncate font-medium text-slate-300">{comparison.competitorName}</span>
                        <span className="font-mono text-slate-500">{comparison.rows.length}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-sky-400/80" style={{ width: `${width}%` }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-slate-600">
                        <span>{comparison.region}</span>
                        <span>{comparison.feedOk ? "kanał OK" : "kanał niedostępny"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </PanelCard>

          <PanelCard title="Dowody" subtitle="Źródła, dopasowanie i granice wniosku" icon={<Link2 className="h-4 w-4" />} action={<span>ślad audytowy</span>}>
            {selectedAlert ? <div className="space-y-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">wybrany sygnał</p><p className="mt-1 text-base font-semibold leading-6 text-white">{selectedAlert.title}</p></div><StatusBadge status={selectedAlert.status} /></div><div className="rounded-xl border border-white/[0.08] bg-black/20 p-3 text-xs"><div className="flex items-center gap-2 text-slate-500"><Globe2 className="h-3.5 w-3.5" />źródło konkurencji</div><div className="mt-2"><InlineLink href={selectedAlert.link}>{selectedAlert.competitorName} · {selectedAlert.region}</InlineLink></div><p className="mt-1 text-[10px] text-slate-600">opublikowano {formatTime(selectedAlert.publishedAt)}</p></div>{selectedAlert.match ? <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/[0.07] p-3 text-xs"><div className="flex items-center gap-2 font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" />znaleziono odpowiednik w PPG</div><p className="mt-2 leading-5 text-slate-300">{selectedAlert.match.title}</p><div className="mt-2"><InlineLink href={selectedAlert.match.link}>{selectedAlert.match.portalName}</InlineLink></div>{selectedAlert.match.lagMinutes !== null ? <p className="mt-1 text-[10px] text-slate-500">różnica czasu: {selectedAlert.match.lagMinutes >= 0 ? "PPG później" : "PPG wcześniej"} o {formatAge(Math.abs(selectedAlert.match.lagMinutes))}</p> : null}</div> : <div className={`rounded-xl border p-3 text-xs ${selectedAlert.status === "BRAK_W_PPG" ? "border-rose-300/20 bg-rose-300/[0.07]" : "border-amber-300/20 bg-amber-300/[0.07]"}`}><div className={`flex items-center gap-2 font-semibold ${selectedAlert.status === "BRAK_W_PPG" ? "text-rose-300" : "text-amber-200"}`}>{selectedAlert.status === "BRAK_W_PPG" ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{selectedAlert.status === "BRAK_W_PPG" ? "brak dopasowania w próbce PPG" : "wynik nierozstrzygnięty"}</div><p className="mt-2 leading-5 text-slate-400">{selectedAlert.undecidedReason ?? "Sygnał wymaga ręcznej weryfikacji w pełnych serwisach."}</p></div>}<div className="border-t border-white/[0.07] pt-4 text-[10px] leading-5 text-slate-500"><p className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" />Ocena dotyczy tytułu i leada z RSS/Atom. Nie rozstrzyga o autorstwie, pełnej treści ani intencji redakcji.</p></div></div> : <EmptyState icon={<Link2 className="h-4 w-4" />} text="Wybierz sygnał, aby zobaczyć jego źródła." />}
          </PanelCard>
        </div>

        <PanelCard title="Oś czasu alertów" subtitle="Najnowsze sygnały w monitorowanym oknie · kliknij punkt, aby otworzyć dowód" icon={<Clock3 className="h-4 w-4" />} action={<span>ostatnie 6 h</span>}>
          {timelineAlerts.length ? <div className="w-full min-w-0 max-w-full overflow-x-auto pb-1"><div className="relative min-w-[700px] px-3 pb-2 pt-7"><div className="absolute left-3 right-3 top-[52px] h-px bg-slate-700" />{timelineAlerts.map((row, index) => { const position = timelineAlerts.length === 1 ? 50 : (index / (timelineAlerts.length - 1)) * 100; return <button key={row.link} type="button" onClick={() => setSelectedAlertLink(row.link)} className="group absolute top-0 -translate-x-1/2 text-center" style={{ left: `${position}%` }}><span className={`mx-auto block h-3.5 w-3.5 rounded-full border-2 border-[#09121e] ${statusDot(row.status)} shadow-[0_0_0_3px_rgba(255,255,255,0.05)] transition group-hover:scale-125`} /><span className="mt-3 block whitespace-nowrap text-[10px] font-semibold text-slate-400 group-hover:text-white">{formatClock(row.publishedAt)}</span><span className="mx-auto mt-2 block max-w-[120px] truncate text-[10px] text-slate-600">{row.competitorName}</span></button>; })}</div></div> : <EmptyState icon={<Clock3 className="h-4 w-4" />} text="Brak sygnałów w ostatnich 6 godzinach." />}
        </PanelCard>

        <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr] w-full min-w-0 max-w-full">
          <PanelCard title="Stan publicznych źródeł" subtitle="Ostatni pomiar HTTP i liczba elementów odczytanych z kanału" icon={<Globe2 className="h-4 w-4" />} action={<span>{onlineSources}/{sourceCount} online</span>}>
            <div className="w-full min-w-0 max-w-full overflow-x-auto"><table className="w-full min-w-[650px] text-left text-[11px]"><thead className="border-b border-white/[0.08] text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600"><tr><th className="pb-3 pr-3">źródło</th><th className="pb-3 pr-3">rola</th><th className="pb-3 pr-3">HTTP</th><th className="pb-3 pr-3">elementy</th><th className="pb-3">czas</th></tr></thead><tbody className="divide-y divide-white/[0.06]">{data.sources.map((source) => <tr key={source.id}><td className="max-w-[240px] py-3 pr-3"><div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${source.ok ? "bg-emerald-400" : "bg-rose-400"}`} /><span className="truncate font-medium text-slate-300">{source.name}</span></div><a href={source.url} target="_blank" rel="noopener noreferrer" className="ml-3.5 mt-1 block max-w-[220px] truncate text-[10px] text-slate-600 hover:text-sky-300">{source.url}</a></td><td className="py-3 pr-3 text-slate-500">{source.role}</td><td className={`py-3 pr-3 font-mono ${source.ok ? "text-emerald-300" : "text-rose-300"}`}>{source.httpStatus || "—"}</td><td className="py-3 pr-3 font-mono text-slate-400">{source.items}</td><td className="py-3 font-mono text-slate-500">{source.latencyMs} ms</td></tr>)}</tbody></table></div>
          </PanelCard>

          <PanelCard title="Rytm newsroomu" subtitle="Wskaźniki policzone z próby RSS/Atom PPG" icon={<Users className="h-4 w-4" />} action={<span>{data.newsroom.sampleSize} tekstów</span>}>
            <div className="grid grid-cols-2 gap-2"><MetricTile label="podpisani" value={`${data.newsroom.namedCount}`} detail="teksty z autorem" tone="sky" /><MetricTile label="opracowania" value={`${data.newsroom.adaptationCount}`} detail="oznaczone „opr.”" tone="amber" /><MetricTile label="bez autora" value={`${data.newsroom.unnamedCount}`} detail="redakcja/agencja/brak" tone="rose" /><MetricTile label="minuty :00/:15" value={`${data.newsroom.cronMinutePct}%`} detail={`baseline ${data.newsroom.cronBaselinePct}%`} tone="emerald" /></div><div className="mt-5 rounded-xl border border-white/[0.08] bg-black/20 p-3"><div className="flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-slate-500"><span>najczęściej podpisani</span><span>{data.newsroom.top3SharePct === null ? "próba za mała" : `${data.newsroom.top3SharePct}% top 3`}</span></div><div className="mt-3 space-y-2">{data.newsroom.authors.slice(0, 3).map((author) => <div key={author.author} className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-slate-300">{author.author}</span><span className="shrink-0 font-mono text-slate-500">{author.articles}</span></div>)}{data.newsroom.authors.length === 0 ? <p className="text-xs text-slate-600">Brak wystarczających podpisów w kanale.</p> : null}</div></div>
          </PanelCard>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-3 w-full min-w-0 max-w-full">
          <PanelCard title="Lead ↔ komunikat instytucji" subtitle="Dosłowne podobieństwo leadu PPG do kanałów oficjalnych" icon={<FileText className="h-4 w-4" />} action={<span>{data.verbatim.rows.length} trafień</span>}>
            <div className="mb-4 flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/20 px-3 py-3 text-[11px]"><span className="text-slate-500">sprawdzone leady</span><span className="font-mono text-slate-200">{data.verbatim.checkedLeads} <span className="text-slate-600">/ pominięte {data.verbatim.skippedShortLeads}</span></span></div>
            <div className="space-y-2">{data.verbatim.rows.slice(0, 5).map((row) => <div key={`${row.link}-${row.officialLink}`} className="rounded-xl border border-white/[0.07] p-3"><div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-xs font-semibold leading-5 text-slate-200">{row.title}</p><span className={`shrink-0 rounded px-2 py-1 text-[9px] font-bold ${row.level === "PRZEPISANY_KOMUNIKAT" ? "bg-rose-400/10 text-rose-300" : "bg-amber-300/10 text-amber-200"}`}>{row.verbatimPct}%</span></div><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500"><InlineLink href={row.link}>{row.portalName}</InlineLink><span>↔</span><InlineLink href={row.officialLink}>{row.institutionName}</InlineLink></div></div>)}{data.verbatim.rows.length === 0 ? <EmptyState icon={<FileText className="h-4 w-4" />} text="Brak wystarczająco długich leadów z podobieństwem powyżej progu." /> : null}</div>
          </PanelCard>

          <PanelCard
            title="Strefa Plus w RSS"
            subtitle="Syndykacja materiałów płatnych w otwartym strumieniu"
            icon={<Radio className="h-4 w-4" />}
            action={<span>{data.streamIntelligence?.paywall.paywallCount ?? 0} tekstów</span>}
          >
            {data.streamIntelligence?.paywall ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <MetricTile
                    label="materiały płatne"
                    value={`${data.streamIntelligence.paywall.paywallCount}`}
                    detail="oznaczone /ar/c1- lub [PLUS]"
                    tone={data.streamIntelligence.paywall.paywallCount > 0 ? "rose" : "emerald"}
                  />
                  <MetricTile
                    label="udział w strumieniu"
                    value={`${data.streamIntelligence.paywall.paywallSharePct}%`}
                    detail={`z ${data.streamIntelligence.paywall.checkedCount} zbadanych`}
                    tone="sky"
                  />
                </div>
                <div className="space-y-2">
                  {data.streamIntelligence.paywall.items.slice(0, 4).map((item) => (
                    <div key={item.link} className="rounded-xl border border-white/[0.07] p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-xs font-semibold leading-4 text-slate-200">{item.title}</p>
                        <span className="shrink-0 rounded bg-rose-400/10 px-1.5 py-0.5 text-[8px] font-bold text-rose-300 border border-rose-400/20">PLUS</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                        <InlineLink href={item.link}>{item.portalName}</InlineLink>
                        <span>lead: {item.leadLength} znaków</span>
                      </div>
                    </div>
                  ))}
                  {data.streamIntelligence.paywall.items.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500">
                      Brak artykułów ze Strefy Plus w aktualnym strumieniu publicznym (syndykacja czysta).
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="py-4 text-xs text-slate-500">Brak danych strumieniowych.</div>
            )}
          </PanelCard>

          <PanelCard
            title="Audyt linków i agencji"
            subtitle="Linki zewnętrzne, teksty partnerskie i agencje"
            icon={<Link2 className="h-4 w-4" />}
            action={<span>{data.streamIntelligence?.links.items.length ?? 0} sygnałów</span>}
          >
            {data.streamIntelligence?.links ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-1.5">
                  <MetricTile
                    label="linki zewn."
                    value={`${data.streamIntelligence.links.externalLinksCount}`}
                    detail="w leadach"
                    tone="sky"
                  />
                  <MetricTile
                    label="sponsorowane"
                    value={`${data.streamIntelligence.links.sponsoredCount}`}
                    detail="artykuły partnera"
                    tone="amber"
                  />
                  <MetricTile
                    label="agencje"
                    value={`${data.streamIntelligence.links.agencyCount}`}
                    detail="PAP / IAR"
                    tone="emerald"
                  />
                </div>
                <div className="space-y-2">
                  {data.streamIntelligence.links.items.slice(0, 4).map((item, idx) => (
                    <div key={`${item.link}-${idx}`} className="rounded-xl border border-white/[0.07] p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-xs font-semibold text-slate-200">{item.title}</p>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold border ${
                          item.type === "LINK_ZEWNETRZNY" ? "border-sky-400/20 bg-sky-400/10 text-sky-300" :
                          item.type === "SPONSOROWANY" ? "border-amber-400/20 bg-amber-400/10 text-amber-300" :
                          "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        }`}>{item.type === "LINK_ZEWNETRZNY" ? "LINK" : item.type === "SPONSOROWANY" ? "REKLAMA" : "AGENCJA"}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-400">{item.detail}</p>
                      <div className="mt-1 flex items-center justify-between text-[9px] text-slate-500">
                        <InlineLink href={item.link}>{item.portalName}</InlineLink>
                        {item.targetUrl ? <span className="truncate max-w-[120px]">{item.targetUrl}</span> : null}
                      </div>
                    </div>
                  ))}
                  {data.streamIntelligence.links.items.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500">
                      Brak odnośników komercyjnych ani oznaczeń partnerskich w zbadanych leadach.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="py-4 text-xs text-slate-500">Brak danych strumieniowych.</div>
            )}
          </PanelCard>
        </div>

        <footer className="flex flex-col gap-2 border-t border-white/[0.08] pt-4 text-[10px] leading-5 text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-center gap-2"><ShieldAlert className="h-3.5 w-3.5 text-sky-300/70" />Wszystkie wskaźniki oznaczone jako PRZYBLIŻENIE. Pełna analiza wymaga dostępu do HTML i danych odsłon.</span><span>stan pomiaru: {formatTime(data.measuredAt)}</span></footer>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="flex min-h-24 items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] px-4 text-center text-xs text-slate-500">{icon}{text}</div>;
}

function LoadingState({ message }: { message: string }) {
  return <div className="mx-auto max-w-[1640px] space-y-5"><div className="flex items-center gap-3 border-b border-white/[0.08] pb-5"><RefreshCw className="h-5 w-5 animate-spin text-sky-300" /><div><p className="text-sm font-semibold text-white">Szyba śledcza</p><p className="mt-1 text-xs text-slate-500">{message}</p></div></div><div className="grid gap-5 xl:grid-cols-3">{["Sygnały do weryfikacji", "Aktywność konkurencji", "Dowody"].map((title) => <div key={title} className="h-96 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"><div className="h-4 w-36 rounded bg-white/[0.08]" /><div className="mt-8 space-y-4"><div className="h-16 rounded-xl bg-white/[0.05]" /><div className="h-16 rounded-xl bg-white/[0.05]" /><div className="h-16 rounded-xl bg-white/[0.05]" /></div></div>)}</div></div>;
}
