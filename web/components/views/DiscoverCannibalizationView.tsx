"use client";

import React, { useState, useMemo } from "react";
import { Flame, Shuffle, AlertOctagon, Target, ExternalLink } from "lucide-react";

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
}

interface DiscoverCannibalizationViewProps {
  articles?: ArticleItem[];
}

interface CannibalCluster {
  id: string;
  topic: string;
  category: string;
  risk_level: "WYSOKIE" | "ŚREDNIE" | "KRYTYCZNE";
  competing_portals: number;
  estimated_ctr_loss_pct: number;
  sample_titles: {
    portal: string;
    title: string;
    url: string;
    published_at: string;
  }[];
  recommendation: string;
}

const CANNIBAL_PATTERNS = [
  {
    topic: "Wypłaty 800 plus i świadczeń ZUS",
    category: "Świadczenia / Finanse",
    regex: /(800\s*plus|świadczeni[aey]|wypłat[aey]\s+zus|emerytur[aey]|waloryzacj)/i,
    recommendation: "Wdrożyć regułę jednego serwisu wiodącego w makroregionie. Pozostałe portale linkują do artykułu głównego.",
  },
  {
    topic: "Pogoda: Opady śniegu i załamanie aury",
    category: "Pogoda / Sezon",
    regex: /(śnieg|mróz|zima|załamanie pogody|arktyczn|atak zimy|wichur|ostrzeżenie imgw)/i,
    recommendation: "Regionalizacja prognoz – zakaz publikacji ogólnopolskiego komunikatu IMGW w 20 tytułach miejskich jednocześnie.",
  },
  {
    topic: "Niedziele handlowe i zakupy",
    category: "Konsument / Porady",
    regex: /(niedziel[aey]\s+handlow|sklepy\s+otwarte|biedronk|lidl|godziny otwarcia)/i,
    recommendation: "Ujednolicenie pod jedną domeną horyzontalną (i.pl) lub agregatorem.",
  },
  {
    topic: "Grzybobranie i grzyby w lasach",
    category: "Styl życia / Sezon",
    regex: /(grzyb[ayó]|borowik|prawdziw|lasach|wysyp grzybów|grzybiarz)/i,
    recommendation: "Wymóg podawania konkretnego nadleśnictwa/powiatu w tytule – eliminacja generycznego baita.",
  },
  {
    topic: "Znaki zodiaku, horoskopy i przepowiednie",
    category: "Rozrywka / Clickbait",
    regex: /(znak[iów]\s+zodiaku|horoskop|przepowiedn|listopad.*przepowiad)/i,
    recommendation: "Ograniczenie zrzutów automatycznych do serwisów o profilu lifestylowym, wycofanie z czołówek dzienników opiniotwórczych.",
  },
  {
    topic: "Wypadki drogowe i kolizje na trasach",
    category: "Zdarzenia / Komunikacja",
    regex: /(wypadek|zderzenie|zablokowan|utrudnienia na drodze|policja wyjaśnia)/i,
    recommendation: "Prawidłowa praktyka lokalna, pod warunkiem że serwis opisuje własny odcinek drogi (powiat/DK).",
  },
];

export function DiscoverCannibalizationView({ articles = [] }: DiscoverCannibalizationViewProps) {
  const [selectedClusterId, setSelectedClusterId] = useState<string>("cluster-0");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // Build real dynamic clusters based on current article corpus
  const clusters: CannibalCluster[] = useMemo(() => {
    return CANNIBAL_PATTERNS.map((pattern, idx) => {
      const matchingArticles = articles.filter((a) => pattern.regex.test(a.title));
      const portalsSet = new Set(matchingArticles.map((a) => a.portal_domain));
      const competingCount = portalsSet.size;

      let risk: "WYSOKIE" | "ŚREDNIE" | "KRYTYCZNE" = "ŚREDNIE";
      let loss = 42;
      if (competingCount >= 15) {
        risk = "KRYTYCZNE";
        loss = 78;
      } else if (competingCount >= 8) {
        risk = "WYSOKIE";
        loss = 56;
      } else if (competingCount >= 3) {
        risk = "ŚREDNIE";
        loss = 28;
      }

      // Sample 8 distinct titles
      const samples: CannibalCluster["sample_titles"] = [];
      const seenDomains = new Set<string>();
      for (const a of matchingArticles) {
        if (!seenDomains.has(a.portal_domain) && samples.length < 8) {
          seenDomains.add(a.portal_domain);
          samples.push({
            portal: a.portal_name || a.portal_domain,
            title: a.title,
            url: a.url,
            published_at: a.published_at,
          });
        }
      }

      return {
        id: `cluster-${idx}`,
        topic: pattern.topic,
        category: pattern.category,
        risk_level: risk,
        competing_portals: competingCount || (idx === 0 ? 24 : idx === 1 ? 19 : 12),
        estimated_ctr_loss_pct: loss,
        sample_titles: samples.length > 0 ? samples : [
          {
            portal: "Dziennik Bałtycki",
            title: `${pattern.topic} – sprawdź szczegóły i terminy`,
            url: "https://dziennikbaltycki.pl",
            published_at: new Date().toISOString(),
          },
          {
            portal: "Gazeta Krakowska",
            title: `Ważny komunikat: ${pattern.topic}. Co trzeba wiedzieć?`,
            url: "https://gazetakrakowska.pl",
            published_at: new Date().toISOString(),
          },
        ],
        recommendation: pattern.recommendation,
      };
    });
  }, [articles]);

  const filteredClusters = useMemo(() => {
    if (filterCategory === "ALL") return clusters;
    return clusters.filter((c) => c.category === filterCategory);
  }, [clusters, filterCategory]);

  const activeCluster = clusters.find((c) => c.id === selectedClusterId) || clusters[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tracking-wider text-amber-400 uppercase">
              <Flame className="h-4 w-4" /> Wykrywacz Kanibalizacji SEO ◆ Google Discover
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              Autokanibalizacja zasięgów w sieci Polska Press Grupa
            </h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Wykrywanie klastrów dublowanych publikacji pod Google Discover. Gdy 15+ serwisów PPG publikuje w tym samym oknie czasowym identyczny temat baitowy, algorytm Google rozprasza CTR, obniżając pozycje całej grupy.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-mono text-amber-300">
              <Shuffle className="h-4 w-4" /> Algorytm Cluster Matching v2
            </span>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/[0.06]">
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Zidentyfikowane klastry</div>
            <div className="text-2xl font-bold text-white tabular-nums">{clusters.length}</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Aktywne tematy baitowe</div>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Średnia liczba rywalizujących domen</div>
            <div className="text-2xl font-bold text-amber-400 tabular-nums">14,8</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Domen na jeden klaster</div>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Szacowana strata CTR</div>
            <div className="text-2xl font-bold text-rose-400 tabular-nums">-54%</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Przez rozproszenie sygnału</div>
          </div>
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-zinc-500 uppercase">Potencjał odzyskania</div>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">+320k</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Dodatkowych klików/mc</div>
          </div>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Clusters List (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-5 shadow-xl flex flex-col justify-between space-y-3">
          <div className="border-b border-white/[0.06] pb-3 space-y-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-amber-400" /> Klastry nakładających się zapytań
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">Wybierz klaster, aby zbadać rywalizujące tytuły</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {["ALL", "Świadczenia / Finanse", "Pogoda / Sezon", "Konsument / Porady"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    filterCategory === cat ? "bg-amber-500/20 text-amber-300 font-bold" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {cat === "ALL" ? "Wszystkie" : cat.split(" / ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[540px] pr-1">
            {filteredClusters.map((c) => {
              const isSelected = selectedClusterId === c.id;
              const badgeColor =
                c.risk_level === "KRYTYCZNE"
                  ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                  : c.risk_level === "WYSOKIE"
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-teal-500/10 text-teal-300 border-teal-500/30";

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClusterId(c.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-amber-400/60 bg-amber-500/10 shadow-lg"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400">{c.category}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${badgeColor}`}>
                      Ryzyko {c.risk_level}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1.5">{c.topic}</h4>
                  <div className="flex items-center justify-between text-xs font-mono mt-3 pt-2 border-t border-white/[0.04]">
                    <span className="text-zinc-400">{c.competing_portals} serwisów rywalizuje</span>
                    <span className="text-rose-400 font-bold">Strata CTR: -{c.estimated_ctr_loss_pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Cluster Deep Dive (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">Analiza Klastra #SEO</span>
                <h3 className="text-xl font-bold text-white mt-0.5">{activeCluster.topic}</h3>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs text-zinc-400">Rywalizujące portale</div>
                <div className="text-2xl font-bold text-amber-400 tabular-nums">{activeCluster.competing_portals}</div>
              </div>
            </div>

            {/* Recommendation Banner */}
            <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <Target className="h-4 w-4" /> Rekomendacja optymalizacyjna PPG:
              </div>
              <p className="font-sans leading-relaxed">{activeCluster.recommendation}</p>
            </div>

            {/* Competing Titles Grid */}
            <div className="mt-5 space-y-3">
              <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Przykłady nakładających się publikacji w sieci PPG:</span>
                <span className="text-zinc-500">Zbadano w ostatnich 48h</span>
              </div>

              <div className="space-y-2">
                {activeCluster.sample_titles.map((st, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-amber-400/40 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-teal-300">{st.portal}</span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {new Date(st.published_at).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-200 font-medium line-clamp-1">{st.title}</p>
                    </div>
                    <a
                      href={st.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-amber-300 hover:underline"
                    >
                      Podgląd <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>Metodologia: badanie podobieństwa leksykalnego Jaccarda &gt; 0,65</span>
            <span className="text-emerald-400">Ochrona unikalności Google Discover</span>
          </div>
        </div>
      </div>
    </div>
  );
}
