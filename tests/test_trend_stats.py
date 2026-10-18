import pytest
from datetime import datetime, timezone
from ppgscope.models.article import Article
from ppgscope.models.taxonomy import ClassificationResult
from ppgscope.models.trend import PeriodType, TrendDirection
from ppgscope.stats.significance import TwoProportionZTest, BenjaminiHochberg
from ppgscope.stats.proportions import TrendCalculator


def test_two_proportion_z_test_significant():
    # Period 1: 30 sport articles out of 100 (30%)
    # Period 2: 10 sport articles out of 100 (10%)
    z, p_val, is_sig = TwoProportionZTest.test(x1=30, n1=100, x2=10, n2=100, min_sample_size=10)
    assert z is not None
    assert z > 3.0  # highly significant difference
    assert p_val < 0.01
    assert is_sig is True


def test_two_proportion_z_test_insufficient_sample():
    # Below min sample size (e.g. n=5 < 10)
    z, p_val, is_sig = TwoProportionZTest.test(x1=2, n1=5, x2=1, n2=5, min_sample_size=10)
    assert z is None
    assert p_val is None
    assert is_sig is False


def test_benjamini_hochberg_correction():
    # 5 tests with varied p-values
    p_values = [0.001, 0.008, 0.04, 0.15, 0.80]
    mask = BenjaminiHochberg.adjust(p_values, fdr_q=0.05)
    assert mask[0] is True   # 0.001 is significant
    assert mask[1] is True   # 0.008 is significant
    assert mask[4] is False  # 0.80 is not significant


def test_trend_calculator_dual_profiles():
    calc = TrendCalculator(min_sample_size=2)
    now = datetime(2026, 10, 17, 12, 0, 0, tzinfo=timezone.utc)

    # 4 articles: 2 own, 2 duplicates (syndicated)
    art_own_1 = Article(
        canonical_url="https://gp.pl/1",
        title="Własny sport",
        body="treść sport",
        published_at=now,
        press_title="Gazeta Pomorska",
        domain="pomorska.pl",
        raw_html_hash="h1",
        is_duplicate=False,
    )
    art_own_2 = Article(
        canonical_url="https://gp.pl/2",
        title="Własna polityka",
        body="treść polityka",
        published_at=now,
        press_title="Gazeta Pomorska",
        domain="pomorska.pl",
        raw_html_hash="h2",
        is_duplicate=False,
    )
    art_syndicate = Article(
        canonical_url="https://gp.pl/3",
        title="Przedruk polityka",
        body="treść polityka",
        published_at=now,
        press_title="Gazeta Pomorska",
        domain="pomorska.pl",
        raw_html_hash="h3",
        is_duplicate=True,  # Syndicate!
    )

    classifications = {
        "https://gp.pl/1": ClassificationResult(
            canonical_url="https://gp.pl/1",
            primary_topic="SPORT",
            confidence=0.9,
            model_version="test",
            taxonomy_version="1.0.0",
        ),
        "https://gp.pl/2": ClassificationResult(
            canonical_url="https://gp.pl/2",
            primary_topic="POLITYKA",
            confidence=0.9,
            model_version="test",
            taxonomy_version="1.0.0",
        ),
        "https://gp.pl/3": ClassificationResult(
            canonical_url="https://gp.pl/3",
            primary_topic="POLITYKA",
            confidence=0.9,
            model_version="test",
            taxonomy_version="1.0.0",
        ),
    }

    articles = [art_own_1, art_own_2, art_syndicate]

    # In ALL variant: 2 POLITYKA, 1 SPORT
    dist_all = calc.calculate_topic_distribution(articles, classifications, variant="ALL")
    assert dist_all["POLITYKA"] == 2
    assert dist_all["SPORT"] == 1

    # In OWN variant: 1 POLITYKA, 1 SPORT (syndicate filtered out!)
    dist_own = calc.calculate_topic_distribution(articles, classifications, variant="OWN")
    assert dist_own["POLITYKA"] == 1
    assert dist_own["SPORT"] == 1


def test_ko_sentiment_aggregates_vary_across_periods_and_sum_to_100():
    from scripts.generate_full_scale_aggregates import build_breakdown

    presets = ["24h", "7d", "30d", "90d", "1y", "all"]
    volumes = {"24h": 10800, "7d": 75600, "30d": 324000, "90d": 972000, "1y": 3942000, "all": 10297165}

    pos_pcts = set()
    neg_pcts = set()
    net_scores = set()
    ko_shares = set()
    tusk_pos_pcts = set()

    for p in presets:
        res = build_breakdown(volumes[p], is_hyperlocal=False, is_national=False, preset=p, medium_domain="ALL")
        ko = res["ko_sentiment"]
        b = ko["breakdown"]

        # Mathematical invariants: percentages sum to 100.0% and counts sum to ko_mentions_count
        assert round(b["positive"]["pct"] + b["neutral"]["pct"] + b["negative"]["pct"], 1) == 100.0
        assert b["positive"]["count"] + b["neutral"]["count"] + b["negative"]["count"] == ko["ko_mentions_count"]
        assert ko["net_sentiment_score"] == round(b["positive"]["pct"] - b["negative"]["pct"], 1)

        pos_pcts.add(b["positive"]["pct"])
        neg_pcts.add(b["negative"]["pct"])
        net_scores.add(ko["net_sentiment_score"])
        ko_shares.add(ko["ko_mentions_pct"])
        tusk_pos_pcts.add(ko["top_politicians"][0]["positive_pct"])

        for pol in ko["top_politicians"]:
            assert round(pol["positive_pct"] + pol["neutral_pct"] + pol["negative_pct"], 1) == 100.0

    # Regression check: every single period must yield distinct percentage shares
    assert len(pos_pcts) == len(presets)
    assert len(neg_pcts) == len(presets)
    assert len(net_scores) == len(presets)
    assert len(ko_shares) == len(presets)
    assert len(tusk_pos_pcts) == len(presets)


def test_per_medium_politicians_and_thematic_distributions_vary():
    from scripts.generate_full_scale_aggregates import build_breakdown

    krakow = build_breakdown(2250, is_hyperlocal=False, is_national=False, preset="30d", medium_domain="gazetakrakowska.pl", region="Małopolskie")
    gdansk = build_breakdown(2250, is_hyperlocal=False, is_national=False, preset="30d", medium_domain="dziennikbaltycki.pl", region="Pomorskie")
    biznes = build_breakdown(1350, is_hyperlocal=False, is_national=False, preset="30d", medium_domain="strefabiznesu.pl", region="Ogólnopolski")
    sport = build_breakdown(1350, is_hyperlocal=False, is_national=False, preset="30d", medium_domain="sportowy24.pl", region="Ogólnopolski")

    krakow_pols = {p["name"] for p in krakow["ko_sentiment"]["top_politicians"]}
    gdansk_pols = {p["name"] for p in gdansk["ko_sentiment"]["top_politicians"]}
    biznes_pols = {p["name"] for p in biznes["ko_sentiment"]["top_politicians"]}

    # Regional and thematic politician rosters must differ
    assert "Aleksander Miszalski" in krakow_pols
    assert "Aleksandra Dulkiewicz" in gdansk_pols
    assert "Andrzej Domański" in biznes_pols
    assert krakow_pols != gdansk_pols
    assert krakow_pols != biznes_pols

    # 18-domain thematic profiles must differ substantially across portals
    sport_pct_in_sportowy = next(d["pct"] for d in sport["domains"] if d["slug"] == "sport")
    sport_pct_in_krakow = next(d["pct"] for d in krakow["domains"] if d["slug"] == "sport")
    gosp_pct_in_biznes = next(d["pct"] for d in biznes["domains"] if d["slug"] == "gospodarka")
    gosp_pct_in_krakow = next(d["pct"] for d in krakow["domains"] if d["slug"] == "gospodarka")

    assert sport_pct_in_sportowy > sport_pct_in_krakow + 25.0
    assert gosp_pct_in_biznes > gosp_pct_in_krakow + 15.0

