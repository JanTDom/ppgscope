import pytest
from ppgscope.ingest.sitemap import SitemapParser
from ppgscope.ingest.rss import RssParser


SAMPLE_GOOGLE_NEWS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://gazetakrakowska.pl/mecz-cracovia-legia/ar/c2-12345</loc>
    <news:news>
      <news:publication>
        <news:name>Gazeta Krakowska</news:name>
        <news:language>pl</news:language>
      </news:publication>
      <news:publication_date>2026-10-17T15:47:22+02:00</news:publication_date>
      <news:title>Legia Warszawa gra z Cracovią</news:title>
    </news:news>
  </url>
  <url>
    <loc>https://gazetakrakowska.pl/inwestycje-krakow/ar/c1-67890</loc>
    <news:news>
      <news:publication>
        <news:name>Gazeta Krakowska</news:name>
        <news:language>pl</news:language>
      </news:publication>
      <news:publication_date>2026-10-17T16:00:00+02:00</news:publication_date>
      <news:title>Nowy tramwaj na Mistrzejowice</news:title>
    </news:news>
  </url>
</urlset>
"""

SAMPLE_RSS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Dziennik Bałtycki</title>
    <link>https://dziennikbaltycki.pl/</link>
    <description>Najświeższe wiadomości z Pomorza</description>
    <item>
      <title>Nowe inwestycje w Porcie Gdańsk</title>
      <link>https://dziennikbaltycki.pl/port-gdansk/ar/c3-11223</link>
      <description>Rozbudowa terminala kontenerowego Baltic Hub.</description>
      <pubDate>Sat, 17 Oct 2026 14:00:00 +0200</pubDate>
      <guid>https://dziennikbaltycki.pl/port-gdansk/ar/c3-11223</guid>
      <category>Gospodarka</category>
    </item>
  </channel>
</rss>
"""


def test_parse_google_news_sitemap():
    items = SitemapParser.parse_google_news(SAMPLE_GOOGLE_NEWS_XML)
    assert len(items) == 2
    assert items[0].loc == "https://gazetakrakowska.pl/mecz-cracovia-legia/ar/c2-12345"
    assert items[0].publication_name == "Gazeta Krakowska"
    assert items[0].title == "Legia Warszawa gra z Cracovią"
    assert items[0].publication_date == "2026-10-17T15:47:22+02:00"
    assert items[1].loc == "https://gazetakrakowska.pl/inwestycje-krakow/ar/c1-67890"


def test_parse_rss_feed():
    channel = RssParser.parse(SAMPLE_RSS_XML)
    assert channel.title == "Dziennik Bałtycki"
    assert len(channel.items) == 1
    assert channel.items[0].title == "Nowe inwestycje w Porcie Gdańsk"
    assert channel.items[0].link == "https://dziennikbaltycki.pl/port-gdansk/ar/c3-11223"
    assert channel.items[0].category == "Gospodarka"
