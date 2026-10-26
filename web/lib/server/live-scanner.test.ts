import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseGoogleNewsSitemap,
  parseRssFeed,
  classifyInFlight,
} from "./live-scanner.ts";

describe("LiveScanner: In-Flight Feed & Sitemap Parsing", () => {
  it("poprawnie parsuje format Google News Sitemap i wyciąga realne daty i tytuły", () => {
    const mockSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://gazetakrakowska.pl/wypadek-na-zakopiance/ar/c1-12345</loc>
    <news:news>
      <news:publication>
        <news:name>Gazeta Krakowska</news:name>
        <news:language>pl</news:language>
      </news:publication>
      <news:publication_date>2026-10-26T12:30:00+01:00</news:publication_date>
      <news:title>Groźny wypadek na Zakopiance: zderzenie trzech aut, lądował śmigłowiec LPR</news:title>
    </news:news>
  </url>
  <url>
    <loc>https://gazetakrakowska.pl/premier-tusk-w-krakowie/ar/c1-12346</loc>
    <news:news>
      <news:publication_date>2026-10-26T10:15:00+01:00</news:publication_date>
      <news:title>Premier Donald Tusk spotkał się z władzami Krakowa w sprawie inwestycji</news:title>
    </news:news>
  </url>
</urlset>`;

    const parsed = parseGoogleNewsSitemap(mockSitemapXml, "gazetakrakowska.pl", "Małopolskie");
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].portal_domain, "gazetakrakowska.pl");
    assert.equal(parsed[0].domain, "zdarzenia");
    assert.equal(parsed[0].locality, "L");
    assert.match(parsed[0].title, /Zakopiance/);

    assert.equal(parsed[1].domain, "wladza");
    assert.equal(parsed[1].locality, "L"); // ma wzmiankę Krakowa
  });

  it("poprawnie parsuje kanał RSS z CDATA i wyznacza dziedziny", () => {
    const mockRssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Dziennik Bałtycki</title>
    <item>
      <title><![CDATA[Mecz Ekstraklasy: Lechia Gdańsk wygrywa w derbach Trójmiasta!]]></title>
      <link>https://dziennikbaltycki.pl/sport/lechia-wygrana/ar/c2-987</link>
      <description><![CDATA[Niezwykłe emocje na stadionie w Gdańsku, padły trzy bramki.]]></description>
      <pubDate>Mon, 26 Oct 2026 13:00:00 +0100</pubDate>
    </item>
    <item>
      <title>Inflacja i stopy procentowe: NBP publikuje nowe prognozy dla gospodarki</title>
      <link>https://dziennikbaltycki.pl/gospodarka/inflacja-nbp/ar/c3-988</link>
      <description>Eksperci oceniają wpływ decyzji RPP na portfele Polaków.</description>
      <pubDate>Mon, 26 Oct 2026 11:00:00 +0100</pubDate>
    </item>
  </channel>
</rss>`;

    const parsed = parseRssFeed(mockRssXml, "dziennikbaltycki.pl", "Pomorskie");
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].domain, "sport");
    assert.equal(parsed[0].locality, "L");

    assert.equal(parsed[1].domain, "gospodarka");
    assert.equal(parsed[1].locality, "C");
  });

  it("klasyfikuje poprawnie tematy lokalne i centralne", () => {
    const locRes = classifyInFlight("Remont ulicy w centrum Poznania", "Mieszkańcy muszą liczyć się z objazdami.");
    assert.equal(locRes.locality, "L");
    assert.equal(locRes.domain, "infrastruktura");

    const natRes = classifyInFlight("Rząd i Sejm przyjęły nowelizację ustawy budżetowej w Polsce", "Krajowe wskaźniki makro.");
    assert.equal(natRes.locality, "C");
    assert.equal(natRes.domain, "wladza");
  });
});
