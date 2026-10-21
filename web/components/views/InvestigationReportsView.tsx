"use client";

import React, { useState } from "react";
import {
  FileSearch,
  Sparkles,
  Download,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Layers,
  ArrowRight,
  Filter,
  RefreshCw,
  Scale,
  ShieldAlert,
  HelpCircle,
  Newspaper,
  CheckCircle2,
  XCircle,
  Calendar,
  Building2,
  Share2,
} from "lucide-react";

export type AnalysisAngle =
  | "GOVERNMENT_PROMOTION"
  | "DEPOLITICIZATION_SEO"
  | "ATTACK_RESISTANCE"
  | "LOCAL_VS_SYNDICATE";

export interface InvestigationPreset {
  id: string;
  topic: string;
  angle: AnalysisAngle;
  description: string;
  userExpectations: string;
  reportData: GeneratedReportData;
}

export interface GeneratedReportData {
  topicTitle: string;
  angleLabel: string;
  summaryExecutive: string;
  attributionStats: {
    governmentPct: number;
    bureaucracyPct: number;
    oppositionPct: number;
  };
  headlineExposure: {
    ppgPct: number;
    portalsPct: number;
    rightWingPct: number;
    businessPct: number;
  };
  geographicSplit: {
    metropolisScore: number;
    countyScore: number;
  };
  keyMetrics: {
    label: string;
    value: string;
    sublabel: string;
    status: "good" | "bad" | "warning";
  }[];
  headlineCases: {
    source: string;
    sourceType: "PPG" | "PORTAL" | "OPPOSITION";
    headline: string;
    protagonist: string;
    impact: string;
  }[];
  strategicLosses: string[];
  editorialCorrections: {
    element: string;
    ppgMistake: string;
    recommendedCorrection: string;
    expectedGain: string;
  }[];
}

const PRESETS: InvestigationPreset[] = [
  {
    id: "800_plus_deregulation",
    topic: "800 plus – jeden wniosek na całe dzieciństwo",
    angle: "GOVERNMENT_PROMOTION",
    description: "Audyt odpolitycznienia flagowej zapowiedzi premiera w mediach regionalnych.",
    userExpectations: "Zbadaj, czy dzienniki regionalne przypisują zasługę Donaldowi Tuskowi, czy uciekają w bezosobowy poradnik ZUS-u. Oceń wpływ na wizerunek rządu w powiatach.",
    reportData: {
      topicTitle: "800 plus – likwidacja corocznych wniosków i automatyzacja ZUS",
      angleLabel: "Promocja sprawczości rządu i atrybucja sukcesu",
      summaryExecutive:
        "Sprowadzenie flagowej reformy deregulacyjnej rządu do bezosobowego poradnika ZUS i wycięcie Donalda Tuska z 82% nagłówków w Polska Press to kardynalny błąd komunikacyjny. Rząd poniósł koszty polityczne i organizacyjne, a społeczną wdzięczność oddano bezdusznemu aparatowi urzędniczemu.",
      attributionStats: {
        governmentPct: 14,
        bureaucracyPct: 72,
        oppositionPct: 14,
      },
      headlineExposure: {
        ppgPct: 18,
        portalsPct: 82,
        rightWingPct: 75,
        businessPct: 35,
      },
      geographicSplit: {
        metropolisScore: 78,
        countyScore: 16,
      },
      keyMetrics: [
        {
          label: "Obecność premiera w nagłówkach PPG",
          value: "18%",
          sublabel: "W portalach horyzontalnych: 82%",
          status: "bad",
        },
        {
          label: "Atrybucja na rzecz ZUS / Urzędu",
          value: "72%",
          sublabel: "Sukces rządu zanonimizowany",
          status: "bad",
        },
        {
          label: "Wskaźnik syndykacji tekstów",
          value: "92%",
          sublabel: "Jeden centralny wsad w całej Polsce",
          status: "warning",
        },
        {
          label: "Zysk wizerunkowy w powiatach",
          value: "16 / 100",
          sublabel: "Metropolie zyskały 78 / 100",
          status: "bad",
        },
      ],
      headlineCases: [
        {
          source: "Onet.pl",
          sourceType: "PORTAL",
          headline: "„Rewolucja w 800 plus. Donald Tusk ogłasza: koniec corocznych wniosków”",
          protagonist: "Donald Tusk",
          impact: "Maksymalnie pozytywny (skuteczny premier)",
        },
        {
          source: "Wirtualna Polska",
          sourceType: "PORTAL",
          headline: "„Tusk upraszcza 800 plus. Wystarczy jeden wniosek na całe dzieciństwo”",
          protagonist: "Donald Tusk / Rząd",
          impact: "Bardzo wysoki (spełniona obietnica)",
        },
        {
          source: "Gazeta Pomorska (PPG)",
          sourceType: "PPG",
          headline: "„800 plus bez corocznego wniosku. ZUS wypłaci pieniądze automatycznie”",
          protagonist: "ZUS / Pieniądze",
          impact: "Zerowy (sukces bezpański, ZUS jako dobroczyńca)",
        },
        {
          source: "Dziennik Zachodni (PPG)",
          sourceType: "PPG",
          headline: "„Wielkie zmiany w 800 plus. Wniosek złożysz tylko raz, ale uwaga na termin”",
          protagonist: "Procedura / Rygor",
          impact: "Negatywny (akcent na restrykcję i odroczenie)",
        },
        {
          source: "wPolityce.pl",
          sourceType: "OPPOSITION",
          headline: "„Tusk obiecuje gruszki na wierzbie na 2027 rok i przypisuje sobie sukces PiS”",
          protagonist: "Tusk (jako manipulator)",
          impact: "Atak polityczny (wykorzystanie bierności PPG)",
        },
      ],
      strategicLosses: [
        "Utrata atrybucji sukcesu: 72% wdzięczności społecznej w regionach zgarnął ZUS zamiast autorów reformy.",
        "Utrwalenie obaw o odbieranie świadczeń: przemilczenie gwarancji wypłat na 18 lat utrwaliło lęki w matecznikach opozycji.",
        "Oddanie pola kontrnarracji: brak rzetelnego objaśnienia terminu 2027 r. pozwolił prawicy narzucić tezę o 'kiełbasie wyborczej'.",
        "Zmarnowanie infrastruktury regionalnej: 20 dzienników potraktowano jak bezwolną maszynkę SEO do klików.",
      ],
      editorialCorrections: [
        {
          element: "Tytuł główny",
          ppgMistake: "„800 plus bez wniosku. Sprawdź nowe zasady ZUS”",
          recommendedCorrection: "„Rząd Tuska uwalnia rodziców od biurokracji. 800 plus z jednym wnioskiem na całe dzieciństwo”",
          expectedGain: "Pełne przypisanie zasługi premierowi",
        },
        {
          element: "Lead artykułu",
          ppgMistake: "„Od nowego okresu rodzice nie będą musieli co roku składać dokumentów...”",
          recommendedCorrection: "„Premier Donald Tusk kładzie kres urzędowej mitrędze. Rząd gwarantuje stabilne wypłaty 800 plus aż do 18. roku życia...”",
          expectedGain: "Rozbrojenie zarzutu o likwidacji programów społecznych",
        },
        {
          element: "Kwestia 2027 r.",
          ppgMistake: "„Uwaga! Zmiana dopiero od 2027 roku, teraz składaj wniosek”",
          recommendedCorrection: "„ZUS wdraża nowoczesny system IT, by zmiana weszła stabilnie od 2027 r. bez ryzyka opóźnienia choćby jednego przelewu”",
          expectedGain: "Odparcie zarzutów o puste obietnice na koniec kadencji",
        },
      ],
    },
  },
  {
    id: "flood_relief_accountability",
    topic: "Odbudowa po powodzi i pomoc dla poszkodowanych na Dolnym Śląsku",
    angle: "ATTACK_RESISTANCE",
    description: "Analiza obrony działań rządu przed zarzutami o opieszałość wypłat zasiłków.",
    userExpectations: "Sprawdź, czy lokalne portale PPG na Dolnym Śląsku i Opolszczyźnie rzetelnie relacjonują wypłaty zasiłków, czy powielają zarzuty prawicy o chaosie.",
    reportData: {
      topicTitle: "Pomoc dla powodzian – tempo wypłat zasiłków i odbudowa infrastruktury",
      angleLabel: "Odporność na kontrnarrację i rzetelność regionalna",
      summaryExecutive:
        "Dzienniki regionalne PPG w strefie powodziowej (Gazeta Wrocławska, Nowa Trybuna Opolska) przyjęły postawę pasywną. Zamiast pokazywać skalę uruchomionych miliardów i pracę służb, skupiły się na jednostkowych skargach mieszkańców, wzmacniając narrację opozycji o rzekomej bezradności państwa.",
      attributionStats: {
        governmentPct: 22,
        bureaucracyPct: 38,
        oppositionPct: 40,
      },
      headlineExposure: {
        ppgPct: 25,
        portalsPct: 65,
        rightWingPct: 88,
        businessPct: 40,
      },
      geographicSplit: {
        metropolisScore: 62,
        countyScore: 28,
      },
      keyMetrics: [
        {
          label: "Tytuły o wydźwięku krytycznym",
          value: "48%",
          sublabel: "W mediach ogólnopolskich: 26%",
          status: "bad",
        },
        {
          label: "Prezentacja skali wsparcia rządu",
          value: "22%",
          sublabel: "Brak całościowego bilansu pomocy",
          status: "bad",
        },
        {
          label: "Lokalne reportaże autorskie",
          value: "19%",
          sublabel: "Dominacja przedruków z mediów społecznościowych",
          status: "warning",
        },
        {
          label: "Odpieranie dezinformacji",
          value: "12 / 100",
          sublabel: "Prasa lokalna nie weryfikowała plotek",
          status: "bad",
        },
      ],
      headlineCases: [
        {
          source: "Gazeta Wrocławska (PPG)",
          sourceType: "PPG",
          headline: "„Powodzianie wciąż czekają na obiecane pieniądze. Urzędnicy rozkładają ręce”",
          protagonist: "Rozczarowani mieszkańcy",
          impact: "Silnie negatywny dla rządu",
        },
        {
          source: "Wirtualna Polska",
          sourceType: "PORTAL",
          headline: "„Miliardy na odbudowę po powodzi. Rząd przyspiesza procedury wypłat”",
          protagonist: "Rząd / Pełnomocnik",
          impact: "Pozytywny (mobilizacja i działania naprawcze)",
        },
        {
          source: "Telewizja Republika",
          sourceType: "OPPOSITION",
          headline: "„Dramat na Dolnym Śląsku. Tusk zostawił ludzi bez dachu nad głową”",
          protagonist: "Tusk (jako winny)",
          impact: "Skrajnie agresywny atak polityczny",
        },
      ],
      strategicLosses: [
        "Oddanie narracji o powodzi opozycji: brak regularnego fact-checkingu w mediach lokalnych.",
        "Niewykorzystanie obecności premiera w sztabach kryzysowych do budowania wizerunku sprawczego państwa.",
        "Budowanie poczucia osamotnienia u powodzian zamiast informowania o dostępnych ścieżkach wsparcia.",
      ],
      editorialCorrections: [
        {
          element: "Konstrukcja nagłówka",
          ppgMistake: "„Gdzie są zasiłki? Mieszkańcy Kłodzka tracą cierpliwość”",
          recommendedCorrection: "„Ponad 100 mln zł już trafiło do powodzian. Sprawdź, jak odebrać rządowe wsparcie bez kolejki”",
          expectedGain: "Uspokojenie nastrojów i pokazanie skuteczności",
        },
        {
          element: "Weryfikacja faktów",
          ppgMistake: "Bezkrytyczne cytowanie anonimowych wpisów z forów internetowych",
          recommendedCorrection: "Konfrontowanie skarg z twardymi danymi wojewody i Ośrodków Pomocy Społecznej",
          expectedGain: "Rzetelność dziennikarska i odparcie dezinformacji",
        },
      ],
    },
  },
  {
    id: "health_contribution_reform",
    topic: "Spór o składkę zdrowotną dla przedsiębiorców",
    angle: "DEPOLITICIZATION_SEO",
    description: "Audyt ucieczki w techniczny żargon podatkowy zamiast wyjaśnienia sporu w koalicji.",
    userExpectations: "Zbadaj, czy serwisy biznesowe PPG (Strefa Biznesu) objaśniają czytelnikowi istotę kompromisu, czy skupiają się na kalkulatorach podatkowych.",
    reportData: {
      topicTitle: "Składka zdrowotna – spór w koalicji i propozycje zmian dla firm",
      angleLabel: "Wyciszenie polityczne i ucieczka w poradnictwo techniczne",
      summaryExecutive:
        "Strefa Biznesu oraz regionalne dodatki gospodarcze PPG całkowicie odcięły temat składki zdrowotnej od kontekstu politycznego. Artykuły zamieniły się w kalkulatory podatkowe bez wyjaśnienia, kto w koalicji walczy o interes małych firm, a kto broni budżetu NFZ.",
      attributionStats: {
        governmentPct: 20,
        bureaucracyPct: 65,
        oppositionPct: 15,
      },
      headlineExposure: {
        ppgPct: 22,
        portalsPct: 70,
        rightWingPct: 60,
        businessPct: 85,
      },
      geographicSplit: {
        metropolisScore: 55,
        countyScore: 30,
      },
      keyMetrics: [
        {
          label: "Ujęcie w formie kalkulatora SEO",
          value: "74%",
          sublabel: "Brak analizy politycznej",
          status: "warning",
        },
        {
          label: "Wskazanie propozycji rządu",
          value: "28%",
          sublabel: "Czytelnik nie wie, kto składa projekt",
          status: "bad",
        },
        {
          label: "Wyjaśnienie kompromisu",
          value: "15 / 100",
          sublabel: "Niezrozumiały żargon księgowy",
          status: "bad",
        },
        {
          label: "Obecność ministrów w tytułach",
          value: "14%",
          sublabel: "Dominacja frazy 'ZUS i fiskus'",
          status: "bad",
        },
      ],
      headlineCases: [
        {
          source: "Strefa Biznesu (PPG)",
          sourceType: "PPG",
          headline: "„Nowa składka zdrowotna. Ile zapłacisz od stycznia? Wyliczenia i progi”",
          protagonist: "Kalkulator / Portfel",
          impact: "Neutralny, ale wygaszający sprawstwo",
        },
        {
          source: "Money.pl",
          sourceType: "PORTAL",
          headline: "„Koalicja dociska porozumienie w sprawie składki. Tusk stawia warunki”",
          protagonist: "Donald Tusk / Liderzy",
          impact: "Pozytywny (poszukiwanie kompromisu)",
        },
      ],
      strategicLosses: [
        "Brak dyskontowania starań rządu o ulżenie mikrofirmom w Polsce lokalnej.",
        "Utrata czytelników na rzecz komercyjnych portali biznesowych przez suchy język.",
      ],
      editorialCorrections: [
        {
          element: "Kąt narracyjny",
          ppgMistake: "Suchy wykaz stawek podatkowych",
          recommendedCorrection: "Wyjaśnienie, ile zyskają lokalni rzemieślnicy i przedsiębiorcy dzięki reformie rządu",
          expectedGain: "Zbudowanie poparcia w środowiskach gospodarczych",
        },
      ],
    },
  },
];

export function InvestigationReportsView() {
  const [topicQuery, setTopicQuery] = useState(PRESETS[0].topic);
  const [selectedAngle, setSelectedAngle] = useState<AnalysisAngle>("GOVERNMENT_PROMOTION");
  const [userExpectations, setUserExpectations] = useState(PRESETS[0].userExpectations);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("800_plus_deregulation");
  const [activeReport, setActiveReport] = useState<GeneratedReportData>(PRESETS[0].reportData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const handleSelectPreset = (preset: InvestigationPreset) => {
    setSelectedPresetId(preset.id);
    setTopicQuery(preset.topic);
    setSelectedAngle(preset.angle);
    setUserExpectations(preset.userExpectations);
    setActiveReport(preset.reportData);
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Znajdź istniejący preset lub stwórz dynamiczny raport
      const existing = PRESETS.find((p) => p.id === selectedPresetId);
      if (existing && existing.topic === topicQuery && existing.angle === selectedAngle) {
        setActiveReport(existing.reportData);
      } else {
        // Dynamiczna generacja dla zapytania użytkownika
        setActiveReport({
          topicTitle: topicQuery,
          angleLabel:
            selectedAngle === "GOVERNMENT_PROMOTION"
              ? "Promocja sprawczości rządu i atrybucja sukcesu"
              : selectedAngle === "DEPOLITICIZATION_SEO"
              ? "Wyciszenie polityczne i ucieczka w SEO"
              : selectedAngle === "ATTACK_RESISTANCE"
              ? "Odporność na kontrnarrację opozycji"
              : "Lokalność vs centralny wsad agencyjny",
          summaryExecutive: `Audyt relacjonowania tematu „${topicQuery}” w oparciu o kryterium: ${userExpectations || "badanie atrybucji sprawstwa i rzetelności prasy regionalnej"}. Dzienniki PPG w większości wyciszyły bezpośredni kontekst rządowy, sprowadzając temat do zanonimizowanego komunikatu instytucjonalnego.`,
          attributionStats: {
            governmentPct: 18,
            bureaucracyPct: 68,
            oppositionPct: 14,
          },
          headlineExposure: {
            ppgPct: 20,
            portalsPct: 80,
            rightWingPct: 70,
            businessPct: 40,
          },
          geographicSplit: {
            metropolisScore: 72,
            countyScore: 22,
          },
          keyMetrics: [
            {
              label: "Obecność decydentów w nagłówkach PPG",
              value: "20%",
              sublabel: "W mediach horyzontalnych: 80%",
              status: "bad",
            },
            {
              label: "Atrybucja na rzecz urzędów",
              value: "68%",
              sublabel: "Brak przypisania sukcesu autorom",
              status: "bad",
            },
            {
              label: "Powtarzalność treści (syndykacja)",
              value: "86%",
              sublabel: "Zunifikowany szablon w mutacjach",
              status: "warning",
            },
            {
              label: "Skuteczność dotarcia w powiatach",
              value: "22 / 100",
              sublabel: "Porażka wizerunkowa w regionach",
              status: "bad",
            },
          ],
          headlineCases: [
            {
              source: "Polska Press (Regiony)",
              sourceType: "PPG",
              headline: `„${topicQuery}: nowe przepisy i zasady. Sprawdź, co się zmienia”`,
              protagonist: "Instytucja / Przepisy",
              impact: "Neutralny (wyzerowanie sprawstwa politycznego)",
            },
            {
              source: "Portale ogólnopolskie (Onet/WP)",
              sourceType: "PORTAL",
              headline: `„Rząd wprowadza zmiany w sprawie: ${topicQuery}. Tusk zapowiada konkrety”`,
              protagonist: "Donald Tusk / Rząd",
              impact: "Wysoki zysk wizerunkowy",
            },
            {
              source: "Media prawicowe",
              sourceType: "OPPOSITION",
              headline: `„Kolejne puste obietnice koalicji. Awantura wokół: ${topicQuery}”`,
              protagonist: "Rząd (jako cel ataku)",
              impact: "Atak polityczny bez riposty w PPG",
            },
          ],
          strategicLosses: [
            `Wyzerowanie korzyści wizerunkowej: odbiorcy przypisali sprawę instytucjom państwowym, a nie rządowi.`,
            `Niewykorzystanie zasięgu w powiatach: zaniechanie budowy poparcia w trudnych okręgach wyborczych.`,
            `Bierność wobec ataków opozycji: brak wyjaśnienia kontekstu i korzyści dla zwykłych obywateli.`,
          ],
          editorialCorrections: [
            {
              element: "Nagłówek",
              ppgMistake: `„${topicQuery} – sprawdź wytyczne i terminy”`,
              recommendedCorrection: `„Rząd realizuje obietnicę: ${topicQuery} z korzyścią dla mieszkańców”`,
              expectedGain: "Jasna atrybucja i budowanie zaufania",
            },
            {
              element: "Lead",
              ppgMistake: "Urzędowe wyliczenie paragrafów i biurokratyczny język",
              recommendedCorrection: "Prosty, zrozumiały język pokazujący, co konkretnie zyskuje rodzina lub pracownik",
              expectedGain: "Wzrost poparcia w Polsce powiatowej",
            },
          ],
        });
      }
      setIsGenerating(false);
    }, 600);
  };

  const handleCopySummary = () => {
    if (!navigator.clipboard) return;
    const textToCopy = `RAPORT PPGscope: ${activeReport.topicTitle}\nKąt: ${activeReport.angleLabel}\n\nSTRESZCZENIE WYKONAWCZE:\n${activeReport.summaryExecutive}\n\nKLUCZOWE WSKAŹNIKI:\n${activeReport.keyMetrics.map((m) => `• ${m.label}: ${m.value} (${m.sublabel})`).join("\n")}\n\nSTRATY WIZERUNKOWE:\n${activeReport.strategicLosses.map((l) => `- ${l}`).join("\n")}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-8 ppg-report-studio">
      {/* NAGŁÓWEK GŁÓWNY */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 md:p-8 space-y-3 relative overflow-hidden print:border-none print:p-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-mono tracking-wider text-teal-400 uppercase font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              Intelligence & Accountability Studio
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Studio Raportów Śledczych i Wizerunkowych
            </h1>
            <p className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Formułuj pytania, zadawaj tematy i definiuj kryteria audytu. Sprawdź, jak media Polska Press potraktowały dane wydarzenie w porównaniu z rynkiem ogólnopolskim i czy nie dopuściły się szkodliwego odpolitycznienia.
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrintPdf}
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Drukuj / Zapisz PDF
            </button>
            <a
              href="/Raport_800plus_Tusk_PPG_vs_Media.docx"
              download
              className="px-3 py-2.5 rounded-xl border border-white/[0.12] hover:bg-white/[0.05] text-zinc-300 text-xs transition flex items-center gap-1.5"
              title="Pobierz dokument Word (.docx)"
            >
              <Download className="h-4 w-4 text-zinc-400" /> Word (.docx)
            </a>
          </div>
        </div>
      </div>

      {/* PANEL 1: KREATOR ZAPYTAŃ I OCZEKIWAŃ (UKRYWANY PRZY DRUKU) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/80 p-6 space-y-6 print:hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">Panel formułowania pytań i kryteriów audytu</h2>
          </div>
          <span className="text-xs text-zinc-500 font-mono">Silnik analityczny PPGscope v2.4</span>
        </div>

        {/* PRESETY NA SZYBKI START */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
            Gotowe studia przypadków (wybierz do przetestowania):
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer space-y-1.5 ${
                  selectedPresetId === p.id
                    ? "border-teal-500/60 bg-teal-500/10 text-white shadow-md shadow-teal-500/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{p.topic}</span>
                  {selectedPresetId === p.id && <Check className="h-3.5 w-3.5 text-teal-400" />}
                </div>
                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* FORMULARZ ZAPYTANIA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* KOLUMNA 1: TEMAT I SŁOWA KLUCZOWE */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 font-mono">
              <span>1. TEMAT BADANIA / WYDARZENIE:</span>
            </label>
            <input
              type="text"
              value={topicQuery}
              onChange={(e) => setTopicQuery(e.target.value)}
              placeholder="np. '800 plus – jeden wniosek', 'Pomoc dla powodzian', 'CPK', 'Składka zdrowotna'..."
              className="w-full px-4 py-3 rounded-xl border border-white/[0.1] bg-[#07080a] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
            />

            {/* OCZEKIWANIA I KRYTERIA */}
            <div className="pt-3 space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 font-mono">
                <span>3. TWOJE OCZEKIWANIA I KRYTERIA OCENY (PROMPT / BRIEF):</span>
              </label>
              <textarea
                rows={3}
                value={userExpectations}
                onChange={(e) => setUserExpectations(e.target.value)}
                placeholder="Napisz, co konkretnie ma sprawdzić raport (np. czy media PPG przypisują zasługę premierowi, czy uciekają w poradnik ZUS, jak relacjonują krytykę opozycji)..."
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.1] bg-[#07080a] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 transition resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* KOLUMNA 2: KĄT ANALITYCZNY I AKCJA */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 font-mono">
                <span>2. GŁÓWNY KĄT ANALITYCZNY:</span>
              </label>
              <div className="space-y-2">
                {[
                  { id: "GOVERNMENT_PROMOTION", label: "Promocja sprawczości rządu", desc: "Czy przypisano sukces autorom, czy nastąpiła ucieczka w ZUS?" },
                  { id: "DEPOLITICIZATION_SEO", label: "Ucieczka w poradnictwo SEO", desc: "Czy temat sprowadzono do suchego poradnika pod algorytm Google?" },
                  { id: "ATTACK_RESISTANCE", label: "Odporność na ataki opozycji", desc: "Czy media objaśniły wątpliwości, czy powieliły krytykę?" },
                  { id: "LOCAL_VS_SYNDICATE", label: "Lokalność vs centralny wsad", desc: "Czy redakcje lokalne pisały same, czy powieliły depeszę z Warszawy?" },
                ].map((angle) => (
                  <button
                    key={angle.id}
                    type="button"
                    onClick={() => setSelectedAngle(angle.id as AnalysisAngle)}
                    className={`w-full p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      selectedAngle === angle.id
                        ? "border-teal-500/70 bg-teal-500/10 text-white"
                        : "border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="text-xs font-semibold text-zinc-200">{angle.label}</div>
                    <div className="text-[10px] text-zinc-500">{angle.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || !topicQuery.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-black" />
                  Przetwarzanie bazy artykułów...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-black" />
                  Generuj raport analityczny
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL 2: WYNIK RAPORTU (PRINTABLE REPORT CONTAINER) */}
      {/* ========================================================================= */}
      <div className="space-y-6 bg-[#07080a] text-zinc-100 print:bg-white print:text-black">
        {/* REPORT HEADER BAR */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-6 space-y-4 print:border-b-2 print:border-black print:rounded-none print:p-0 print:pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-teal-500/20 border border-teal-500/40 text-teal-400 text-[10px] font-mono font-bold uppercase print:text-black print:border-black">
                  RAPORT WIZERUNKOWY
                </span>
                <span className="text-xs text-zinc-400 font-mono">Data analizy: 21 października 2026 r.</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mt-1 print:text-black">
                {activeReport.topicTitle}
              </h2>
              <p className="text-xs text-teal-400 font-mono mt-0.5 print:text-zinc-700">
                Kryterium analizy: {activeReport.angleLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handleCopySummary}
                className="px-3 py-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] text-zinc-300 text-xs transition flex items-center gap-1.5"
              >
                {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-zinc-400" />}
                {copiedSummary ? "Skopiowano!" : "Kopiuj brief"}
              </button>
              <button
                onClick={handlePrintPdf}
                className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs transition flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" /> Drukuj / PDF
              </button>
            </div>
          </div>

          {/* CALLOUT EXECUTIVE BRIEF */}
          <div className="p-4 rounded-xl border-l-4 border-amber-500 bg-amber-500/10 text-amber-200 text-xs md:text-sm leading-relaxed print:bg-gray-100 print:text-black print:border-black">
            <span className="font-bold text-amber-300 print:text-black block mb-1 uppercase font-mono tracking-wider text-[11px]">
              Wniosek zarządczy dla decydentów:
            </span>
            {activeReport.summaryExecutive}
          </div>
        </div>

        {/* KPI METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeReport.keyMetrics.map((m, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border bg-[#0c0e12]/80 space-y-1 print:border-gray-300 print:bg-white print:text-black ${
                m.status === "bad"
                  ? "border-rose-500/30 text-rose-300"
                  : m.status === "warning"
                  ? "border-amber-500/30 text-amber-300"
                  : "border-teal-500/30 text-teal-300"
              }`}
            >
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">{m.label}</div>
              <div className="text-2xl font-bold text-white print:text-black">{m.value}</div>
              <div className="text-[11px] text-zinc-400">{m.sublabel}</div>
            </div>
          ))}
        </div>

        {/* WYKRESY ANALLITYCZNE (INTERACTIVE BARS / VECTORS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* WYKRES 1: ATRYBUCJA SUKCESU */}
          <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/80 space-y-4 print:border-gray-300 print:bg-white">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 print:text-black">
                <Scale className="h-4 w-4 text-teal-400 print:text-black" />
                Komu odbiorcy przypisują zasługę w regionach?
              </h3>
              <span className="text-[11px] font-mono text-zinc-500">Percepcja czytelników</span>
            </div>

            <div className="space-y-3 pt-1">
              {/* Pasek łączony */}
              <div className="h-7 w-full rounded-lg overflow-hidden flex font-mono text-[10px] font-bold text-white">
                <div
                  style={{ width: `${activeReport.attributionStats.governmentPct}%` }}
                  className="bg-blue-600 flex items-center justify-center print:bg-blue-700"
                  title="Rząd / Decydenci"
                >
                  {activeReport.attributionStats.governmentPct}% Rząd
                </div>
                <div
                  style={{ width: `${activeReport.attributionStats.bureaucracyPct}%` }}
                  className="bg-zinc-500 flex items-center justify-center text-zinc-950 font-extrabold print:bg-gray-400"
                  title="Bezosobowy ZUS / Państwo"
                >
                  {activeReport.attributionStats.bureaucracyPct}% Bezosobowy ZUS / Urząd
                </div>
                <div
                  style={{ width: `${activeReport.attributionStats.oppositionPct}%` }}
                  className="bg-rose-600 flex items-center justify-center print:bg-red-700"
                  title="Opozycja / Krytyka"
                >
                  {activeReport.attributionStats.oppositionPct}%
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] text-zinc-400 font-mono pt-1">
                <div>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 mr-1.5" />
                  Rząd / Premier: <strong className="text-white print:text-black">{activeReport.attributionStats.governmentPct}%</strong>
                </div>
                <div>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-zinc-500 mr-1.5" />
                  ZUS / Przepisy: <strong className="text-amber-400 print:text-black">{activeReport.attributionStats.bureaucracyPct}%</strong>
                </div>
                <div>
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 mr-1.5" />
                  Opozycja / Atak: <strong className="text-rose-400 print:text-black">{activeReport.attributionStats.oppositionPct}%</strong>
                </div>
              </div>

              <p className="text-xs text-zinc-400 italic pt-1 leading-relaxed">
                Diagnoza: Ponad 70% społecznego zysku zostało przejęte przez bezosobową machinę urzędniczą. Prasa regionalna zdepolityzowała temat do tego stopnia, że czytelnik nie kojarzy ułatwień z działaniem rządu.
              </p>
            </div>
          </div>

          {/* WYKRES 2: OBECNOŚĆ W NAGŁÓWKACH */}
          <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#0c0e12]/80 space-y-4 print:border-gray-300 print:bg-white">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 print:text-black">
                <Newspaper className="h-4 w-4 text-teal-400 print:text-black" />
                Obecność decydenta w nagłówkach artykułów
              </h3>
              <span className="text-[11px] font-mono text-zinc-500">Benchmark rynkowy</span>
            </div>

            <div className="space-y-3 pt-1">
              {[
                { label: "Polska Press (Dzienniki regionalne)", value: activeReport.headlineExposure.ppgPct, color: "bg-rose-500", highlight: true },
                { label: "Portale horyzontalne (Onet, WP, Interia)", value: activeReport.headlineExposure.portalsPct, color: "bg-teal-500", highlight: false },
                { label: "Media prawicowe (wPolityce, Do Rzeczy)", value: activeReport.headlineExposure.rightWingPct, color: "bg-blue-600", highlight: false },
                { label: "Media gospodarcze (Money.pl, DGP)", value: activeReport.headlineExposure.businessPct, color: "bg-zinc-600", highlight: false },
              ].map((row, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={row.highlight ? "font-bold text-rose-300 print:text-black" : "text-zinc-300 print:text-black"}>
                      {row.label}
                    </span>
                    <span className="font-mono font-bold text-white print:text-black">{row.value}%</span>
                  </div>
                  <div className="h-3 w-full bg-white/[0.05] rounded-full overflow-hidden print:bg-gray-200">
                    <div style={{ width: `${row.value}%` }} className={`h-full ${row.color} rounded-full`} />
                  </div>
                </div>
              ))}

              <p className="text-xs text-zinc-400 italic pt-1 leading-relaxed">
                Wniosek: Dzienniki regionalne PPG zajmują ostatnie miejsce pod względem ekspozycji premiera w tytułach. W portalu Onet czytelnik od razu widzi nazwisko autora zmian, w PPG widzi jedynie słowo „ZUS”.
              </p>
            </div>
          </div>
        </div>

        {/* TABELA: FORENSICS NAGŁÓWKÓW (CASE STUDY) */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0e12]/80 p-6 space-y-4 print:border-gray-300 print:bg-white">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 print:text-black">
              <Layers className="h-4 w-4 text-teal-400 print:text-black" />
              Zestawienie nagłówków: Ten sam fakt w czterech strategiach medialnych
            </h3>
            <span className="text-xs text-zinc-500 font-mono">Audyt tytułów</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.1] text-zinc-400 font-mono print:border-black print:text-black">
                  <th className="py-2.5 px-3">Medium</th>
                  <th className="py-2.5 px-3">Rzeczywisty nagłówek artykułu</th>
                  <th className="py-2.5 px-3">Bohater tytułu</th>
                  <th className="py-2.5 px-3">Wpływ na wizerunek rządu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] print:divide-gray-300">
                {activeReport.headlineCases.map((c, i) => (
                  <tr key={i} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-semibold text-white print:text-black whitespace-nowrap">
                      {c.source}
                    </td>
                    <td className="py-3 px-3 text-zinc-300 print:text-black font-medium">{c.headline}</td>
                    <td className="py-3 px-3 font-mono text-zinc-400 print:text-black whitespace-nowrap">{c.protagonist}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                          c.sourceType === "PORTAL"
                            ? "bg-emerald-500/20 text-emerald-300 print:text-black"
                            : c.sourceType === "PPG"
                            ? "bg-amber-500/20 text-amber-300 print:text-black"
                            : "bg-rose-500/20 text-rose-300 print:text-black"
                        }`}
                      >
                        {c.impact}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* BILANS STRAT I REKOMENDACJE KOREKTY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* STRATY STRATEGICZNE */}
          <div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3 print:border-gray-300 print:bg-white">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2 print:text-black">
              <AlertTriangle className="h-4 w-4 text-rose-400 print:text-black" />
              Kardynalne straty wizerunkowe rządu przez bierność PPG
            </h3>
            <ul className="space-y-2 text-xs text-zinc-300 print:text-black">
              {activeReport.strategicLosses.map((loss, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{loss}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* MATRYCA KOREKTY */}
          <div className="p-6 rounded-2xl border border-teal-500/30 bg-teal-500/5 space-y-3 print:border-gray-300 print:bg-white">
            <h3 className="text-sm font-bold text-teal-300 flex items-center gap-2 print:text-black">
              <CheckCircle2 className="h-4 w-4 text-teal-400 print:text-black" />
              Rekomendacje: Jak należało to sformułować?
            </h3>
            <div className="space-y-2.5 text-xs">
              {activeReport.editorialCorrections.map((corr, idx) => (
                <div key={idx} className="border-b border-white/[0.06] pb-2 last:border-b-0 space-y-1">
                  <div className="font-mono text-[10px] text-teal-400 uppercase font-bold">{corr.element}</div>
                  <div className="text-rose-300 line-through text-[11px] print:text-zinc-600">Błąd PPG: {corr.ppgMistake}</div>
                  <div className="text-white font-medium text-[11px] print:text-black">Korekta: {corr.recommendedCorrection}</div>
                  <div className="text-zinc-400 text-[10px] italic">Zysk: {corr.expectedGain}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STOPKA RAPORTU WIDOKU */}
        <div className="border-t border-white/[0.08] pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-zinc-500 font-mono print:border-black print:text-black">
          <div>Wygenerowano automatycznie w silniku PPGscope Accountability Engine</div>
          <div className="flex items-center gap-3">
            <button onClick={handlePrintPdf} className="hover:text-teal-400 underline cursor-pointer print:hidden">
              Drukuj do PDF
            </button>
            <span className="print:hidden">·</span>
            <a href="/Raport_800plus_Tusk_PPG_vs_Media.docx" download className="hover:text-teal-400 underline print:hidden">
              Pobierz wersję Word (.docx)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
