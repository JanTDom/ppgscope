import React from "react";

export interface DataProvenance {
  mode: "live" | "synthetic_fixture" | "mixed" | "snapshot" | "synthetic";
  trust_label: string;
  display_label: string;
  source_summary: string;
  source_class: string;
  generated_at: string;
}

export function DataTrustBadge({
  provenance,
  compact = false,
}: {
  provenance: DataProvenance | null;
  compact?: boolean;
}) {
  const isLive = provenance?.mode === "live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-[0.08em] ${
        compact ? "px-2 py-1 text-[9px]" : "px-2.5 py-1.5 text-[10px]"
      } ${isLive ? "border-teal-400/30 bg-teal-400/10 text-teal-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}
      title={provenance?.source_summary || "Status źródła danych jest ładowany."}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "bg-teal-300" : "bg-amber-300"}`} />
      {provenance?.trust_label || "STATUS ŹRÓDŁA: WERYFIKACJA"}
    </span>
  );
}
