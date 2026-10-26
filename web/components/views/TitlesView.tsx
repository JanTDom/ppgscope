import React, { useState } from "react";
import { Database, Download, ExternalLink } from "lucide-react";

export interface TitleItem {
  id: string;
  name: string;
  domain: string;
  region: string;
  type: string;
  city?: string;
  articles_count?: number;
}

export interface PortalVitalityItem {
  domain: string;
  portal_name: string;
  region: string;
  vitality_status: "AKTYWNY_UNIKALNY" | "AKTYWNY_SYNDYKAT" | "LEDWO_ZYWY" | "ZOMBIE_AUTOMAT" | "MARTWY" | "ZOMBIE_MARTWY";
  vitality_label: string;
  uniqueness_pct: number;
  daily_articles_count: number;
  unique_articles_count: number;
}

export interface PortalVitalityAuditData {
  portals: PortalVitalityItem[];
}

interface TitlesViewProps {
  titles: TitleItem[];
  portalVitalityAudit?: PortalVitalityAuditData;
  selectedMediumDomain: string;
  onSelectMediumDomain: (domain: string) => void;
  onCompareMediumDomain: (domain: string) => void;
}

export function TitlesView({
  titles,
  portalVitalityAudit,
  selectedMediumDomain,
  onSelectMediumDomain,
  onCompareMediumDomain,
}: TitlesViewProps) {
  const [titleSearch, setTitleSearch] = useState("");

  const filteredTitles = titles.filter(
    (t) =>
      t.name.toLowerCase().includes(titleSearch.toLowerCase()) ||
      t.domain.toLowerCase().includes(titleSearch.toLowerCase()) ||
      (t.region && t.region.toLowerCase().includes(titleSearch.toLowerCase())),
  );

  const handleExportCsv = () => {
    const headers = ["ID", "Nazwa", "Domena", "Region", "Typ", "Status żywotności", "Etykieta", "Unikalność (%)", "Artykuły unikalne/d", "Artykuły łącznie/d"];
    const rows = filteredTitles.map((t) => {
      const vit = portalVitalityAudit?.portals.find((p) => p.domain === t.domain);
      return [
        t.id,
        `"${(t.name || "").replace(/"/g, '""')}"`,
        t.domain,
        t.region || "",
        t.type || "",
        vit?.vitality_status || "BRAK_DANYCH",
        `"${(vit?.vitality_label || "").replace(/"/g, '""')}"`,
        vit?.uniqueness_pct != null ? vit.uniqueness_pct : "",
        vit?.unique_articles_count != null ? vit.unique_articles_count : "",
        vit?.daily_articles_count != null ? vit.daily_articles_count : "",
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rejestr_portali_ppg_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#0c0e12]/80 p-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-teal-400" /> Rejestr {titles.length} Portali Polska Press Grupa
          </h2>
          <p className="text-xs text-zinc-400">
            Kompletny katalog wszystkich mediów internetowych PPG w sieci z podziałem na segmenty, żywotność i unikalność.
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
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3 py-2 text-xs font-medium text-teal-300 hover:bg-teal-500 hover:text-black transition-all"
            title="Eksportuj przefiltrowaną listę portali do pliku CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Eksportuj CSV ({filteredTitles.length})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTitles.map((t) => {
          const vit = portalVitalityAudit?.portals.find((p) => p.domain === t.domain);
          return (
            <div
              key={t.id}
              className={`rounded-xl border p-3.5 space-y-2 transition-all ${
                selectedMediumDomain === t.domain
                  ? "border-teal-400 bg-teal-500/[0.08]"
                  : "border-white/[0.06] bg-[#0c0e12]/80 hover:border-white/[0.12]"
              }`}
            >
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
              {vit && (
                <div className="flex items-center justify-between text-[10px] font-mono pt-1">
                  <span
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      vit.vitality_status === "AKTYWNY_UNIKALNY"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : vit.vitality_status === "AKTYWNY_SYNDYKAT"
                        ? "bg-sky-500/20 text-sky-300"
                        : vit.vitality_status === "LEDWO_ZYWY"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {vit.vitality_label}
                  </span>
                  <span className="text-zinc-300">
                    Unikalne: <strong>{vit.uniqueness_pct}%</strong> ({vit.unique_articles_count}/{vit.daily_articles_count}/d)
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-1.5 border-t border-white/[0.04]">
                <span className="truncate max-w-[110px]">{t.type}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onSelectMediumDomain(t.domain);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="rounded-lg bg-teal-500/15 border border-teal-500/30 px-2 py-1 text-teal-300 hover:bg-teal-500 hover:text-black font-bold transition-all"
                  >
                    Audyt 360°
                  </button>
                  <button
                    onClick={() => {
                      onCompareMediumDomain(t.domain);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="rounded-lg bg-sky-500/15 border border-sky-500/30 px-2 py-1 text-sky-300 hover:bg-sky-500 hover:text-black font-bold transition-all"
                  >
                    Porównaj
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
