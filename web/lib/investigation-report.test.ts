import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateInvestigationReport,
  type InvestigationArticle,
} from "./investigation-report.ts";

describe("Studio Raportów Śledczych (Investigation Report Engine)", () => {
  const sampleArticles: InvestigationArticle[] = [
    {
      id: "art-1",
      title: "Katarzyna Pełczyńska-Nałęcz ogłosiła, że odchodzi z rządu Donalda Tuska",
      lead: "Ministra funduszy poinformowała o dymisji na platformie X. Wartości ważniejsze niż stołki.",
      url: "https://i.pl/pelczynska-nalecz-oglosila-ze-odchodzi-z-rzadu/ar/c1p2-29462603",
      portal_name: "Portal i.pl",
      portal_domain: "i.pl",
      published_at: "2026-10-22T21:35:00Z",
      is_duplicate: false,
      byline_type: "named",
      author_name: "Marcin Koziestański",
      locality: "C",
    },
    {
      id: "art-2",
      title: "Donald Tusk: Mam dwie kandydatury na nową minister funduszy",
      lead: "Premier uspokaja po odejściu Pełczyńskiej-Nałęcz. Koalicja działa stabilnie.",
      url: "https://i.pl/donald-tusk-mam-dwie-kandydatury/ar/c1p2-29463737",
      portal_name: "Portal i.pl",
      portal_domain: "i.pl",
      published_at: "2026-10-23T08:55:00Z",
      is_duplicate: true,
      locality: "C",
    },
    {
      id: "art-3",
      title: "Pełczyńska-Nałęcz została wyrzucona z partii Polska 2050. Za co? Za działanie na szkodę",
      lead: "Zarząd partii podjął decyzję o wykluczeniu byłej minister za szkodzenie ugrupowaniu.",
      url: "https://dziennikbaltycki.pl/pelczynska-nalecz-wyrzucona/ar/c1p2-29467067",
      portal_name: "Dziennik Bałtycki",
      portal_domain: "dziennikbaltycki.pl",
      published_at: "2026-10-24T18:52:00Z",
      is_duplicate: true,
      locality: "L",
    },
    {
      id: "art-4",
      title: "Katarzyna Pełczyńska-Nałęcz poza rządem i partią. Na własne życzenie",
      lead: "Komentarz podsumowujący odejście minister. Koalicjanci nie kryją ulgi.",
      url: "https://gazetakrakowska.pl/pelczynska-nalecz-na-wlasne-zyczenie/ar/c1p2-29468805",
      portal_name: "Gazeta Krakowska",
      portal_domain: "gazetakrakowska.pl",
      published_at: "2026-10-25T18:02:00Z",
      is_duplicate: true,
      locality: "L",
    },
    {
      id: "art-5",
      title: "Klęska Lewicy w Częstochowie. Prezydent i rada odwołani. Głosowało ponad 51 tysięcy osób!",
      lead: "Oficjalne wyniki referendum. Krzysztof Matyjaszczyk odwołany z urzędu prezydenta.",
      url: "https://dziennikzachodni.pl/kleska-lewicy-w-czestochowie/ar/c1p2-29469483",
      portal_name: "Dziennik Zachodni",
      portal_domain: "dziennikzachodni.pl",
      published_at: "2026-10-26T05:30:00Z",
      is_duplicate: false,
      byline_type: "named",
      author_name: "Bartłomiej Romanek",
      locality: "L",
    },
    {
      id: "art-6",
      title: "Premier Donald Tusk komentuje referendum w Częstochowie: Mogę wyrazić satysfakcję",
      lead: "Tusk: Nikt go nie bronił, mieszkańcy mieli podobną opinię jak CBA i prokuratura.",
      url: "https://dziennikzachodni.pl/premier-tusk-komentuje-referendum/ar/c1p2-29470213",
      portal_name: "Dziennik Zachodni",
      portal_domain: "dziennikzachodni.pl",
      published_at: "2026-10-26T07:15:00Z",
      is_duplicate: true,
      locality: "L",
    },
  ];

  it("poprawnie generuje dynamiczny raport dla Pełczyńskiej-Nałęcz z dowodami", () => {
    const report = generateInvestigationReport({
      articles: sampleArticles,
      topic: "Katarzyna Pełczyńska-Nałęcz",
      expectations: "Zbadaj wydźwięk wobec minister oraz syndykację z i.pl",
      angle: "GOVERNMENT_PROMOTION",
      datasetMode: "live_test",
    });

    assert.equal(report.sourceInfo.status, "EVIDENCE_FOUND");
    assert.equal(report.sourceInfo.matchedArticles, 4);
    assert.match(report.summaryExecutive, /Katarzyny Pełczyńskiej-Nałęcz/);
    assert.match(report.summaryExecutive, /syndykacj/i);
    assert.equal(report.attributionLabels.primary, "Katarzyna Pełczyńska-Nałęcz");
    assert.ok(report.keyMetrics.length >= 4);
    assert.ok(report.headlineCases.length === 4);
  });

  it("poprawnie generuje dynamiczny raport dla referendum w Częstochowie", () => {
    const report = generateInvestigationReport({
      articles: sampleArticles,
      topic: "Referendum w Częstochowie",
      expectations: "Sprawdź odwołanie prezydenta i reakcję premiera",
      angle: "LOCAL_VS_SYNDICATE",
      datasetMode: "live_test",
    });

    assert.equal(report.sourceInfo.status, "EVIDENCE_FOUND");
    assert.equal(report.sourceInfo.matchedArticles, 2);
    assert.match(report.summaryExecutive, /częstochow/i);
    assert.match(report.summaryExecutive, /Matyjaszczyk/);
    assert.equal(report.attributionLabels.primary, "Krzysztof Matyjaszczyk / Lewica");
  });

  it("bezpiecznie zwraca NO_MATCHES przy braku pasujących tematów bez halucynacji", () => {
    const report = generateInvestigationReport({
      articles: sampleArticles,
      topic: "ZupełnieNieistniejącyTematXYZ999",
      expectations: "Brak",
      angle: "DEPOLITICIZATION_SEO",
    });

    assert.equal(report.sourceInfo.status, "NO_MATCHES");
    assert.equal(report.sourceInfo.matchedArticles, 0);
    assert.equal(report.headlineCases.length, 0);
    assert.match(report.summaryExecutive, /Nie znaleziono/);
  });
});
