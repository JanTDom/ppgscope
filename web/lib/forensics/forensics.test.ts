import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectBlindspots, DEFAULT_BLINDSPOT_OPTIONS, type PpgIndexedItem } from "./blindspot.ts";
import { parseFeed, type FeedItem } from "./feed.ts";
import { analyzeNewsroom } from "./newsroom.ts";
import { buildGoogleNewsQuery, cleanGoogleNewsItem, limitToVerified } from "./coverage.ts";
import {
  analyzeStreamRotation,
  analyzeStreamPaywall,
  analyzeStreamLinks,
} from "./streams.ts";
import { compareWithVerification, MAX_VERIFIED_PER_COMPETITOR } from "./run.ts";
import type { FeedFetchResult } from "./feed.ts";
import type { CompetitorFeedSource } from "./sources.ts";
import { contentKeys, containment, shingles } from "./text.ts";
import { detectVerbatim } from "./verbatim.ts";

const NOW = Date.parse("2026-10-18T20:00:00.000Z");

function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60_000).toISOString();
}

function item(partial: Partial<FeedItem> & { title: string }): FeedItem {
  return { link: `https://example.test/${encodeURIComponent(partial.title)}`, publishedAt: null, author: null, summary: "", ...partial };
}

const PPG_XML = `<?xml version="1.0"?><rss><channel>
<item>
  <title><![CDATA[Kardynał Ryś na meczu Cracovii]]></title>
  <link>https://gazetakrakowska.pl/a/ar/c2-1</link>
  <author><![CDATA[jan.kowalski@polskapress.pl (Jan Kowalski)]]></author>
  <description><![CDATA[Komplet ponad 14 tys. widz&amp;oacute;w śledził z trybun mecz.]]></description>
  <pubDate>Sun, 18 Oct 2026 10:31:00 +0200</pubDate>
</item>
<item><title>Bez linku</title></item>
</channel></rss>`;

const TWO_DATES_XML = `<rss><channel><item>
  <title>Awaria tramwajów</title><link>https://lovekrakow.pl/x</link>
  <pubDate>Sun, 18 Oct 26 18:00:01 +0200</pubDate>
  <pubDate>Sun, 18 Oct 2026 18:00:01 +0200</pubDate>
</item></channel></rss>`;

const ATOM_XML = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
  <title>Nowy temat w mieście</title>
  <link rel="alternate" href="https://example.test/atom-entry" />
  <published>2026-10-18T18:30:00+02:00</published>
  <author><name>Anna Nowak</name></author>
  <summary><![CDATA[Opis wiadomości z kanału Atom.]]></summary>
</entry></feed>`;

describe("parseFeed", () => {
  it("rozpakowuje CDATA, dekoduje podwójnie zakodowane encje i pomija element bez linku", () => {
    const items = parseFeed(PPG_XML);
    assert.equal(items.length, 1);
    assert.equal(items[0].title, "Kardynał Ryś na meczu Cracovii");
    assert.equal(items[0].summary, "Komplet ponad 14 tys. widzów śledził z trybun mecz.");
    assert.equal(items[0].publishedAt, "2026-10-18T08:31:00.000Z");
  });

  it("zwraca samo imię i nazwisko autora, bez adresu e-mail", () => {
    const [first] = parseFeed(PPG_XML);
    assert.equal(first.author, "Jan Kowalski");
    assert.ok(!JSON.stringify(first).includes("@"));
  });

  it("ignoruje datę z dwucyfrowym rokiem i bierze poprawną", () => {
    const [first] = parseFeed(TWO_DATES_XML);
    assert.equal(first.publishedAt, "2026-10-18T16:00:01.000Z");
  });

  it("zwraca pustą listę dla pustego wejścia", () => {
    assert.deepEqual(parseFeed(""), []);
  });

  it("obsługuje publiczny kanał Atom z linkiem href i autorem w elemencie name", () => {
    const [first] = parseFeed(ATOM_XML);
    assert.equal(first.title, "Nowy temat w mieście");
    assert.equal(first.link, "https://example.test/atom-entry");
    assert.equal(first.author, "Anna Nowak");
    assert.equal(first.summary, "Opis wiadomości z kanału Atom.");
    assert.equal(first.publishedAt, "2026-10-18T16:30:00.000Z");
  });
});

describe("text", () => {
  it("daje te same klucze dla różnych odmian słowa", () => {
    assert.deepEqual([...contentKeys("w Krakowie")], [...contentKeys("z Krakowa")]);
  });

  it("containment liczy udział fraz leadu w tekście źródłowym", () => {
    const lead = shingles("policjanci zatrzymali mężczyznę podejrzanego o kradzież roweru", 4);
    const official = shingles("wczoraj policjanci zatrzymali mężczyznę podejrzanego o kradzież roweru na osiedlu", 4);
    assert.ok(containment(lead, official) > 0.99);
  });
});

describe("detectBlindspots", () => {
  const ppg: PpgIndexedItem[] = [
    { portalId: "gk", portalName: "Gazeta Krakowska", item: item({ title: "Awaria tramwajów na rondzie Mogilskim w Krakowie", publishedAt: minutesAgo(40) }) },
    { portalId: "gk", portalName: "Gazeta Krakowska", item: item({ title: "Mecz Cracovii z Legią", publishedAt: minutesAgo(300) }) },
  ];
  const options = { nowMs: NOW, ...DEFAULT_BLINDSPOT_OPTIONS };

  it("oznacza temat pokryty i liczy opóźnienie PPG w minutach", () => {
    const rows = detectBlindspots(
      [item({ title: "Awaria tramwajów na Rondzie Mogilskim w Krakowie", publishedAt: minutesAgo(75) })],
      ppg,
      options,
    );
    assert.equal(rows[0].status, "POKRYTE");
    assert.equal(rows[0].match?.lagMinutes, 35);
  });

  it("oznacza brak w PPG, gdy próbka PPG obejmuje czas publikacji konkurenta", () => {
    const rows = detectBlindspots(
      [item({ title: "Pożar hali magazynowej w Skawinie, strażacy walczą z ogniem", publishedAt: minutesAgo(120) })],
      ppg,
      options,
    );
    assert.equal(rows[0].status, "BRAK_W_PPG");
  });

  it("nie zarzuca przeoczenia, gdy tekst jest starszy niż próbka PPG", () => {
    const rows = detectBlindspots(
      [item({ title: "Wypadek na obwodnicy, kierowcy stoją w korku", publishedAt: minutesAgo(600) })],
      ppg,
      options,
    );
    assert.equal(rows[0].status, "NIEROZSTRZYGALNE");
  });

  it("nie zarzuca przeoczenia świeżemu tekstowi", () => {
    const rows = detectBlindspots(
      [item({ title: "Protest rolników blokuje drogę krajową pod Wieliczką", publishedAt: minutesAgo(10) })],
      ppg,
      options,
    );
    assert.equal(rows[0].status, "NIEROZSTRZYGALNE");
  });

  it("nie zarzuca przeoczenia przy zbyt ogólnym nagłówku", () => {
    const rows = detectBlindspots([item({ title: "6:1 na stadionie w Poznaniu", publishedAt: minutesAgo(120) })], ppg, options);
    assert.equal(rows[0].status, "NIEROZSTRZYGALNE");
    assert.equal(rows[0].undecidedReason, "Nagłówek zbyt ogólny do wiarygodnego porównania");
  });

  it("pomija teksty starsze niż okno i bez daty", () => {
    const rows = detectBlindspots(
      [item({ title: "Stary tekst sprzed dwóch dni", publishedAt: minutesAgo(60 * 48) }), item({ title: "Tekst bez daty" })],
      ppg,
      options,
    );
    assert.equal(rows.length, 0);
  });
});

describe("detectVerbatim", () => {
  const official = [
    {
      institutionName: "Policja Małopolska",
      item: item({
        title: "Zatrzymanie sprawcy kradzieży",
        summary: "Policjanci zatrzymali mężczyznę podejrzanego o kradzież roweru wartego dwa tysiące złotych na terenie osiedla",
      }),
    },
  ];

  it("wykrywa lead przepisany z komunikatu", () => {
    const report = detectVerbatim(
      [
        {
          portalName: "Gazeta Krakowska",
          item: item({
            title: "Złodziej roweru zatrzymany",
            author: "Jan Kowalski",
            summary: "Policjanci zatrzymali mężczyznę podejrzanego o kradzież roweru wartego dwa tysiące złotych na terenie osiedla",
          }),
        },
      ],
      official,
    );
    assert.equal(report.rows[0].level, "PRZEPISANY_KOMUNIKAT");
    assert.ok(report.rows[0].verbatimPct >= 60);
  });

  it("nie oznacza własnego tekstu i pomija zbyt krótkie leady", () => {
    const report = detectVerbatim(
      [
        { portalName: "Gazeta Krakowska", item: item({ title: "A", summary: "Mieszkańcy osiedla od tygodni skarżą się na hałas z budowy, a urząd obiecuje kontrolę jeszcze w tym miesiącu" }) },
        { portalName: "Gazeta Krakowska", item: item({ title: "B", summary: "Krótki lead" }) },
      ],
      official,
    );
    assert.equal(report.rows.length, 0);
    assert.equal(report.checkedLeads, 1);
    assert.equal(report.skippedShortLeads, 1);
  });
});

describe("analyzeNewsroom", () => {
  const at = (minutes: number, author: string | null, summary = "lead") =>
    ({ portalName: "Gazeta Krakowska", item: item({ title: `t${minutes}${author}`, author, summary, publishedAt: minutesAgo(minutes) }) });

  it("liczy serię tekstów jednego autora w oknie czasowym", () => {
    const report = analyzeNewsroom([at(10, "Jan Kowalski"), at(40, "Jan Kowalski"), at(70, "Jan Kowalski"), at(600, "Jan Kowalski")]);
    assert.equal(report.authors[0].maxBurstInWindow, 3);
  });

  it("oddziela podpisanych od bezimiennych i nie podaje top 3 przy małej próbce", () => {
    const report = analyzeNewsroom([at(5, "Jan Kowalski"), at(6, "Redakcja"), at(7, null)]);
    assert.equal(report.namedCount, 1);
    assert.equal(report.unnamedCount, 2);
    assert.equal(report.top3SharePct, null);
    assert.equal(report.top3Reliable, false);
  });

  it("podaje udział top 3, gdy próbka jest wystarczająca", () => {
    const inputs = [
      ...Array.from({ length: 8 }, (_, i) => at(100 + i * 200, "Anna Nowak")),
      ...Array.from({ length: 6 }, (_, i) => at(150 + i * 200, "Jan Kowalski")),
      ...Array.from({ length: 4 }, (_, i) => at(170 + i * 200, "Ewa Lis")),
      ...Array.from({ length: 2 }, (_, i) => at(190 + i * 200, "Piotr Wąs")),
    ];
    const report = analyzeNewsroom(inputs);
    assert.equal(report.top3Reliable, true);
    assert.equal(report.top3SharePct, 90);
  });

  it("porównuje minuty publikacji z losowym punktem odniesienia", () => {
    const report = analyzeNewsroom([
      { portalName: "X", item: item({ title: "a", publishedAt: "2026-10-18T08:00:00.000Z" }) },
      { portalName: "X", item: item({ title: "b", publishedAt: "2026-10-18T08:17:00.000Z" }) },
    ]);
    assert.equal(report.cronMinutePct, 50);
    assert.equal(report.cronBaselinePct, 6.7);
  });
});

describe("analyzeNewsroom: podpisy opracowań", () => {
  it("nie wlicza podpisów 'opr.' do autorów podpisanych", () => {
    const entry = (minutes: number, author: string) => ({ portalName: "X", item: item({ title: `t${minutes}`, author, publishedAt: minutesAgo(minutes) }) });
    const report = analyzeNewsroom([entry(5, "opr. Magda Smoleń"), entry(10, "opr. Magda Smoleń"), entry(15, "Jan Kowalski")]);
    assert.equal(report.adaptationCount, 2);
    assert.equal(report.namedCount, 1);
    assert.equal(report.authors.find((a) => a.author.startsWith("opr."))?.adaptation, true);
  });
});

describe("coverage", () => {
  it("buduje zapytanie z najdłuższych słów i ogranicza je do domeny", () => {
    const query = buildGoogleNewsQuery("Ktoś w wielkopolskim mieście dokarmia szczury", "gloswielkopolski.pl");
    assert.ok(query.startsWith("site:gloswielkopolski.pl ("));
    assert.ok(query.includes("wielkopolskim"));
    assert.ok(query.includes(" OR "));
    assert.ok(query.endsWith("when:2d"));
  });

  it("usuwa nazwę serwisu z tytułu Google News", () => {
    const cleaned = cleanGoogleNewsItem(item({ title: "Kardynał Ryś na meczu - Gazeta Krakowska", summary: "<a>x</a>" }));
    assert.equal(cleaned.title, "Kardynał Ryś na meczu");
  });

  it("zamienia niesprawdzone braki na NIEROZSTRZYGALNE", () => {
    const row = { title: "t", link: "l1", publishedAt: minutesAgo(90), ageMinutes: 90, status: "BRAK_W_PPG" as const, match: null, undecidedReason: null };
    const out = limitToVerified([row, { ...row, link: "l2" }], new Set(["l1"]));
    assert.equal(out[0].status, "BRAK_W_PPG");
    assert.equal(out[1].status, "NIEROZSTRZYGALNE");
  });
});

describe("compareWithVerification", () => {
  const competitor: CompetitorFeedSource = { id: "c", name: "Konkurent", url: "https://c.test/rss", region: "R", ppgIds: ["gazetakrakowska"] };
  const feed = (items: ReturnType<typeof item>[]): FeedFetchResult => ({ sourceId: "c", sourceName: "Konkurent", url: "https://c.test/rss", ok: true, httpStatus: 200, latencyMs: 1, items, error: null });
  const ppg: PpgIndexedItem[] = [
    { portalId: "gazetakrakowska", portalName: "Gazeta Krakowska", item: item({ title: "Zupełnie inny temat o budżecie", publishedAt: minutesAgo(600) }) },
  ];
  const story = item({ title: "Pożar hali magazynowej w Skawinie, strażacy walczą z ogniem", publishedAt: minutesAgo(120) });

  it("uznaje temat za pokryty, gdy drugie źródło go znajdzie", async () => {
    const result = await compareWithVerification(competitor, feed([story]), ppg, NOW, async () => [
      item({ title: "Pożar hali magazynowej w Skawinie. Strażacy walczą z ogniem", publishedAt: minutesAgo(100) }),
    ]);
    assert.equal(result.rows[0].status, "POKRYTE");
    assert.equal(result.counts.POKRYTE, 1);
  });

  it("zostawia BRAK_W_PPG, gdy żadne źródło nie ma tematu", async () => {
    const result = await compareWithVerification(competitor, feed([story]), ppg, NOW, async () => []);
    assert.equal(result.rows[0].status, "BRAK_W_PPG");
  });

  it("nie zarzuca niczego ponad limit weryfikacji", async () => {
    const many = Array.from({ length: MAX_VERIFIED_PER_COMPETITOR + 3 }, (_, i) =>
      item({ title: `Wydarzenie numer${i} Skawina strażacy akcja${i} kolizja${i}`, publishedAt: minutesAgo(60 + i) }),
    );
    const result = await compareWithVerification(competitor, feed(many), ppg, NOW, async () => []);
    assert.equal(result.counts.BRAK_W_PPG, MAX_VERIFIED_PER_COMPETITOR);
    assert.equal(result.counts.NIEROZSTRZYGALNE, 3);
  });

  it("zwraca pusty wynik, gdy kanał konkurenta nie działa", async () => {
    const failed: FeedFetchResult = { ...feed([]), ok: false, httpStatus: 0, error: "timeout" };
    const result = await compareWithVerification(competitor, failed, ppg, NOW, async () => []);
    assert.equal(result.feedOk, false);
    assert.equal(result.rows.length, 0);
  });
});

describe("analyzeStreamRotation", () => {
  const ppgSources = [
    { id: "gk", name: "Gazeta Krakowska", url: "https://gk.test/rss", region: "Małopolskie" },
    { id: "gw", name: "Gazeta Wrocławska", url: "https://gw.test/rss", region: "Dolnośląskie" },
  ];
  const competitors = [
    { id: "lk", name: "LoveKraków", url: "https://lk.test/rss", region: "Małopolskie", ppgIds: ["gk"] },
  ];

  it("wylicza status AKTYWNA_ROTACJA, medianę przerw i porównuje z konkurentem", () => {
    const ppgResults: FeedFetchResult[] = [
      {
        sourceId: "gk",
        sourceName: "Gazeta Krakowska",
        url: "https://gk.test/rss",
        ok: true,
        httpStatus: 200,
        latencyMs: 50,
        error: null,
        items: [
          item({ title: "Świeży news", publishedAt: minutesAgo(30) }),
          item({ title: "Wcześniejszy news", publishedAt: minutesAgo(90) }),
          item({ title: "Poranny news", publishedAt: minutesAgo(150) }),
        ],
      },
      {
        sourceId: "gw",
        sourceName: "Gazeta Wrocławska",
        url: "https://gw.test/rss",
        ok: true,
        httpStatus: 200,
        latencyMs: 40,
        error: null,
        items: [
          item({ title: "Stary news", publishedAt: minutesAgo(400) }),
        ],
      },
    ];

    const competitorResults: FeedFetchResult[] = [
      {
        sourceId: "lk",
        sourceName: "LoveKraków",
        url: "https://lk.test/rss",
        ok: true,
        httpStatus: 200,
        latencyMs: 60,
        error: null,
        items: [
          item({ title: "Konkurent news", publishedAt: minutesAgo(60) }),
        ],
      },
    ];

    const report = analyzeStreamRotation(ppgResults, competitorResults, ppgSources, competitors, NOW);

    assert.equal(report.sampleSize, 4);
    assert.equal(report.activeFeedsCount, 1);
    assert.equal(report.staleFeedsCount, 1);

    const gkMetric = report.sources.find((s) => s.sourceId === "gk");
    assert.ok(gkMetric);
    assert.equal(gkMetric.status, "AKTYWNA_ROTACJA");
    assert.equal(gkMetric.ageMinutes, 30);
    assert.equal(gkMetric.medianIntervalMinutes, 60);

    const gwMetric = report.sources.find((s) => s.sourceId === "gw");
    assert.ok(gwMetric);
    assert.equal(gwMetric.status, "ZASTYGLA_CZOLOWKA");
    assert.equal(gwMetric.ageMinutes, 400);

    const regional = report.regionalComparisons[0];
    assert.ok(regional);
    assert.equal(regional.region, "Małopolskie");
    assert.equal(regional.fasterMedium, "PPG");
    assert.equal(regional.freshnessGapMinutes, 30); // konkurent 60 min temu, PPG 30 min temu
  });
});

describe("analyzeStreamPaywall", () => {
  it("wykrywa artykuły ze ścieżką /ar/c1- oraz oznaczeniem [PLUS]", () => {
    const items = [
      {
        portalName: "Gazeta Krakowska",
        item: {
          title: "[PLUS] Kulisy głośnego śledztwa w magistracie",
          link: "https://gazetakrakowska.pl/kulisy/ar/c1-12345",
          publishedAt: minutesAgo(60),
          author: "Jan Kowalski",
          summary: "Pełny zwiastun artykułu dla subskrybentów o szczegółach postępowania prokuratury.",
        },
      },
      {
        portalName: "Gazeta Krakowska",
        item: {
          title: "Zwykły artykuł otwarty",
          link: "https://gazetakrakowska.pl/zwykly/ar/c3-99999",
          publishedAt: minutesAgo(30),
          author: "Anna Nowak",
          summary: "Zwykły lead.",
        },
      },
    ];

    const report = analyzeStreamPaywall(items);
    assert.equal(report.checkedCount, 2);
    assert.equal(report.paywallCount, 1);
    assert.equal(report.paywallSharePct, 50);
    assert.equal(report.items[0].title, "[PLUS] Kulisy głośnego śledztwa w magistracie");
    assert.ok(report.items[0].indicators.length >= 2);
  });
});

describe("analyzeStreamLinks", () => {
  it("wykrywa linki zewnętrzne, materiały sponsorowane i agencje prasowe", () => {
    const items = [
      {
        portalName: "Dziennik Bałtycki",
        item: {
          title: "Materiał partnera: Nowe rozwiązania dla przemysłu morskiego",
          link: "https://dziennikbaltycki.pl/artykul/ar/c3-1",
          publishedAt: minutesAgo(50),
          author: "Redakcja",
          summary: "Zapraszamy do odwiedzenia portalu partnera.",
          rawSummary: 'Zapraszamy do odwiedzenia portalu <a href="https://zewnetrzny-sklep.pl/oferta">sklep</a>.',
        },
      },
      {
        portalName: "Gazeta Krakowska",
        item: {
          title: "Wypadek na autostradzie A4",
          link: "https://gazetakrakowska.pl/wypadek/ar/c3-2",
          publishedAt: minutesAgo(20),
          author: "PAP",
          summary: "Utrudnienia potrwają do wieczora. (PAP)",
        },
      },
    ];

    const report = analyzeStreamLinks(items);
    assert.equal(report.checkedCount, 2);
    assert.equal(report.externalLinksCount, 1);
    assert.equal(report.sponsoredCount, 1);
    assert.equal(report.agencyCount, 1);
    assert.equal(report.items.length, 3);
  });
});
