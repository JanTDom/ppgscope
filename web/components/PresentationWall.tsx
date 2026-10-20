import React, { useEffect } from "react";
import { ArrowLeft, Maximize2, Map } from "lucide-react";
import { DataTrustBadge, type DataProvenance } from "./DataTrustBadge";

export type WallScene = "network" | "editorial" | "forensics";

export interface PresentationWallProps {
  data: {
    titles: Array<{ id: string; name: string }>;
  };
  provenance: DataProvenance | null;
  domainBreakdown: {
    totalCount: number;
    localContentShare: number;
  };
  chartTimeseries: Array<{ total: number; label?: string }>;
  chartDomains: Array<{ name: string; total: number; pct: number }>;
  chartRegions: Array<{ region: string; articles_count: number }>;
  chartStatusBuckets: Array<{ key: string; count: number }>;
  scene: WallScene;
  onSceneChange: (scene: WallScene) => void;
  onExit: () => void;
}

export function PresentationWall({
  data,
  provenance,
  domainBreakdown,
  chartTimeseries,
  chartDomains,
  chartRegions,
  chartStatusBuckets,
  scene,
  onSceneChange,
  onExit,
}: PresentationWallProps) {
  useEffect(() => {
    if (scene !== "network") return;
    const timer = window.setInterval(() => onSceneChange("editorial"), 14000);
    return () => window.clearInterval(timer);
  }, [scene, onSceneChange]);

  const latestPoint = chartTimeseries[chartTimeseries.length - 1];
  const topDomains = chartDomains.slice(0, 5);
  const topRegions = chartRegions.slice(0, 12);
  const activePortals = chartStatusBuckets.find((bucket) => bucket.key === "AKTYWNY_UNIKALNY")?.count || 0;
  const syntheticNotice = provenance?.mode !== "live";
  const signalItems = topDomains.map((domain, index) => ({
    label: `${String(index + 1).padStart(2, "0")} · ${domain.name}`,
    value: `${domain.total.toLocaleString("pl-PL")} publikacji`,
    detail: `${domain.pct}% strumienia · C / CL / L`,
  }));

  return (
    <div className="ppg-wall-mode" aria-label="PPGscope The Wall">
      <div className="ppg-wall-grid" />
      <header className="ppg-wall-header">
        <div className="flex items-center gap-4">
          <div className="ppg-wall-wordmark">
            <span>PPG</span>
            <span>scope</span>
          </div>
          <div className="hidden border-l border-white/10 pl-4 sm:block">
            <p className="ppg-wall-eyebrow">MEDIA INTELLIGENCE CONTROL ROOM</p>
            <p className="mt-1 text-sm text-zinc-300">The Wall / sygnał sieciowy</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DataTrustBadge provenance={provenance} />
          <button type="button" onClick={onExit} className="ppg-wall-exit" aria-label="Wróć do trybu analitycznego">
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Tryb analityczny</span>
          </button>
        </div>
      </header>

      <main className="ppg-wall-content">
        <section className="ppg-wall-hero">
          <div className="ppg-wall-hero-copy">
            <p className="ppg-wall-eyebrow">
              {scene === "network" ? "NETWORK PULSE" : scene === "editorial" ? "EDITORIAL INTELLIGENCE" : "FORENSICS LAYER"}
            </p>
            <h1>
              {scene === "network"
                ? "Jedna sieć. Setki sygnałów. Jedna decyzja."
                : scene === "editorial"
                ? "Widzisz nie tylko wolumen — widzisz kierunek."
                : "Każdy sygnał ma ślad, źródło i poziom pewności."}
            </h1>
            <p className="ppg-wall-lede">
              {syntheticNotice
                ? "Prezentacja na snapshotcie demonstracyjnym — status źródła pozostaje widoczny przy każdym ujęciu."
                : "Prezentacja oparta na aktualnym pomiarze z podłączonych źródeł."}
            </p>
            <div className="ppg-wall-scenes" role="tablist" aria-label="Sceny prezentacji">
              {(["network", "editorial", "forensics"] as WallScene[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={scene === item}
                  onClick={() => onSceneChange(item)}
                  className={scene === item ? "is-active" : ""}
                >
                  {item === "network" ? "Network Pulse" : item === "editorial" ? "Editorial Intelligence" : "Forensics"}
                </button>
              ))}
            </div>
          </div>
          <div className="ppg-wall-pulse" aria-label="Wizualizacja sieci regionów">
            <div className="ppg-wall-pulse-ring ring-a" />
            <div className="ppg-wall-pulse-ring ring-b" />
            <div className="ppg-wall-pulse-core">
              <span>{data.titles.length}</span>
              <small>serwisów</small>
            </div>
            {topRegions.map((region, index) => {
              const angle = (index / Math.max(1, topRegions.length)) * Math.PI * 2 - Math.PI / 2;
              const radius = 37 + (index % 3) * 8;
              const x = 50 + Math.cos(angle) * radius;
              const y = 50 + Math.sin(angle) * radius;
              return (
                <span
                  key={region.region}
                  className="ppg-wall-node"
                  style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${index * 110}ms` }}
                  title={`${region.region}: ${region.articles_count.toLocaleString("pl-PL")} publikacji`}
                />
              );
            })}
          </div>
        </section>

        <section className="ppg-wall-kpis" aria-label="Kluczowe wskaźniki snapshotu">
          <div>
            <span>STRUMIEŃ 30D</span>
            <strong>{domainBreakdown.totalCount.toLocaleString("pl-PL")}</strong>
            <small>zaklasyfikowanych publikacji</small>
          </div>
          <div>
            <span>LOKALNOŚĆ L + CL</span>
            <strong>{domainBreakdown.localContentShare.toFixed(1)}%</strong>
            <small>udział treści lokalnych</small>
          </div>
          <div>
            <span>AKTYWNE UNIKALNE</span>
            <strong>{activePortals.toLocaleString("pl-PL")}</strong>
            <small>portali w audycie żywotności</small>
          </div>
          <div>
            <span>OSTATNI PUNKT CZASU</span>
            <strong>{latestPoint && latestPoint.total > 0 ? latestPoint.total.toLocaleString("pl-PL") : "—"}</strong>
            <small>{latestPoint?.label || "brak szeregu"}</small>
          </div>
        </section>

        <section className="ppg-wall-lower-grid">
          <div className="ppg-wall-panel ppg-wall-signal-panel">
            <div className="ppg-wall-panel-head">
              <div>
                <p className="ppg-wall-eyebrow">SIGNAL RAIL · SNAPSHOT</p>
                <h2>Co właśnie widać w sieci</h2>
              </div>
              <Maximize2 className="h-4 w-4 text-zinc-600" />
            </div>
            <div className="ppg-wall-signal-list">
              {signalItems.map((signal) => (
                <div key={signal.label} className="ppg-wall-signal">
                  <span className="ppg-wall-signal-dot" />
                  <div>
                    <strong>{signal.label}</strong>
                    <small>{signal.detail}</small>
                  </div>
                  <b>{signal.value}</b>
                </div>
              ))}
            </div>
          </div>
          <div className="ppg-wall-panel">
            <div className="ppg-wall-panel-head">
              <div>
                <p className="ppg-wall-eyebrow">REGIONAL PULSE</p>
                <h2>Gdzie rośnie napięcie informacyjne</h2>
              </div>
              <Map className="h-4 w-4 text-teal-300" />
            </div>
            <div className="ppg-wall-region-bars">
              {topRegions.slice(0, 7).map((region) => (
                <div key={region.region}>
                  <div>
                    <span>{region.region}</span>
                    <b>{region.articles_count.toLocaleString("pl-PL")}</b>
                  </div>
                  <span className="ppg-wall-bar">
                    <i
                      style={{
                        width: `${Math.min(
                          100,
                          (region.articles_count / Math.max(1, topRegions[0]?.articles_count || 1)) * 100,
                        )}%`,
                      }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="ppg-wall-footer">
          <span>
            <span className="ppg-live-dot" /> PPGscope Intelligence v2.0
          </span>
          <span>{syntheticNotice ? "Snapshot demonstracyjny · nie jest pomiarem live" : "Live measurement"}</span>
          <span>Źródło: {provenance?.source_class || "status nieznany"}</span>
        </footer>
      </main>
    </div>
  );
}
