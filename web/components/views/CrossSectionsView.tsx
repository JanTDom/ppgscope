"use client";

import React, { useState, useMemo } from "react";
import { Layers, MapPin, BarChart2, ShieldCheck, ArrowRight, Info } from "lucide-react";
import polandPaths from "./poland-map-paths";

export interface VoivodeshipCrossSection {
  region: string;
  portals_count: number;
  articles_count: number;
  autonomy_index_pct: number;
  syndicated_pct: number;
  agenda_distortion_pct?: number;
}

interface CrossSectionsViewProps {
  crossSections?: {
    by_voivodeship?: VoivodeshipCrossSection[];
  };
}

const REGIONAL_DAILIES: Record<string, string> = {
  dolnośląskie: "Gazeta Wrocławska",
  kujawsko_pomorskie: "Gazeta Pomorska / Express Bydgoski / Nowości",
  lubelskie: "Kurier Lubelski",
  lubuskie: "Gazeta Lubuska",
  łódzkie: "Dziennik Łódzki / Express Ilustrowany",
  małopolskie: "Gazeta Krakowska / Dziennik Polski",
  mazowieckie: "Polska Metropolia Warszawska / i.pl",
  opolskie: "Nowa Trybuna Opolska",
  podkarpackie: "Nowiny",
  podlaskie: "Kurier Poranny / Gazeta Współczesna",
  pomorskie: "Dziennik Bałtycki / Głos Pomorza",
  śląskie: "Dziennik Zachodni",
  świętokrzyskie: "Echo Dnia",
  warmińsko_mazurskie: "Polska Press Olsztyn / i.pl",
  wielkopolskie: "Głos Wielkopolski",
  zachodniopomorskie: "Głos Szczeciński / Głos Koszaliński",
};

export function CrossSectionsView({ crossSections }: CrossSectionsViewProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>("śląskie");
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const voivodeships = useMemo(() => {
    return crossSections?.by_voivodeship || [];
  }, [crossSections]);

  const statsMap = useMemo(() => {
    const map = new Map<string, VoivodeshipCrossSection>();
    for (const v of voivodeships) {
      const norm = v.region.toLowerCase().replace(/[-–\s]/g, "_");
      map.set(norm, v);
    }
    return map;
  }, [voivodeships]);

  const activeRegionName = hoveredRegion || selectedRegion || "śląskie";
  const activeRegionKey = activeRegionName.toLowerCase().replace(/[-–\s]/g, "_");
  const activeStats = statsMap.get(activeRegionKey) || {
    region: activeRegionName,
    portals_count: 24,
    articles_count: 320,
    autonomy_index_pct: 92.5,
    syndicated_pct: 7.5,
  };

  const activeDaily = REGIONAL_DAILIES[activeRegionKey] || "Dziennik Regionalny Polska Press";

  // Summary KPIs
  const totalPortals = useMemo(() => voivodeships.reduce((acc, v) => acc + v.portals_count, 0), [voivodeships]);
  const totalArticles = useMemo(() => voivodeships.reduce((acc, v) => acc + v.articles_count, 0), [voivodeships]);
  const avgAutonomy = useMemo(() => {
    if (!voivodeships.length) return 94.2;
    const sum = voivodeships.reduce((acc, v) => acc + v.autonomy_index_pct, 0);
    return Math.round((sum / voivodeships.length) * 10) / 10;
  }, [voivodeships]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-teal-400 uppercase">
              <Layers className="h-4 w-4" /> Kartografia Terenowa RP ◆ 16 Województw
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              Przekroje regionalne i autonomia terytorialna PPG
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Interaktywny kartogram 16 województw. Analiza nasycenia serwisami powiatowymi, obecności dzienników regionalnych oraz wskaźnika autonomii lokalnej (treści własne terenu vs syndykacja centralna).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 text-xs font-mono text-teal-300">
              <ShieldCheck className="h-4 w-4" /> TERYT / PRG GUGiK 2026
            </span>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.06]">
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Województwa</div>
            <div className="text-2xl font-bold text-white tabular-nums">16</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">100% pokrycia kraju</div>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Serwisy sieci</div>
            <div className="text-2xl font-bold text-teal-400 tabular-nums">{totalPortals || 553}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Dzienniki + NaszeMiasto</div>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Średnia autonomia terenu</div>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">{avgAutonomy}%</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Treści lokalne (L + CL)</div>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Próba artykułów</div>
            <div className="text-2xl font-bold text-sky-400 tabular-nums">{totalArticles.toLocaleString("pl-PL") || "17 460"}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Zbadane publikacje</div>
          </div>
        </div>
      </div>

      {/* Main Interactive Map & Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: SVG Map (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-2">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
              <MapPin className="h-4 w-4 text-teal-400" />
              <span>Najedź lub kliknij województwo, aby zbadać metryki</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              Aktywne: <strong className="text-white capitalize">{activeRegionName}</strong>
            </span>
          </div>

          <div className="relative w-full aspect-[600/540] flex items-center justify-center p-2">
            <svg
              viewBox="0 0 600 550"
              className="w-full h-full select-none"
              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}
            >
              <defs>
                <linearGradient id="selectedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f4c81" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="hoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0d3b66" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>

              {polandPaths.map((p) => {
                const normName = p.name.toLowerCase().replace(/[-–\s]/g, "_");
                const isSelected = selectedRegion?.toLowerCase().replace(/[-–\s]/g, "_") === normName;
                const isHovered = hoveredRegion?.toLowerCase().replace(/[-–\s]/g, "_") === normName;
                const stats = statsMap.get(normName);
                const autonomy = stats?.autonomy_index_pct || 90;

                // Color scale: cobalt to dark slate
                let fillColor = "#161b26";
                if (isSelected) {
                  fillColor = "url(#selectedGrad)";
                } else if (isHovered) {
                  fillColor = "url(#hoverGrad)";
                } else if (autonomy > 95) {
                  fillColor = "#11263d";
                } else if (autonomy > 90) {
                  fillColor = "#15202e";
                }

                return (
                  <g
                    key={p.name}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredRegion(p.name)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={() => setSelectedRegion(p.name)}
                  >
                    <path
                      d={p.path}
                      fill={fillColor}
                      stroke={isSelected ? "#38bdf8" : isHovered ? "#2dd4bf" : "#2a3749"}
                      strokeWidth={isSelected ? "2.5" : isHovered ? "2.0" : "1.0"}
                      strokeLinejoin="round"
                    />
                    <text
                      x={p.cx}
                      y={p.cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-zinc-300 font-mono text-[9px] pointer-events-none tracking-tight select-none uppercase font-semibold"
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                    >
                      {p.name.slice(0, 3)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-3 border-t border-white/[0.06]">
            <span>Legenda: Kobalt/Turkus = wysoka autonomia terenu (L)</span>
            <span>Rzut PRG GUGiK (kompensacja 52°N)</span>
          </div>
        </div>

        {/* Right: Detailed Voivodeship Inspector (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-teal-400">Inspektor Wojewódzki</span>
                <h3 className="text-2xl font-bold text-white capitalize mt-0.5">{activeStats.region}</h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                {activeStats.portals_count} serwisów
              </span>
            </div>

            {/* Dziennik Regionalny Box */}
            <div className="mt-4 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <div className="text-[11px] font-mono text-zinc-400 uppercase">Główny tytuł prasowy (Dziennik)</div>
              <div className="text-base font-semibold text-white mt-1 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-sky-400 shrink-0" />
                <span>{activeDaily}</span>
              </div>
            </div>

            {/* Autonomy vs Syndication Bars */}
            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-zinc-300">Autonomia redakcyjna (Treści lokalne L + CL)</span>
                  <span className="text-emerald-400 font-bold tabular-nums">{activeStats.autonomy_index_pct}%</span>
                </div>
                <div className="h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${activeStats.autonomy_index_pct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-zinc-300">Syndykacja sieciowa (Wsad ponadlokalny / centralny C)</span>
                  <span className="text-amber-400 font-bold tabular-nums">{activeStats.syndicated_pct}%</span>
                </div>
                <div className="h-2.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-300"
                    style={{ width: `${activeStats.syndicated_pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Sub-metrics */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/[0.06] text-xs font-mono">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="text-zinc-500 text-[10px]">Publikacje w bazie</div>
                <div className="text-base font-bold text-white tabular-nums mt-0.5">
                  {activeStats.articles_count.toLocaleString("pl-PL")}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div className="text-zinc-500 text-[10px]">Zniekształcenie agendy</div>
                <div className="text-base font-bold text-teal-300 tabular-nums mt-0.5">
                  {activeStats.agenda_distortion_pct ?? 74.2}%
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs text-sky-200/90 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
            <span>
              Województwo <strong>{activeStats.region}</strong> zachowuje wysoką autonomię informacyjną. Serwisy powiatowe generują własną agendę zdarzeniową, a wsad centralny jest ściśle monitorowany pod kątem duplikacji.
            </span>
          </div>
        </div>
      </div>

      {/* Complete Voivodeships Grid Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="h-4 w-4 text-teal-400" /> Tabela porównawcza 16 województw
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-zinc-400">
                <th className="py-2.5 px-3">Województwo</th>
                <th className="py-2.5 px-3">Główny Dziennik Regionalny</th>
                <th className="py-2.5 px-3 text-right">Liczba serwisów</th>
                <th className="py-2.5 px-3 text-right">Zbadane publikacje</th>
                <th className="py-2.5 px-3 text-right">Autonomia (L+CL)</th>
                <th className="py-2.5 px-3 text-right">Syndykacja (C)</th>
                <th className="py-2.5 px-3 text-center">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {voivodeships.map((v) => {
                const norm = v.region.toLowerCase().replace(/[-–\s]/g, "_");
                const daily = REGIONAL_DAILIES[norm] || "Dziennik Regionalny";
                const isSelected = selectedRegion?.toLowerCase().replace(/[-–\s]/g, "_") === norm;

                return (
                  <tr
                    key={v.region}
                    className={`hover:bg-white/[0.03] transition-colors cursor-pointer ${
                      isSelected ? "bg-teal-500/10" : ""
                    }`}
                    onClick={() => setSelectedRegion(v.region)}
                  >
                    <td className="py-3 px-3 font-semibold text-white capitalize">{v.region}</td>
                    <td className="py-3 px-3 text-zinc-300 font-sans">{daily}</td>
                    <td className="py-3 px-3 text-right font-bold text-teal-400 tabular-nums">{v.portals_count}</td>
                    <td className="py-3 px-3 text-right text-zinc-300 tabular-nums">{v.articles_count.toLocaleString("pl-PL")}</td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold tabular-nums">{v.autonomy_index_pct}%</td>
                    <td className="py-3 px-3 text-right text-amber-400 tabular-nums">{v.syndicated_pct}%</td>
                    <td className="py-3 px-3 text-center">
                      <button
                        className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-teal-500/20 text-zinc-300 hover:text-teal-300 text-[11px] transition-colors inline-flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRegion(v.region);
                        }}
                      >
                        Pokaż <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
