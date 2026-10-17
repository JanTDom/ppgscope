import pytest
from datetime import datetime, timezone, timedelta
from ppgscope.models.article import Article
from ppgscope.dedup.minhash import TextMinHasher
from ppgscope.dedup.engine import DeduplicationEngine


def test_minhasher_similarity():
    hasher = TextMinHasher(num_perm=128, shingle_size=3)
    text_1 = "Rząd ogłosił nowy pakiet wsparcia dla przedsiębiorców poszkodowanych przez powódź na południu kraju."
    text_2 = "Rząd ogłosił nowy pakiet wsparcia dla przedsiębiorców poszkodowanych przez powódź na południu Polski."
    text_3 = "Legia Warszawa wygrała mecz wyjazdowy w europejskich pucharach po zaciętym spotkaniu."

    sim_1_2 = hasher.calculate_jaccard(text_1, text_2)
    sim_1_3 = hasher.calculate_jaccard(text_1, text_3)

    assert sim_1_2 > 0.65
    assert sim_1_3 < 0.10


def test_deduplication_engine_syndicate_detection():
    engine = DeduplicationEngine(threshold=0.75, num_perm=128)
    
    t0 = datetime(2026, 10, 17, 10, 0, 0, tzinfo=timezone.utc)
    t1 = t0 + timedelta(hours=2)

    shared_body = """
    Ministerstwo Finansów przedstawiło dziś szczegółowe założenia reformy podatkowej, która ma wejść w życie
    od początku przyszłego roku. Kluczową zmianą będzie podniesienie kwoty wolnej od podatku oraz uproszczenie
    rozliczeń dla małych i średnich przedsiębiorstw. Zmiany obejmą również ulgi termomodernizacyjne.
    """

    art_1 = Article(
        canonical_url="https://gazetakrakowska.pl/reforma-podatkowa/ar/c1-111",
        title="Reforma podatkowa od przyszłego roku",
        body=shared_body,
        published_at=t0,
        press_title="Gazeta Krakowska",
        domain="gazetakrakowska.pl",
        raw_html_hash="hash1",
    )

    art_2 = Article(
        canonical_url="https://dziennikbaltycki.pl/reforma-podatkowa/ar/c1-222",
        title="Wielkie zmiany w podatkach. Znamy szczegóły",
        body=shared_body,
        published_at=t1,
        press_title="Dziennik Bałtycki",
        domain="dziennikbaltycki.pl",
        raw_html_hash="hash2",
    )

    processed_1 = engine.process_article(art_1)
    assert processed_1.is_duplicate is False
    assert processed_1.original_article_url == "https://gazetakrakowska.pl/reforma-podatkowa/ar/c1-111"

    processed_2 = engine.process_article(art_2)
    assert processed_2.is_duplicate is True  # TEKST WSPÓLNY
    assert processed_2.original_article_url == "https://gazetakrakowska.pl/reforma-podatkowa/ar/c1-111"
    assert processed_2.duplicate_cluster_id == processed_1.duplicate_cluster_id

    cluster = engine.get_cluster(processed_1.duplicate_cluster_id)
    assert cluster is not None
    assert cluster.duplicate_count == 1
    assert cluster.original_press_title == "Gazeta Krakowska"
    assert len(cluster.member_urls) == 2
