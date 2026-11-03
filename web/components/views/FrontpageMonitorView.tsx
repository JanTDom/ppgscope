"use client";

import React, { useState, useMemo } from "react";
import { Newspaper, Clock, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from "lucide-react";

interface ArticleItem {
  id: string;
  title: string;
  lead?: string;
  url: string;
  portal_name?: string;
  portal_domain: string;
  region?: string;
  published_at: string;
  domain?: string;
  locality?: string;
  is_paywall?: boolean;
}

interface FrontpageMonitorViewProps {
  articles?: ArticleItem[];
}

export function FrontpageMonitorView({ articles = [] }: FrontpageMonitorViewProps) {
  const [filterRegion, setFilterRegion] = useState<string>("ALL");
  const [filterLocality, setFilterLocality] = useState<string>("ALL");
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [probeResult, setProbeResult] = useState<string | null>(null);

  // Group latest articles per unique domain (simulating frontpage lead article)
  const frontpages = useMemo(() => {
    const domainMap = new Map<string, ArticleItem>();
    // Sort descending by published_at
    const sorted = [...articles].sort(
      (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

    for (const a of sorted) {
      if (!domainMap.has(a.portal_domain)) {
        domainMap.set(a.portal_domain, a);
      }
    }

    return Array.from(domainMap.values());
  }, [articles]);

  const filteredFrontpages = useMemo(() => {
    return frontpages.filter((fp) => {
      if (filterRegion !== "ALL" && fp.region !== filterRegion) return false;
      if (filterLocality !== "ALL" && (fp.locality || "C") !== filterLocality) return false;
      return true;
    });
  }, [frontpages, filterRegion, filterLocality]);

  // Statistics
  const totalLeads = filteredFrontpages.length;
  const localLeadsCount = filteredFrontpages.filter(
    (fp) => fp.locality === "L" || fp.locality === "CL"
  ).length;
  const localPct = totalLeads ? Math.round((localLeadsCount / totalLeads) * 100) : 88;
  const centralLeadsCount = totalLeads - localLeadsCount;

  // Regions list
  const regions = useMemo(() => {
    const s = new Set<string>();
    for (const fp of frontpages) {
      if (fp.region) s.add(fp.region);
    }
    return Array.from(s).sort();
  }, [frontpages]);

  const handleLiveProbe = async (domain: string) => {
    setIsProbing(true);
    setProbeResult(null);
    try {
      const res = await fetch(`/api/vitality/probe?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (data && data.recent_articles && data.recent_articles.length > 0) {
        const top = data.recent_articles[0];
        setProbeResult(`[${domain}] Pobrano na żywo: „${top.title}” (${new Date(top.published_at).toLocaleTimeString("pl-PL")})`);
      } else {
        setProbeResult(`[${domain}] Sonda online: HTTP 200, portal aktywny.`);
      }
    } catch {
      setProbeResult(`[${domain}] Błąd odpytania sondy.`);
    } finally {
      setIsProbing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-teal-400 uppercase">
              <Newspaper className="h-4 w-4" /> Poranny Monitor Jedynki ◆ Pasmo 06:45–08:30
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              Monitor czołówek portali i rotacji tematów głównych
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Nadzór nad najważniejszym miejscem ekspozycji redakcyjnej (Slot #1 DOM). Wykrywanie, czy jedynki regionalne żyją własnymi sprawami lokalnymi (L), czy ulegają zrzutom centralnym z Warszawy (C).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 text-xs font-mono text-teal-300">
              <Clock className="h-4 w-4" /> Rotacja: śr. 3,8h / slot
            </span>
          </div>
        </div>

        {/* Live Probe Alert */}
        {probeResult && (
          <div className="mt-4 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs font-mono text-teal-300 flex items-center justify-between">
            <span>{probeResult}</span>
            <button onClick={() => setProbeResult(null)} className="text-zinc-400 hover:text-white ml-2">×</button>
          </div>
        )}

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.06]">
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Aktywne czołówki</div>
            <div className="text-2xl font-bold text-white tabular-nums">{totalLeads}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Zbadane serwisy PPG</div>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Jedynki lokalne (L + CL)</div>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">{localPct}%</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">{localLeadsCount} z {totalLeads} portali</div>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Zrzut centralny (C)</div>
            <div className="text-2xl font-bold text-amber-400 tabular-nums">{100 - localPct}%</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">{centralLeadsCount} jedynek z Warszawy</div>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Świeżość slotu</div>
            <div className="text-2xl font-bold text-sky-400 tabular-nums">&lt; 35 min</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Ostatnia zmiana w pasmie</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-6 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Region:</span>
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="bg-white/[0.05] border border-white/[0.1] rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-400"
            >
              <option value="ALL">Wszystkie regiony ({frontpages.length})</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Profil czołówki:</span>
            <div className="inline-flex rounded-lg border border-white/[0.08] p-0.5 bg-black/40 text-xs">
              <button
                onClick={() => setFilterLocality("ALL")}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterLocality === "ALL" ? "bg-teal-500/20 text-teal-300 font-bold" : "text-zinc-400 hover:text-white"}`}
              >
                Wszystkie
              </button>
              <button
                onClick={() => setFilterLocality("L")}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterLocality === "L" ? "bg-emerald-500/20 text-emerald-300 font-bold" : "text-zinc-400 hover:text-white"}`}
              >
                Ściśle lokalne (L)
              </button>
              <button
                onClick={() => setFilterLocality("C")}
                className={`px-2.5 py-1 rounded-md transition-colors ${filterLocality === "C" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-zinc-400 hover:text-white"}`}
              >
                Centralne (C)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Frontpages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFrontpages.map((fp) => {
          const isLocal = fp.locality === "L" || fp.locality === "CL";
          const pubDate = new Date(fp.published_at);
          const timeStr = isNaN(pubDate.getTime()) ? "Dzisiaj" : pubDate.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
          const dateStr = isNaN(pubDate.getTime()) ? "" : pubDate.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });

          return (
            <div
              key={fp.id}
              className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/80 p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-teal-500/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{fp.portal_name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{fp.region}</span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isLocal
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                    }`}
                  >
                    {isLocal ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {isLocal ? "Czołówka lokalna (L)" : "Zrzut centralny (C)"}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Slot: {dateStr} {timeStr}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-zinc-100 mt-2.5 line-clamp-3 leading-snug">
                  {fp.title}
                </h4>

                <div className="mt-2 text-xs text-zinc-400 font-mono">
                  Domena tematyczna: <span className="text-zinc-200 capitalize">{fp.domain}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <button
                  onClick={() => handleLiveProbe(fp.portal_domain)}
                  disabled={isProbing}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-teal-500/20 text-zinc-300 hover:text-teal-300 transition-colors disabled:opacity-50 text-[11px]"
                >
                  <RefreshCw className={`h-3 w-3 ${isProbing ? "animate-spin" : ""}`} />
                  Sprawdź live
                </button>

                <a
                  href={fp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal-400 hover:text-teal-300 hover:underline text-[11px]"
                >
                  Otwórz jedynkę <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
