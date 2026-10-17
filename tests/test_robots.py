import pytest
from ppgscope.ingest.robots import RobotsChecker


SAMPLE_ROBOTS_TXT = """
User-agent: *
Content-Signal: search=yes,ai-train=no
Allow: /
Disallow: /*?ses
Disallow: /ajax/*
Disallow: /cdn-cgi/
Sitemap: https://gazetakrakowska.pl/sitemapa/
Sitemap: https://gazetakrakowska.pl/google_news/

User-agent: GPTBot
Disallow: /
"""


def test_robots_checker_parsing():
    checker = RobotsChecker(SAMPLE_ROBOTS_TXT)
    assert len(checker.sitemaps) == 2
    assert "https://gazetakrakowska.pl/sitemapa/" in checker.sitemaps
    assert "https://gazetakrakowska.pl/google_news/" in checker.sitemaps


def test_robots_checker_allowance():
    checker = RobotsChecker(SAMPLE_ROBOTS_TXT)
    assert checker.is_allowed("https://gazetakrakowska.pl/wiadomosci/krakow") is True
    assert checker.is_allowed("https://gazetakrakowska.pl/google_news/") is True
    assert checker.is_allowed("https://gazetakrakowska.pl/ajax/load") is False
    assert checker.is_allowed("https://gazetakrakowska.pl/cdn-cgi/test") is False
