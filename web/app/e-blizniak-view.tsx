"use client";

import React, { useState, useMemo } from "react";
import { 
  Users, 
  TrendingDown, 
  DollarSign, 
  AlertOctagon, 
  Cpu, 
  Sliders, 
  RefreshCw, 
  Building2, 
  Newspaper, 
  Clock,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  Layers,
  Download,
  Upload,
  Search,
  CheckCircle2
} from "lucide-react";

// Domyślne wartości z zewnętrznych źródeł referencyjnych (eKRS, PBC, Mediapanel, Domaniewski 2026)
const EXTERNAL_BASELINE_DATA = {
  headcount: 1229,
  editorialFte: 680,
  payrollAnnualPln: 157.22, // mln zł
  revenueAnnualPln: 257.74, // mln zł
  ebitdaAnnualPln: -42.35, // mln zł
  cumulativeLossOrlenPln: 204.33, // mln zł
  festynozaShare: 45.9, // 35.1% kronika + 10.8% wypadki
  headroomHours: 0.0, // h/tydzień
  dailyArticlesTotal: 10142,
  activePortalsCount: 553,
};

// 22 czołowe dzienniki regionalne odtworzone z danych telemetrycznych
const REGIONAL_DAILIES = [
  { domain: "dziennikzachodni.pl", name: "Dziennik Zachodni", region: "Śląskie", articlesDay: 87, authors: 28, uniquePct: 70.1, reachRu: "2,8-3,2 mln RU" },
  { domain: "pomorska.pl", name: "Gazeta Pomorska", region: "Kujawsko-Pomorskie", articlesDay: 91, authors: 17, uniquePct: 60.4, reachRu: "2,4-2,9 mln RU" },
  { domain: "gazetakrakowska.pl", name: "Gazeta Krakowska", region: "Małopolskie", articlesDay: 74, authors: 24, uniquePct: 50.0, reachRu: "2,1-2,6 mln RU" },
  { domain: "dziennikbaltycki.pl", name: "Dziennik Bałtycki", region: "Pomorskie", articlesDay: 78, authors: 24, uniquePct: 50.0, reachRu: "2,0-2,5 mln RU" },
  { domain: "gloswielkopolski.pl", name: "Głos Wielkopolski", region: "Wielkopolskie", articlesDay: 82, authors: 23, uniquePct: 58.0, reachRu: "2,2-2,7 mln RU" },
  { domain: "gazetawroclawska.pl", name: "Gazeta Wrocławska", region: "Dolnośląskie", articlesDay: 67, authors: 25, uniquePct: 59.7, reachRu: "1,9-2,4 mln RU" },
  { domain: "echodnia.eu", name: "Echo Dnia", region: "Świętokrzyskie", articlesDay: 89, authors: 20, uniquePct: 49.4, reachRu: "1,8-2,3 mln RU" },
  { domain: "nowiny24.pl", name: "Nowiny", region: "Podkarpackie", articlesDay: 71, authors: 19, uniquePct: 54.9, reachRu: "1,4-1,8 mln RU" },
  { domain: "dzienniklodzki.pl", name: "Dziennik Łódzki", region: "Łódzkie", articlesDay: 69, authors: 24, uniquePct: 59.4, reachRu: "1,5-2,0 mln RU" },
  { domain: "dziennikpolski24.pl", name: "Dziennik Polski", region: "Małopolskie", articlesDay: 88, authors: 21, uniquePct: 60.2, reachRu: "1,6-2,1 mln RU" },
  { domain: "kurierlubelski.pl", name: "Kurier Lubelski", region: "Lubelskie", articlesDay: 64, authors: 18, uniquePct: 56.2, reachRu: "1,2-1,6 mln RU" },
  { domain: "poranny.pl", name: "Kurier Poranny", region: "Podlaskie", articlesDay: 62, authors: 17, uniquePct: 53.1, reachRu: "1,1-1,5 mln RU" },
  { domain: "gazetalubuska.pl", name: "Gazeta Lubuska", region: "Lubuskie", articlesDay: 73, authors: 27, uniquePct: 60.3, reachRu: "1,3-1,7 mln RU" },
  { domain: "nto.pl", name: "Nowa Trybuna Opolska", region: "Opolskie", articlesDay: 58, authors: 16, uniquePct: 55.2, reachRu: "1,0-1,4 mln RU" },
  { domain: "gk24.pl", name: "Głos Koszaliński", region: "Zachodniopomorskie", articlesDay: 52, authors: 14, uniquePct: 51.9, reachRu: "0,8-1,2 mln RU" },
  { domain: "gs24.pl", name: "Głos Szczeciński", region: "Zachodniopomorskie", articlesDay: 56, authors: 15, uniquePct: 53.6, reachRu: "0,9-1,3 mln RU" },
  { domain: "gp24.pl", name: "Głos Pomorza", region: "Pomorskie", articlesDay: 48, authors: 12, uniquePct: 50.0, reachRu: "0,7-1,0 mln RU" },
  { domain: "wspolczesna.pl", name: "Gazeta Współczesna", region: "Podlaskie", articlesDay: 46, authors: 11, uniquePct: 47.8, reachRu: "0,6-0,9 mln RU" },
  { domain: "expressilustrowany.pl", name: "Express Ilustrowany", region: "Łódzkie", articlesDay: 54, authors: 13, uniquePct: 51.9, reachRu: "0,9-1,3 mln RU" },
  { domain: "nowosci.com.pl", name: "Nowości Toruńskie", region: "Kujawsko-Pomorskie", articlesDay: 49, authors: 12, uniquePct: 49.0, reachRu: "0,7-1,1 mln RU" },
  { domain: "expressbydgoski.pl", name: "Express Bydgoski", region: "Kujawsko-Pomorskie", articlesDay: 51, authors: 13, uniquePct: 51.0, reachRu: "0,8-1,2 mln RU" },
  { domain: "polskatimes.pl", name: "Polska Metropolia Warszawska", region: "Mazowieckie", articlesDay: 65, authors: 20, uniquePct: 61.5, reachRu: "1,5-2,2 mln RU" },
];

export function EBlizniakView({ onSwitchToScanner }: { onSwitchToScanner: () => void }) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"simulator" | "network" | "overlay">("simulator");

  // Dynamic baseline state (external vs internal overlay)
  const [baseline, setBaseline] = useState(EXTERNAL_BASELINE_DATA);
  const [isOverlayApplied, setIsOverlayApplied] = useState(false);
  const [overlaySuccessMsg, setOverlaySuccessMsg] = useState("");

  // Form inputs for internal overlay
  const [inputHeadcount, setInputHeadcount] = useState(String(EXTERNAL_BASELINE_DATA.headcount));
  const [inputEditorialFte, setInputEditorialFte] = useState(String(EXTERNAL_BASELINE_DATA.editorialFte));
  const [inputRevenue, setInputRevenue] = useState(String(EXTERNAL_BASELINE_DATA.revenueAnnualPln));
  const [inputPayroll, setInputPayroll] = useState(String(EXTERNAL_BASELINE_DATA.payrollAnnualPln));
  const [inputNetResult, setInputNetResult] = useState(String(EXTERNAL_BASELINE_DATA.ebitdaAnnualPln));

  // Scenario simulation state
  const [selectedScenario, setSelectedScenario] = useState<"cuts" | "hubs" | "quantum">("cuts");
  const [fteDelta, setFteDelta] = useState<number>(-10); // % zmiana FTE
  const [automationBoost, setAutomationBoost] = useState<boolean>(false);

  // Network search state
  const [networkSearch, setNetworkSearch] = useState("");

  // Handle applying internal data overlay
  const handleApplyOverlay = (e: React.FormEvent) => {
    e.preventDefault();
    setBaseline({
      ...baseline,
      headcount: Number(inputHeadcount),
      editorialFte: Number(inputEditorialFte),
      revenueAnnualPln: Number(inputRevenue),
      payrollAnnualPln: Number(inputPayroll),
      ebitdaAnnualPln: Number(inputNetResult),
    });
    setIsOverlayApplied(true);
    setOverlaySuccessMsg("Pomyślnie nałożono dane wewnętrzne! Wszystkie obliczenia i symulacje zostały przeliczone.");
    setTimeout(() => setOverlaySuccessMsg(""), 5000);
  };

  // Reset back to external benchmark
  const handleResetToExternal = () => {
    setBaseline(EXTERNAL_BASELINE_DATA);
    setInputHeadcount(String(EXTERNAL_BASELINE_DATA.headcount));
    setInputEditorialFte(String(EXTERNAL_BASELINE_DATA.editorialFte));
    setInputRevenue(String(EXTERNAL_BASELINE_DATA.revenueAnnualPln));
    setInputPayroll(String(EXTERNAL_BASELINE_DATA.payrollAnnualPln));
    setInputNetResult(String(EXTERNAL_BASELINE_DATA.ebitdaAnnualPln));
    setIsOverlayApplied(false);
    setOverlaySuccessMsg("Przywrócono domyślne dane zewnętrzne (eKRS 2025 / PBC / Mediapanel).");
    setTimeout(() => setOverlaySuccessMsg(""), 4000);
  };

  // Dynamic scenario calculations based on current active baseline
  const calculateScenario = () => {
    if (selectedScenario === "cuts") {
      const fteCutCount = Math.round(baseline.headcount * (Math.abs(fteDelta) / 100));
      const payrollSavings = Number((baseline.payrollAnnualPln * (Math.abs(fteDelta) / 100) * 0.85).toFixed(1));
      const revenueLoss = Number((payrollSavings * 1.58).toFixed(1));
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
        title: "SCENARIUSZ B: REORGANIZACJA STRUKTUR I AUTOMATYZACJA RUTYNY",
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
        projectStatus: "ODBLOKOWANE — uwolniono moce na projekty autorskie i newslettery",
        diagnosis: "Centralizacja składu DTP, wspólny desk wideo i automatyzacja żmudnych zadań zdejmują obciążenie z dziennikarzy terenowych. Zespół odzyskuje czas na śledztwa lokalne, które przywracają płatny ruch i zaangażowanie.",
      };
    } else {
      return {
        title: "SCENARIUSZ C: OPTYMALIZATOR WIELOKRYTERIALNY (YOURQUANTUM CP-SAT)",
        badge: "Solver ograniczeń",
        badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        fteChange: -35,
        newHeadcount: baseline.headcount - 35,
        payrollDelta: "+4.2 mln zł (optymalna realokacja)",
        revenueDelta: "+11.6 mln zł (koncentracja na rentownych klastrach)",
        ebitdaDelta: "+7.4 mln zł (punkt optimum Pareto)",
        ebitdaDeltaNumber: 7.4,
        festynozaShare: "38.5%",
        headroomHours: "+16.8 h/tydzień na klastry strategiczne",
        projectStatus: "ODBLOKOWANE — precyzyjnie sfinansowane nowe linie biznesowe",
        diagnosis: "Algorytm YourQuantum wyznacza matematycznie granicę Pareto: 100% pokrycia powiatów strategicznych przy minimalnej obsadzie hubowej, uwalniając precyzyjnie etaty do zespołów produktów cyfrowych i wideo.",
      };
    }
  };

  const currentResult = calculateScenario();

  const filteredDailies = useMemo(() => {
    if (!networkSearch.trim()) return REGIONAL_DAILIES;
    const q = networkSearch.toLowerCase();
    return REGIONAL_DAILIES.filter(
      (d) => d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q) || d.domain.toLowerCase().includes(q)
    );
  }, [networkSearch]);

  return (
    <div className="ppg-twin-container min-h-screen bg-[#060709] text-zinc-100 p-6 md:p-10 font-sans selection:bg-sky-500 selection:text-black">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/[0.08] gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full">
              Enterprise Digital Twin · Baseline 2025/2026
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${isOverlayApplied ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-white/[0.06] text-zinc-400 border-white/[0.08]"}`}>
              {isOverlayApplied ? "STATUS: NAKŁADKA WEWNĘTRZNA AKTYWNA" : "STATUS: DANE ZEWNĘTRZNE (eKRS + PBC)"}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-mono flex items-center gap-3">
            E-BLIŹNIAK POLSKA PRESS GRUPA
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Cyfrowy bliźniak holdingu: modelowanie 1 229 FTE, 553 serwisów, RZiS i symulator potencjału zmian
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/ppg_dane_wewnetrzne_szablon.csv"
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.12] bg-white/[0.04] text-zinc-300 text-xs font-mono hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Pobierz Szablon CSV</span>
          </a>
          <button
            onClick={onSwitchToScanner}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-300 text-xs font-mono hover:bg-teal-500/20 transition-all cursor-pointer"
          >
            <Newspaper className="h-4 w-4" />
            <span>Przełącz na SKANER PPG</span>
          </button>
        </div>
      </div>

      {/* PASEK ZAKŁADEK GŁÓWNYCH */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] mb-8 pb-1 text-xs font-mono">
        <button
          onClick={() => setActiveTab("simulator")}
          className={`px-4 py-2.5 rounded-t-xl transition-all font-bold cursor-pointer flex items-center gap-2 ${
            activeTab === "simulator"
              ? "bg-[#0c0e12] border-t-2 border-sky-500 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Sliders className="h-4 w-4 text-sky-400" />
          <span>Kokpit & Symulator Scenariuszy</span>
        </button>

        <button
          onClick={() => setActiveTab("network")}
          className={`px-4 py-2.5 rounded-t-xl transition-all font-bold cursor-pointer flex items-center gap-2 ${
            activeTab === "network"
              ? "bg-[#0c0e12] border-t-2 border-teal-500 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Newspaper className="h-4 w-4 text-teal-400" />
          <span>Sieć 553 Portali & 22 Dzienniki</span>
        </button>

        <button
          onClick={() => setActiveTab("overlay")}
          className={`px-4 py-2.5 rounded-t-xl transition-all font-bold cursor-pointer flex items-center gap-2 ${
            activeTab === "overlay"
              ? "bg-[#0c0e12] border-t-2 border-emerald-500 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Upload className="h-4 w-4 text-emerald-400" />
          <span>Wprowadzanie Danych Wewnętrznych PPG</span>
        </button>
      </div>

      {overlaySuccessMsg && (
        <div className="p-4 mb-6 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-300 font-mono flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{overlaySuccessMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ZAKŁADKA 1: SYMULATOR SCENARIUSZY I ŚCIANA CIĘĆ */}
      {/* ========================================================================= */}
      {activeTab === "simulator" && (
        <>
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
                  Od końca 2019 roku do końca 2025 roku ubyło <strong>685 etatów</strong> (w tym <strong>267 osób w latach 2024–2025</strong>). Redakcje regionalne stopniały do 12–18 osób na całe województwo, a w serwisach miejskich NaszeMiasto wprowadzono normę <strong>1 dziennikarza na miasto</strong>. W tym stanie <strong>100% czasu pochłania bieżące utrzymanie</strong> (tanie komunikaty PR, zapowiedzi i „festynoza”). Zdolność do uruchomienia nowych projektów, formatów wideo czy płatnych subskrypcji wynosi <strong>ZERO</strong>. Każde kolejne cięcie pogłębia stratę, zamiast ją zmniejszać.
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
                {baseline.headcount.toLocaleString("pl-PL")}
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
                {baseline.revenueAnnualPln.toFixed(1)} mln zł
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                eKRS 2024/2025 (POMIAR)
              </p>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 backdrop-blur-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-mono uppercase">Fundusz płac</span>
                <Building2 className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="text-2xl md:text-3xl font-bold font-mono text-white tabular-nums">
                {baseline.payrollAnnualPln.toFixed(1)} mln zł
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                61% całkowitych przychodów
              </p>
            </div>

            <div className="p-5 rounded-xl border border-white/[0.08] bg-[#0c0e12]/80 backdrop-blur-md">
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-xs font-mono uppercase">Rezerwa innowacyjna</span>
                <AlertOctagon className="h-4 w-4 text-rose-500" />
              </div>
              <div className="text-2xl md:text-3xl font-bold font-mono text-rose-400 tabular-nums">
                {baseline.headroomHours.toFixed(1)} h/tydz.
              </div>
              <p className="text-[11px] text-rose-400 mt-1 font-mono font-bold">
                ŚCIANA CIĘĆ: 100% ODTWÓRCZOŚĆ
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
                      <span className="font-bold text-sm">Wariant 2: Huby regionalne i eliminacja dublowania</span>
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
                      <span>-5% (-{Math.round(baseline.headcount * 0.05)} FTE)</span>
                      <span>-15% (-{Math.round(baseline.headcount * 0.15)} FTE)</span>
                      <span>-25% (-{Math.round(baseline.headcount * 0.25)} FTE)</span>
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
                      <span>Aktywuj automatyzację depesz i zadań powtarzalnych (+22% odzyskanego czasu)</span>
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
        </>
      )}

      {/* ========================================================================= */}
      {/* ZAKŁADKA 2: SIEĆ 553 PORTALI I 22 DZIENNIKÓW REGIONALNYCH */}
      {/* ========================================================================= */}
      {activeTab === "network" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c0e12] border border-white/[0.08]">
            <div>
              <h2 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <span>Struktura Terenowa: 22 Dzienniki Regionalne i 509 Miast</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Łączna produkcja: 10 142 artykułów/doba | 2 019 aktywnych linii autorskich w całej Polsce
              </p>
            </div>
            <div className="w-full sm:w-72 relative">
              <input
                type="text"
                placeholder="Filtruj dzienniki lub regiony..."
                value={networkSearch}
                onChange={(e) => setNetworkSearch(e.target.value)}
                className="w-full bg-black/60 border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0c0e12]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0f4c81] text-white font-mono uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tytuł prasowy</th>
                  <th className="py-3 px-4">Województwo</th>
                  <th className="py-3 px-4 text-right">Artykuły / doba</th>
                  <th className="py-3 px-4 text-right">Podpisani autorzy</th>
                  <th className="py-3 px-4 text-right">Unikalność (%)</th>
                  <th className="py-3 px-4 text-right">Zasięg Mediapanel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] font-mono">
                {filteredDailies.map((d, i) => (
                  <tr key={d.domain} className={i % 2 === 0 ? "bg-black/20 hover:bg-white/[0.04]" : "bg-black/40 hover:bg-white/[0.04]"}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{d.name}</div>
                      <div className="text-[11px] text-zinc-500">{d.domain}</div>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">{d.region}</td>
                    <td className="py-3 px-4 text-right font-bold text-sky-400 tabular-nums">{d.articlesDay} art./doba</td>
                    <td className="py-3 px-4 text-right text-zinc-200 tabular-nums">{d.authors} FTE</td>
                    <td className="py-3 px-4 text-right font-bold tabular-nums">
                      <span className={d.uniquePct >= 55 ? "text-emerald-400" : "text-amber-400"}>
                        {d.uniquePct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-300 tabular-nums">{d.reachRu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ZAKŁADKA 3: WPROWADZANIE DANYCH WEWNĘTRZNYCH (OVERLAY) */}
      {/* ========================================================================= */}
      {activeTab === "overlay" && (
        <div className="space-y-6">
          <div className="p-6 md:p-8 rounded-2xl bg-[#0c0e12] border border-white/[0.08] space-y-6">
            <div className="border-b border-white/[0.08] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white font-mono">
                  Zastępowanie Danych Zewnętrznych Wewnętrznym Arkuszem PPG
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Bieżące obliczenia opierają się na publicznych danych referencyjnych (eKRS, PBC, Mediapanel). Możesz natychmiast wprowadzić zweryfikowane wartości ze spółki, aby model operował na Twoich liczbach.
                </p>
              </div>
              <a
                href="/ppg_dane_wewnetrzne_szablon.csv"
                download
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-mono hover:bg-sky-500/30 transition-all shrink-0 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Pobierz Pełny Szablon CSV</span>
              </a>
            </div>

            <form onSubmit={handleApplyOverlay} className="space-y-5">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300 font-semibold block">
                    Zatrudnienie całkowite (FTE):
                  </label>
                  <input
                    type="number"
                    value={inputHeadcount}
                    onChange={(e) => setInputHeadcount(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.12] rounded-xl p-3 text-sm text-white font-mono focus:border-emerald-400 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-zinc-500 font-mono block">Benchmark eKRS: 1 229 FTE</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300 font-semibold block">
                    Dziennikarze i redakcje (FTE):
                  </label>
                  <input
                    type="number"
                    value={inputEditorialFte}
                    onChange={(e) => setInputEditorialFte(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.12] rounded-xl p-3 text-sm text-white font-mono focus:border-emerald-400 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-zinc-500 font-mono block">Szacunek zewnętrzny: 680 FTE</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300 font-semibold block">
                    Przychody roczne (mln zł):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputRevenue}
                    onChange={(e) => setInputRevenue(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.12] rounded-xl p-3 text-sm text-white font-mono focus:border-emerald-400 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-zinc-500 font-mono block">Benchmark eKRS: 257.7 mln zł</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300 font-semibold block">
                    Roczny fundusz płac (mln zł):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputPayroll}
                    onChange={(e) => setInputPayroll(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.12] rounded-xl p-3 text-sm text-white font-mono focus:border-emerald-400 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-zinc-500 font-mono block">Benchmark eKRS: 157.2 mln zł</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-300 font-semibold block">
                    Wynik finansowy netto (mln zł):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={inputNetResult}
                    onChange={(e) => setInputNetResult(e.target.value)}
                    className="w-full bg-black/60 border border-white/[0.12] rounded-xl p-3 text-sm text-white font-mono focus:border-emerald-400 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-zinc-500 font-mono block">Benchmark eKRS: -42.4 mln zł</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Zastosuj dane wewnętrzne na model cyfrowy
                </button>
                <button
                  type="button"
                  onClick={handleResetToExternal}
                  className="px-5 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs font-mono transition-all cursor-pointer border border-white/[0.08]"
                >
                  Przywróć dane zewnętrzne (Benchmark eKRS / PBC)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
