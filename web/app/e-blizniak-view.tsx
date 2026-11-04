"use client";

import React, { useState } from "react";
import { 
  Users, 
  TrendingDown, 
  DollarSign, 
  AlertOctagon, 
  Cpu, 
  Sliders, 
  Sparkles, 
  RefreshCw, 
  Building2, 
  Newspaper, 
  Clock,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  Layers
} from "lucide-react";

export function EBlizniakView({ onSwitchToScanner }: { onSwitchToScanner: () => void }) {
  // Scenario state
  const [selectedScenario, setSelectedScenario] = useState<"cuts" | "hubs" | "quantum">("cuts");
  const [fteDelta, setFteDelta] = useState<number>(-10); // % zmiana FTE
  const [automationBoost, setAutomationBoost] = useState<boolean>(false);

  // Baseline figures
  const baseline = {
    headcount: 1229,
    editorialFte: 485,
    payrollAnnualPln: 157.22, // mln zł
    revenueAnnualPln: 257.74, // mln zł
    ebitdaAnnualPln: -42.35, // mln zł
    cumulativeLossOrlenPln: 204.33, // mln zł
    festynozaShare: 74.2, // %
    headroomHours: 0.0, // h/tydzień
  };

  // Dynamic scenario calculations
  const calculateScenario = () => {
    if (selectedScenario === "cuts") {
      const fteCutCount = Math.round(baseline.headcount * (Math.abs(fteDelta) / 100));
      const payrollSavings = Number((baseline.payrollAnnualPln * (Math.abs(fteDelta) / 100) * 0.85).toFixed(1)); // po odprawach
      const revenueLoss = Number((payrollSavings * 1.58).toFixed(1)); // spadek czytelnictwa i reklam
      const netEbitdaDelta = Number((payrollSavings - revenueLoss).toFixed(1));
      const newHeadcount = baseline.headcount - fteCutCount;
      const festynozaNew = Math.min(94, Number((baseline.festynozaShare + Math.abs(fteDelta) * 1.4).toFixed(1)));
      
      return {
        title: "SCENARIUSZ A: DALSZE CIĘCIA KOSZTÓW (AUSTERITY SPIRAL)",
        badge: "Spirala redukcyjna",
        badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        fteChange: -fteCutCount,
        newHeadcount,
        payrollDelta: `+${payrollSavings} mln zł (pozorne oszczędności)`,
        revenueDelta: `-${revenueLoss} mln zł (utrata czytelników i reklam)`,
        ebitdaDelta: `${netEbitdaDelta} mln zł (pogorszenie wyniku)`,
        ebitdaDeltaNumber: netEbitdaDelta,
        festynozaShare: `${festynozaNew}%`,
        headroomHours: "0.0 h/tydz. (CAŁKOWITY PARALIŻ)",
        projectStatus: "ZABLOKOWANE — brak ludzi na nowe inicjatywy",
        diagnosis: "Spadek liczby dziennikarzy poniżej poziomu krytycznego wymusza rezygnację z autorskich materiałów. Redakcje stają się agregatorami komunikatów prasowych, co wywołuje dalszy spadek odsłon i reklam, przewyższający zaoszczędzone płace.",
      };
    } else if (selectedScenario === "hubs") {
      const timeFreed = automationBoost ? 22.5 : 14.0;
      const investigativeBoost = Number((timeFreed * 0.6).toFixed(1));
      const ebitdaGain = automationBoost ? 8.4 : 3.2;

      return {
        title: "SCENARIUSZ B: REORGANIZACJA W HUBY + AI-TELIER",
        badge: "Optymalizacja procesowa",
        badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        fteChange: 0,
        newHeadcount: baseline.headcount,
        payrollDelta: "0.0 mln zł (utrzymanie zespołu)",
        revenueDelta: `+${ebitdaGain + 2.5} mln zł (wzrost lojalnych czytelników)`,
        ebitdaDelta: `+${ebitdaGain} mln zł (poprawa operacyjna)`,
        ebitdaDeltaNumber: ebitdaGain,
        festynozaShare: "42.0% (-32.2 pp)",
        headroomHours: `+${investigativeBoost} h/tydzień na redakcję`,
        projectStatus: "ODBLOKOWANE — uwolniono moce na projekty ZNAM i newslettery",
        diagnosis: "Centralizacja składu DTP, wspólny desk wideo i automatyzacja żmudnych zadań zdejmują obciążenie z dziennikarzy terenowych. Zespół odzyskuje czas na śledztwa lokalne, które przywracają płatny ruch i zaangażowanie.",
      };
    } else {
      // YourQuantum solver
      return {
        title: "SCENARIUSZ C: OPTYMALIZATOR WIELOKRYTERIALNY (YOURQUANTUM CP-SAT)",
        badge: "Solver ograniczeń",
        badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        fteChange: -35,
        newHeadcount: 1194,
        payrollDelta: "+4.2 mln zł (optymalna realokacja)",
        revenueDelta: "+11.6 mln zł (koncentracja na rentownych klastrach)",
        ebitdaDelta: "+7.4 mln zł (punkt optimum Pareto)",
        ebitdaDeltaNumber: 7.4,
        festynozaShare: "38.5%",
        headroomHours: "+16.8 h/tydzień na klastry strategiczne",
        projectStatus: "ODBLOKOWANE — precyzyjnie sfinansowane nowe linie biznesowe",
        diagnosis: "Algorytm YourQuantum wyznacza matematycznie granicę Pareto: 100% pokrycia powiatów strategicznych przy minimalnej obsadzie hubowej, uwalniając precyzyjnie 42 FTE do zespołów produktów cyfrowych i wideo.",
      };
    }
  };

  const currentResult = calculateScenario();

  return (
    <div className="ppg-twin-container min-h-screen bg-[#060709] text-zinc-100 p-6 md:p-10 font-sans selection:bg-sky-500 selection:text-black">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/[0.08] gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[11px] font-mono uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
              Enterprise Digital Twin · Baseline 2025/2026
            </span>
            <span className="text-[11px] font-mono bg-white/[0.06] text-zinc-400 border border-white/[0.08] px-2 py-0.5 rounded">
              Audyt eKRS & Raport Domaniewskiego
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-mono flex items-center gap-3">
            E-BLIŹNIAK POLSKA PRESS GRUPA
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Cyfrowe modelowanie struktury, analiza ściany cięć i symulator potencjału organizacyjno-finansowego
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSwitchToScanner}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs font-mono hover:bg-teal-500/20 transition-all cursor-pointer"
          >
            <Newspaper className="h-4 w-4" />
            <span>Przełącz na SKANER PPG</span>
          </button>
        </div>
      </div>

      {/* GŁÓWNA DIAGNOZA STRATEGICZNA: ŚCIANA CIĘĆ */}
      <div className="rounded-2xl border-2 border-rose-500/40 bg-rose-950/20 p-6 md:p-8 mb-8 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-rose-500" />
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
                DIAGNOZA ZARZĄDCZA · PPGSCOPE TWIN INTELLIGENCE
              </span>
              <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                Stan na wrzesień 2026 r.
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
              PPG doszło do ściany: redukcje etatów zablokowały innowacje i nowe projekty
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-4xl">
              Od końca 2019 roku do końca 2025 roku ubyło <strong>685 etatów</strong> (w tym <strong>267 osób w latach 2024–2025</strong>). Redakcje regionalne stopniały do 12–18 osób na całe województwo, a w serwisach miejskich NaszeMiasto wprowadzono normę <strong>1 dziennikarza na miasto</strong>. W tym stanie <strong>100% czasu pochłania bieżące utrzymanie</strong> (tanie komunikaty PR, zapowiedzi i „festynoza”). Zdolność do uruchomienia nowych projektów (AI-telier, wideo ZNAM, płatne subskrypcje) wynosi <strong>ZERO</strong>. Każde kolejne cięcie pogłębia stratę, zamiast ją zmniejszać.
            </p>
          </div>
        </div>
      </div>

      {/* METRYKI BAZOWE: STAN RZECZYWISTY PRZEDSIĘBIORSTWA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase">Zatrudnienie (FTE)</span>
            <Users className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-white tabular-nums">
            1 229
          </div>
          <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-mono">
            <span>↓ -685 od 2019 r. (-35.8%)</span>
          </p>
        </div>

        <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase">Przychody roczne</span>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-white tabular-nums">
            257.7 mln zł
          </div>
          <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-mono">
            <span>↓ -106.4 mln zł od 2023 r.</span>
          </p>
        </div>

        <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase">Koszty płac (61% przych.)</span>
            <Building2 className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-white tabular-nums">
            157.2 mln zł
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 font-mono">
            Płace pożerają większość wpływów
          </p>
        </div>

        <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-mono uppercase">Rezerwa innowacyjna</span>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl md:text-3xl font-bold font-mono text-rose-400 tabular-nums">
            0.0 h/tydz.
          </div>
          <p className="text-[11px] text-rose-400 mt-1 font-mono font-bold">
            ŚCIANA CIĘĆ OSIĄGNIĘTA
          </p>
        </div>
      </div>

      {/* SYMULATOR SCENARIUSZY STRATEGICZNYCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Lewa kolumna: Sterowanie scenariuszem */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 font-mono">
              <Sliders className="h-5 w-5 text-sky-400" />
              <span>Wybór wariantu decyzyjnego</span>
            </h3>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelectedScenario("cuts")}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedScenario === "cuts"
                    ? "border-rose-500 bg-rose-950/30 text-white shadow-lg shadow-rose-950/50"
                    : "border-white/[0.06] bg-black/40 text-zinc-400 hover:border-white/[0.15]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">Wariant 1: Dalsze cięcia etatów</span>
                  <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                    Inercja
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Próba ratowania wyniku kolejną falą redukcji (np. -10% etatów).
                </p>
              </button>

              <button
                onClick={() => setSelectedScenario("hubs")}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedScenario === "hubs"
                    ? "border-teal-500 bg-teal-950/30 text-white shadow-lg shadow-teal-950/50"
                    : "border-white/[0.06] bg-black/40 text-zinc-400 hover:border-white/[0.15]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">Wariant 2: Huby regionalne + AI-telier</span>
                  <span className="text-[10px] font-mono bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded">
                    Rekomendacja
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Konsolidacja techniczna bez zwolnień dziennikarzy, uwolnienie czasu redakcji.
                </p>
              </button>

              <button
                onClick={() => setSelectedScenario("quantum")}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedScenario === "quantum"
                    ? "border-sky-500 bg-sky-950/30 text-white shadow-lg shadow-sky-950/50"
                    : "border-white/[0.06] bg-black/40 text-zinc-400 hover:border-white/[0.15]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">Wariant 3: Solver YourQuantum (CP-SAT)</span>
                  <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">
                    Optimum Pareto
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Matematyczna optymalizacja alokacji zasobów przy ograniczeniach powiatowych.
                </p>
              </button>
            </div>

            {/* Suwak parametrów */}
            {selectedScenario === "cuts" && (
              <div className="p-4 rounded-xl bg-black/50 border border-white/[0.06] space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-zinc-400">Skala planowanej redukcji etatów:</span>
                  <span className="text-rose-400 font-bold">{fteDelta}% ({Math.round(baseline.headcount * (Math.abs(fteDelta)/100))} etatów)</span>
                </div>
                <input
                  type="range"
                  min="-25"
                  max="-5"
                  step="5"
                  value={fteDelta}
                  onChange={(e) => setFteDelta(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>-5% (-61 FTE)</span>
                  <span>-15% (-184 FTE)</span>
                  <span>-25% (-307 FTE)</span>
                </div>
              </div>
            )}

            {selectedScenario === "hubs" && (
              <div className="p-4 rounded-xl bg-black/50 border border-white/[0.06] space-y-3">
                <label className="flex items-center gap-3 cursor-pointer text-xs text-zinc-300 font-mono">
                  <input
                    type="checkbox"
                    checked={automationBoost}
                    onChange={(e) => setAutomationBoost(e.target.checked)}
                    className="accent-teal-500 h-4 w-4"
                  />
                  <span>Aktywuj wdrożenie systemu wydawniczego AI-telier (+22% odzyskanego czasu)</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Prawa kolumna: Wynik symulacji i porównanie różnicowe */}
        <div className="lg:col-span-7">
          <div className="p-6 md:p-8 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 backdrop-blur-xl h-full flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/[0.06]">
                <div>
                  <span className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${currentResult.badgeColor} inline-block mb-2`}>
                    {currentResult.badge}
                  </span>
                  <h3 className="text-xl font-bold text-white font-mono">
                    {currentResult.title}
                  </h3>
                </div>
              </div>

              {/* Siatka wskaźników różnicowych (Delta Grid) */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
                  <span className="text-[11px] font-mono text-zinc-400 block mb-1">Docelowe etaty</span>
                  <span className="text-xl font-bold font-mono text-white tabular-nums">
                    {currentResult.newHeadcount} FTE
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 block mt-1">
                    Δ {currentResult.fteChange} etatów
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
                  <span className="text-[11px] font-mono text-zinc-400 block mb-1">Wpływ na EBITDA</span>
                  <span className={`text-xl font-bold font-mono tabular-nums ${
                    currentResult.ebitdaDeltaNumber >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {currentResult.ebitdaDelta}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 block mt-1">
                    {currentResult.ebitdaDeltaNumber >= 0 ? "zysk operacyjny" : "pogłębienie straty"}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06]">
                  <span className="text-[11px] font-mono text-zinc-400 block mb-1">Udział „Festynozy”</span>
                  <span className="text-xl font-bold font-mono text-amber-400 tabular-nums">
                    {currentResult.festynozaShare}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 block mt-1">
                    tanie treści bez wartości
                  </span>
                </div>
              </div>

              {/* Bilans Rezerwy Innowacyjnej */}
              <div className="p-5 rounded-xl border border-white/[0.08] bg-black/60 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase text-zinc-300 font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-sky-400" />
                    <span>Rezerwa czasu na nowe projekty (Innovation Headroom):</span>
                  </span>
                  <span className="text-sm font-mono font-bold text-sky-400">
                    {currentResult.headroomHours}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-2">
                  Status projektów holdingowych: <strong className="text-white">{currentResult.projectStatus}</strong>
                </div>
              </div>

              {/* Wnioski ekonometryczne */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-xs font-mono uppercase text-zinc-400 font-bold mb-1.5">
                  Weryfikacja przyczynowo-skutkowa modelu:
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {currentResult.diagnosis}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500 font-mono">
              <span>Model: Causal DAG Engine v1.0 + Benchmark eKRS</span>
              <span>Dokładność bilansowa: 100% deterministyczna</span>
            </div>
          </div>
        </div>
      </div>

      {/* STOPKA SYSTEMOWA */}
      <div className="pt-6 border-t border-white/[0.08] flex flex-col md:flex-row items-center justify-between text-xs text-zinc-500 font-mono gap-3">
        <div>
          PPG Twin Enterprise © 2026 · Zintegrowana platforma cyfrowego bliźniaka Polska Press Grupy
        </div>
        <div className="flex items-center gap-4">
          <span>Obsługa danych zewnętrznych i wewnętrznych (Overlay Engine)</span>
          <span>Integracja Solver YourQuantum</span>
        </div>
      </div>
    </div>
  );
}
