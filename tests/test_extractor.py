import pytest
from ppgscope.ingest.extractor import HtmlArticleExtractor


SAMPLE_HTML = """<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Mecz Ekstraklasy w Krakowie</title>
  <link rel="canonical" href="https://gazetakrakowska.pl/mecz-ekstraklasy/ar/c2-9988">
  <meta name="description" content="Wielkie emocje na stadionie przy ul. Kałuży w Krakowie.">
  <meta property="article:author" content="Jan Kowalski">
  <meta property="article:published_time" content="2026-10-17T18:00:00+02:00">
  <meta property="article:tag" content="Cracovia">
  <meta property="article:tag" content="Ekstraklasa">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Gazeta Krakowska", "item": "https://gazetakrakowska.pl"},
      {"@type": "ListItem", "position": 2, "name": "Sport", "item": "https://gazetakrakowska.pl/sport"}
    ]
  }
  </script>
</head>
<body>
  <main class="layoutsContainer layoutsContainer--article">
    <header class="atomsArticleHead">
      <h1 class="atomsArticleHead__title">Mecz Ekstraklasy w Krakowie zakończony remisem</h1>
    </header>
    <p>Spotkanie 11. kolejki piłkarskiej Ekstraklasy przyniosło mnóstwo emocji dla kibiców zgromadzonych na trybunach.</p>
    <p>Ostatecznie żadnej z drużyn nie udało się przechylić szali zwycięstwa na swoją stronę i mecz zakończył się bezbramkowym remisem.</p>
  </main>
</body>
</html>
"""


def test_html_article_extractor():
    article = HtmlArticleExtractor.extract(
        html_content=SAMPLE_HTML,
        fallback_url="https://gazetakrakowska.pl/fallback",
        press_title_hint="Gazeta Krakowska",
        region_hint="Małopolskie",
    )

    assert article.canonical_url == "https://gazetakrakowska.pl/mecz-ekstraklasy/ar/c2-9988"
    assert article.title == "Mecz Ekstraklasy w Krakowie zakończony remisem"
    assert article.lead == "Wielkie emocje na stadionie przy ul. Kałuży w Krakowie."
    assert article.author == "Jan Kowalski"
    assert article.section == "Sport"
    assert "Cracovia" in article.tags
    assert "Ekstraklasa" in article.tags
    assert article.press_title == "Gazeta Krakowska"
    assert article.domain == "gazetakrakowska.pl"
    assert article.region == "Małopolskie"
    assert "Spotkanie 11. kolejki" in article.body
    assert len(article.raw_html_hash) == 64
