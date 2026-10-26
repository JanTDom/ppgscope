import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  POLITICAL_ACTORS,
  ALL_POLITICAL_ACTOR_IDS,
  DOMAIN_SCOPE_OPTIONS,
  detectPoliticalActors,
  evaluatePoliticalSentiment,
  evaluateKOSentiment,
  calculateAllPoliticalSentiments,
  calculateMediaAccountability,
  type PoliticalActorId,
} from "./sentiment.ts";

describe("Wydźwięk sceny politycznej — Detekcja podmiotów", () => {
  it("posiada komplet 8 zdefiniowanych sił politycznych i opcje dziedzinowe", () => {
    assert.equal(ALL_POLITICAL_ACTOR_IDS.length, 8);
    assert.ok(DOMAIN_SCOPE_OPTIONS.length >= 8);
    const expected: PoliticalActorId[] = [
      "ko",
      "pis",
      "psl",
      "polska2050",
      "lewica",
      "konfederacja",
      "nawrocki",
      "rozwoj_plus",
    ];
    for (const exp of expected) {
      assert.ok(POLITICAL_ACTORS[exp], `Brak konfiguracji dla aktora ${exp}`);
      assert.ok(POLITICAL_ACTORS[exp].curatedSampleArticles.length >= 6);
    }
  });

  it("wykrywa KO / PO po politykach i nazwie partii, eliminując fałszywą prepozycję 'po'", () => {
    const text1 = "Premier Donald Tusk spotkał się z mieszkańcami Gdańska.";
    const detected1 = detectPoliticalActors(text1);
    assert.ok(detected1.includes("ko"));

    const text2 = "Rafał Trzaskowski zapowiada inwestycje w infrastrukturę stolicy.";
    const detected2 = detectPoliticalActors(text2);
    assert.ok(detected2.includes("ko"));

    const text3 = "Koalicja Obywatelska przedstawiła projekt nowelizacji.";
    assert.ok(detectPoliticalActors(text3).includes("ko"));

    const text4 = "Posłowie PO oraz partia KO poparli wniosek.";
    assert.ok(detectPoliticalActors(text4).includes("ko"));

    // Zabezpieczenie przed polskim przyimkiem "po"
    const sportText = "Siatkarze z regionu awansowali do fazy play-off po dramatycznym tie-breaku.";
    assert.ok(!detectPoliticalActors(sportText).includes("ko"), "Przyimek 'po' nie może być uznany za partię PO");

    // Zabezpieczenie przed marką sprzętu AL-KO
    const alkoText = "AL-KO Superpuchar Polski. Kapitan poprowadził drużynę po triumf w Częstochowie.";
    assert.ok(!detectPoliticalActors(alkoText).includes("ko"), "Marka sprzętowa AL-KO nie może być uznana za Koalicję Obywatelską");
  });

  it("wykrywa PiS po politykach i nazwach partii, eliminując słowa pisaliśmy/napisali", () => {
    const text1 = "Prezes Jarosław Kaczyński przemawiał na konwencji.";
    assert.ok(detectPoliticalActors(text1).includes("pis"));

    const text2 = "Mateusz Morawiecki i Mariusz Błaszczak skrytykowali decyzje rządu.";
    assert.ok(detectPoliticalActors(text2).includes("pis"));

    const text3 = "Klub Prawo i Sprawiedliwość złożył wniosek o wotum nieufności.";
    assert.ok(detectPoliticalActors(text3).includes("pis"));

    // Zabezpieczenie przed 'pisaliśmy'
    const nonPistext = "Pisaliśmy w Kurierze o nowym taryfikatorze mandatów dla kierowców.";
    assert.ok(!detectPoliticalActors(nonPistext).includes("pis"), "Słowo 'pisaliśmy' nie może być uznane za PiS");
  });

  it("wykrywa PSL i ludowców w sprawach rolniczych i infrastrukturalnych", () => {
    const text1 = "Wicepremier Władysław Kosiniak-Kamysz podpisał kontrakt na dostawę sprzętu obronnego.";
    assert.ok(detectPoliticalActors(text1).includes("psl"));

    const text2 = "Dariusz Klimczak oraz Czesław Siekierski reprezentują Polskie Stronnictwo Ludowe.";
    assert.ok(detectPoliticalActors(text2).includes("psl"));

    const text3 = "Działacze ludowców spotkali się na zjeździe wojewódzkim izb rolniczych.";
    assert.ok(detectPoliticalActors(text3).includes("psl"));
  });

  it("wykrywa Polskę 2050", () => {
    const text1 = "Marszałek Szymon Hołownia otworzył posiedzenie Sejmu.";
    assert.ok(detectPoliticalActors(text1).includes("polska2050"));

    const text2 = "Katarzyna Pełczyńska-Nałęcz omówiła wydatkowanie środków unijnych z KPO.";
    assert.ok(detectPoliticalActors(text2).includes("polska2050"));

    const text3 = "Ugrupowanie Polska 2050 ogłosiło pakiet zmian klimatycznych.";
    assert.ok(detectPoliticalActors(text3).includes("polska2050"));
  });

  it("wykrywa Lewicę i Partię Razem w sprawach pracy i mieszkań, ignorując market Biedronka i zwrot tym razem", () => {
    const text1 = "Włodzimierz Czarzasty i Robert Biedroń podsumowali konsultacje.";
    assert.ok(detectPoliticalActors(text1).includes("lewica"));

    const text2 = "Agnieszka Dziemianowicz-Bąk przedstawiła założenia renty wdowiej.";
    assert.ok(detectPoliticalActors(text2).includes("lewica"));

    const text3 = "Adrian Zandberg z Partii Razem zabrał głos w debacie o mieszkalnictwie.";
    assert.ok(detectPoliticalActors(text3).includes("lewica"));

    // Zabezpieczenie przed marketem Biedronka
    const marketText = "Klienci rzucili się na promocje w Biedronce przed 1 listopada.";
    assert.ok(!detectPoliticalActors(marketText).includes("lewica"), "Sklep Biedronka nie może być uznany za Roberta Biedronia");

    // Zabezpieczenie przed zwrotem 'tym razem'
    const matchText = "Tym razem Niebiescy pokonali rywali i zdobyli komplet punktów.";
    assert.ok(!detectPoliticalActors(matchText).includes("lewica"), "Zwrot 'tym razem' nie może być uznany za Partię Razem");
  });

  it("wykrywa Konfederację w sprawach podatków i deregulacji", () => {
    const text1 = "Sławomir Mentzen spotkał się z przedsiębiorcami na Śląsku w sprawie podatków.";
    assert.ok(detectPoliticalActors(text1).includes("konfederacja"));

    const text2 = "Wicemarszałek Krzysztof Bosak zaprezentował stanowisko Konfederacji.";
    assert.ok(detectPoliticalActors(text2).includes("konfederacja"));

    const text3 = "Konfederacja Wolność i Niepodległość zorganizowała konferencję o transporcie.";
    assert.ok(detectPoliticalActors(text3).includes("konfederacja"));
  });

  it("wykrywa Karola Nawrockiego w inicjatywach społecznych i historycznych, ignorując Daniela Nawrockiego", () => {
    const text1 = "Karol Nawrocki odwiedził Małopolskę i spotkał się z mieszkańcami.";
    assert.ok(detectPoliticalActors(text1).includes("nawrocki"));

    const text2 = "Prezes IPN dr Karol Nawrocki wygłosił wykład okolicznościowy.";
    assert.ok(detectPoliticalActors(text2).includes("nawrocki"));

    const text3 = "Sztab Karola Nawrockiego zebrał wymagane podpisy poparcia.";
    assert.ok(detectPoliticalActors(text3).includes("nawrocki"));

    // Zabezpieczenie przed Danielem Nawrockim
    const danielText = "Daniel Nawrocki i jego piękna partnerka na gali w Warszawie.";
    assert.ok(!detectPoliticalActors(danielText).includes("nawrocki"), "Daniel Nawrocki nie może być mylony z Karolem Nawrockim");
  });

  it("wykrywa Rozwój Plus i ruch Tak Dla Rozwoju w kontekście CPK i atomu", () => {
    const text1 = "Inicjatywa Rozwój Plus przedstawiła raport o korzyściach z budowy CPK.";
    assert.ok(detectPoliticalActors(text1).includes("rozwoj_plus"));

    const text2 = "Ruch Społeczny Tak Dla Rozwoju złożył projekt obywatelski.";
    assert.ok(detectPoliticalActors(text2).includes("rozwoj_plus"));

    const text3 = "Marcin Horała i Paulina Matysiak mówią o strategicznych projektach rozwojowych.";
    assert.ok(detectPoliticalActors(text3).includes("rozwoj_plus"));
  });
});

describe("Wydźwięk sceny politycznej — Ewaluacja nastrojów i standard KRRiT", () => {
  it("poprawnie klasyfikuje wydźwięk pozytywny przy afirmatywnej leksyce gospodarczej i inwestycyjnej", () => {
    const res = evaluatePoliticalSentiment(
      "Władysław Kosiniak-Kamysz ogłosił wielki sukces i historyczny miliard na inwestycje obronne w regionie.",
      "psl"
    );
    assert.equal(res.sentiment, "positive");
    assert.equal(res.label, "Pozytywny");
    assert.ok(res.detected_entities.includes("Władysław Kosiniak-Kamysz"));
    assert.ok(res.rationale.includes("pozytywnych"));
  });

  it("poprawnie klasyfikuje wydźwięk negatywny przy leksyce krytycznej i sporach", () => {
    const res = evaluatePoliticalSentiment(
      "Ostra krytyka i zarzuty wobec działań klubu PiS, protest mieszkańców przeciwko chaosowi i podwyżkom cen.",
      "pis"
    );
    assert.equal(res.sentiment, "negative");
    assert.equal(res.label, "Negatywny");
    assert.ok(res.detected_entities.includes("Klub PiS") || res.detected_entities.includes("Prawo i Sprawiedliwość"));
    assert.ok(res.rationale.includes("krytycznych"));
  });

  it("poprawnie klasyfikuje wydźwięk neutralny dla suchych relacji faktograficznych", () => {
    const res = evaluatePoliticalSentiment(
      "Szymon Hołownia poprowadził posiedzenie Sejmu, podczas którego posłowie głosowali nad porządkiem obrad.",
      "polska2050"
    );
    assert.equal(res.sentiment, "neutral");
    assert.equal(res.label, "Neutralny");
    assert.ok(res.detected_entities.includes("Szymon Hołownia"));
  });

  it("zwraca no_actor, gdy tekst nie dotyczy danego podmiotu", () => {
    const res = evaluatePoliticalSentiment(
      "Pogoda w Tatrach: ratownicy TOPR ostrzegają przed lawinami na szlakach.",
      "ko"
    );
    assert.equal(res.sentiment, "no_actor");
    assert.equal(res.label, "Brak podmiotu");
    assert.equal(res.detected_entities.length, 0);
  });

  it("zachowuje pełną kompatybilność wsteczną z evaluateKOSentiment", () => {
    const res1 = evaluateKOSentiment("Donald Tusk odtrąbił sukces i rekordowy wzrost inwestycji.");
    assert.equal(res1.sentiment, "positive");
    assert.ok(res1.detected_entities.includes("Donald Tusk"));

    const res2 = evaluateKOSentiment("Pogoda w Zakopanem: słońce i ciepły wiatr.");
    assert.equal(res2.sentiment, "no_ko");
  });
});

describe("Wydźwięk sceny politycznej — Agregacja wielodziedzinowa (Cross-Domain)", () => {
  it("oblicza metryki dla wszystkich 8 aktorów bez zwracania zera", () => {
    const mockArticles = [
      { title: "Kosiniak-Kamysz ogłasza rekordowe inwestycje", lead: "Sukces negocjacyjny PSL", domain: "infrastruktura" },
      { title: "Czarzasty i Lewica w Sejmie", lead: "Relacja z obrad klubu", domain: "wladza" },
      { title: "Kaczyński krytykuje rząd za chaos i podwyżki podatków", lead: "Klub PiS zwołuje konferencję", domain: "gospodarka" },
      { title: "Rozwój Plus zbiera podpisy pod CPK", lead: "Wielki sukces ruchu Tak Dla Rozwoju", domain: "infrastruktura" },
      { title: "Karol Nawrocki spotkał się z mieszkańcami", lead: "Prezes IPN w Małopolsce", domain: "historia" },
      { title: "Siekierski w Brukseli rozmawia o dopłatach rolnych", lead: "PSL walczy o interes wsi", domain: "rolnictwo" },
    ];

    const resultAll = calculateAllPoliticalSentiments(mockArticles, 100, 30, "all_political");

    for (const actorId of ALL_POLITICAL_ACTOR_IDS) {
      const data = resultAll[actorId];
      assert.ok(data, `Brak danych agregatu dla ${actorId}`);
      assert.equal(data.actor_id, actorId);
      assert.ok(data.mentions_count >= 1, `Liczba wzmianek dla ${actorId} nie może wynosić 0`);
      assert.ok(data.top_politicians.length > 0);
      assert.ok(data.breakdown.positive.pct >= 0);
      assert.ok(data.breakdown.neutral.pct >= 0);
      assert.ok(data.breakdown.negative.pct >= 0);
      assert.ok(data.sample_articles && data.sample_articles.length > 0);
      const sum = Math.round(data.breakdown.positive.pct + data.breakdown.neutral.pct + data.breakdown.negative.pct);
      assert.ok(Math.abs(sum - 100) <= 1, `Suma procentów wynosi ${sum}, oczekiwano ~100`);
    }
  });

  it("obsługuje filtrowanie według dziedziny (np. gospodarka, infrastruktura, rolnictwo)", () => {
    const mockArticles = [
      { title: "Rozwój Plus i CPK: Nowa linia kolejowa", lead: "Inwestycja infrastrukturalna", domain: "infrastruktura" },
      { title: "Siekierski o dopłatach dla rolników", lead: "PSL na wsi", domain: "rolnictwo" },
      { title: "Mentzen o podatkach i ZUS", lead: "Konfederacja w obronie firm", domain: "gospodarka" },
    ];

    const infraResult = calculateAllPoliticalSentiments(mockArticles, 50, 30, "infrastruktura");
    assert.equal(infraResult.rozwoj_plus.domain_scope, "infrastruktura");
    assert.ok(infraResult.rozwoj_plus.mentions_count >= 1);

    const agroResult = calculateAllPoliticalSentiments(mockArticles, 50, 30, "rolnictwo");
    assert.equal(agroResult.psl.domain_scope, "rolnictwo");
    assert.ok(agroResult.psl.mentions_count >= 1);
  });
});

describe("Odpowiedzialność redakcyjna za rozkład sympatii (Media Accountability & Geography)", () => {
  const mockTitles = [
    { id: "db_pl", name: "Dziennik Bałtycki", domain: "dziennikbaltycki.pl", region: "Pomorskie", type: "DZIENNIK_REGIONALNY", articles_count: 150 },
    { id: "nowiny_pl", name: "Nowiny", domain: "nowiny24.pl", region: "Podkarpackie", type: "DZIENNIK_REGIONALNY", articles_count: 140 },
    { id: "gw_pl", name: "Gazeta Wrocławska", domain: "gazetawroclawska.pl", region: "Dolnośląskie", type: "DZIENNIK_REGIONALNY", articles_count: 130 },
    { id: "echo_eu", name: "Echo Dnia Świętokrzyskie", domain: "echodnia.eu", region: "Świętokrzyskie", type: "DZIENNIK_REGIONALNY", articles_count: 120 },
    { id: "dz_pl", name: "Dziennik Zachodni", domain: "dziennikzachodni.pl", region: "Śląskie", type: "DZIENNIK_REGIONALNY", articles_count: 160 },
  ];

  const mockAggs = {
    "dziennikbaltycki.pl": { totalCount: 150, domains: [{ slug: "wladza", total: 40 }] },
    "nowiny24.pl": { totalCount: 140, domains: [{ slug: "wladza", total: 35 }] },
    "gazetawroclawska.pl": { totalCount: 130, domains: [{ slug: "wladza", total: 30 }] },
    "echodnia.eu": { totalCount: 120, domains: [{ slug: "wladza", total: 28 }] },
    "dziennikzachodni.pl": { totalCount: 160, domains: [{ slug: "wladza", total: 32 }] },
  };

  it("identyfikuje media przychylne i krytyczne dla KO (Dziennik Bałtycki vs Nowiny)", () => {
    const accKO = calculateMediaAccountability(mockTitles, mockAggs, "ko", -5.0, 30, "all_political");
    assert.equal(accKO.actor_id, "ko");
    assert.ok(accKO.total_mentions > 0);
    assert.ok(accKO.top_friendly.length > 0);
    assert.ok(accKO.top_critical.length > 0);
    
    // Pomorskie (Dziennik Bałtycki) powinno mieć wyższe saldo niż Podkarpackie (Nowiny)
    const db = accKO.media.find(m => m.domain === "dziennikbaltycki.pl");
    const nowiny = accKO.media.find(m => m.domain === "nowiny24.pl");
    assert.ok(db && nowiny);
    assert.ok(db.net_sentiment_score > nowiny.net_sentiment_score);
    assert.ok(db.impact_score > 0, "Dziennik Bałtycki powinien ciągnąć wynik KO w górę");
    assert.ok(nowiny.impact_score < 0, "Nowiny powinny ciągnąć wynik KO w dół");
    assert.ok(accKO.editorial_insight.includes("Pomorza"));
  });

  it("identyfikuje media przychylne i krytyczne dla PiS (Nowiny vs Dziennik Bałtycki)", () => {
    const accPiS = calculateMediaAccountability(mockTitles, mockAggs, "pis", -15.0, 30, "all_political");
    assert.equal(accPiS.actor_id, "pis");
    const db = accPiS.media.find(m => m.domain === "dziennikbaltycki.pl");
    const nowiny = accPiS.media.find(m => m.domain === "nowiny24.pl");
    assert.ok(db && nowiny);
    assert.ok(nowiny.net_sentiment_score > db.net_sentiment_score);
    assert.ok(nowiny.impact_score > 0, "Nowiny powinny ciągnąć wynik PiS w górę");
    assert.ok(db.impact_score < 0, "Dziennik Bałtycki powinien ciągnąć wynik PiS w dół");
    assert.ok(accPiS.editorial_insight.includes("Podkarpacia"));
  });

  it("generuje zestawienie 16 województw z saldem i tendencją", () => {
    const accPSL = calculateMediaAccountability(mockTitles, mockAggs, "psl", 5.0, 30, "all_political");
    assert.ok(accPSL.regions.length >= 4);
    assert.ok(typeof accPSL.regions[0].net_sentiment_score === "number");
    assert.ok(accPSL.regions[0].sentiment_tendency);
    assert.equal(accPSL.weighting_mode, "raw");
    assert.equal(accPSL.provenance.status, "POMIAR");
  });

  it("obsługuje ważenie zasięgowe Mediapanel PBI/Gemius i ekspozycję SG", () => {
    const extendedTitles = [
      ...mockTitles,
      { id: "i_pl", name: "Portal i.pl", domain: "i.pl", region: "Ogólnopolski", type: "PORTAL_KRAJOWY", articles_count: 500 },
      { id: "kartuzy_nm", name: "Kartuzy Nasze Miasto", domain: "kartuzy.naszemiasto.pl", region: "Pomorskie", type: "NASZE_MIASTO", articles_count: 50 },
    ];

    // Tryb 1: Czysta produkcja redakcyjna (raw)
    const accRaw = calculateMediaAccountability(extendedTitles, mockAggs, "ko", 0.0, 30, "all_political", "raw");
    const iPlRaw = accRaw.media.find(m => m.domain === "i.pl");
    const kartuzyRaw = accRaw.media.find(m => m.domain === "kartuzy.naszemiasto.pl");
    assert.ok(iPlRaw && kartuzyRaw);
    assert.equal(iPlRaw.effective_weight, 1.0);
    assert.equal(kartuzyRaw.effective_weight, 1.0);

    // Tryb 2: Zasięg audytorium (audience_reach)
    const accReach = calculateMediaAccountability(extendedTitles, mockAggs, "ko", 0.0, 30, "all_political", "audience_reach");
    const iPlReach = accReach.media.find(m => m.domain === "i.pl");
    const kartuzyReach = accReach.media.find(m => m.domain === "kartuzy.naszemiasto.pl");
    assert.ok(iPlReach && kartuzyReach);
    assert.equal(iPlReach.effective_weight, 8.5);
    assert.equal(kartuzyReach.effective_weight, 0.8);
    assert.ok(iPlReach.weighted_mentions! > iPlRaw.actor_mentions);
    assert.equal(accReach.provenance.status, "PRZYBLIŻENIE");
    assert.ok(accReach.provenance.label.includes("Mediapanel"));

    // Tryb 3: Ekspozycja strony głównej (homepage_exposure)
    const accExposure = calculateMediaAccountability(extendedTitles, mockAggs, "ko", 0.0, 30, "all_political", "homepage_exposure");
    const iPlExp = accExposure.media.find(m => m.domain === "i.pl");
    assert.ok(iPlExp);
    assert.ok(typeof iPlExp.effective_weight === "number" && iPlExp.effective_weight >= 3.0);
    assert.equal(accExposure.provenance.status, "POMIAR");

    // Tryb 4: Telemetria rzeczywista z GA4
    const mockTelemetry = {
      "i.pl": 500000,
      "dziennikbaltycki.pl": 100000,
      "kartuzy.naszemiasto.pl": 2500,
    };
    const accTelemetry = calculateMediaAccountability(
      extendedTitles,
      mockAggs,
      "ko",
      0.0,
      30,
      "all_political",
      "telemetry",
      "ALL",
      mockTelemetry
    );
    const iPlTelem = accTelemetry.media.find(m => m.domain === "i.pl");
    assert.ok(iPlTelem);
    assert.ok(iPlTelem.effective_weight! > 5);
    assert.equal(accTelemetry.provenance.status, "POMIAR");
  });

  it("obsługuje koszyki regionalne (wszystkie vs dzienniki vs powiaty)", () => {
    const extendedTitles = [
      ...mockTitles,
      { id: "kartuzy_nm", name: "Kartuzy Nasze Miasto", domain: "kartuzy.naszemiasto.pl", region: "Pomorskie", type: "NASZE_MIASTO", articles_count: 50 },
    ];

    // Koszyk: tylko dzienniki regionalne
    const accDzienniki = calculateMediaAccountability(extendedTitles, mockAggs, "ko", 0.0, 30, "all_political", "raw", "DZIENNIKI");
    assert.ok(accDzienniki.media.every(m => m.type === "DZIENNIK_REGIONALNY" || m.type === "PORTAL_KRAJOWY"));
    assert.equal(accDzienniki.media.some(m => m.domain === "kartuzy.naszemiasto.pl"), false);

    // Koszyk: tylko powiaty
    const accPowiaty = calculateMediaAccountability(extendedTitles, mockAggs, "ko", 0.0, 30, "all_political", "raw", "POWIATY");
    assert.ok(accPowiaty.media.every(m => m.type !== "DZIENNIK_REGIONALNY" && m.type !== "PORTAL_KRAJOWY"));
    assert.equal(accPowiaty.media.some(m => m.domain === "kartuzy.naszemiasto.pl"), true);
  });
});
