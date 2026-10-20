import React from "react";
import { Layers } from "lucide-react";

export interface VoivodeshipCrossSection {
  region: string;
  portals_count: number;
  articles_count: number;
  autonomy_index_pct: number;
  syndicated_pct: number;
}

interface CrossSectionsViewProps {
  crossSections?: {
    by_voivodeship?: VoivodeshipCrossSection[];
  };
}

export function CrossSectionsView({ crossSections }: CrossSectionsViewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6 space-y-2">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-teal-400" /> Analityka Regionalna 16 Województw
        </h2>
        <p className="text-xs text-zinc-400">
          Rozkład serwisów sieci PPG według województw z udziałem treści lokalnej i syndykacji.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(crossSections?.by_voivodeship || []).map((v) => (
          <div key={v.region} className="rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="font-semibold text-white capitalize">{v.region}</span>
              <span className="text-xs font-mono text-teal-400 font-bold">{v.portals_count} portali</span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Publikacje:</span>
                <span className="text-white">{v.articles_count.toLocaleString("pl-PL")} art.</span>
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
  );
}
