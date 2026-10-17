import pytest
from datetime import datetime, timezone
from ppgscope.models.article import Article
from ppgscope.classifier.taxonomy import TaxonomyManager
from ppgscope.classifier.rule_classifier import RuleBasedTopicClassifier
from ppgscope.classifier.benchmark import ClassifierBenchmark, BenchmarkItem


def test_taxonomy_manager_has_domains_and_mandatory_fallback():
    mgr = TaxonomyManager()
    assert "INNE/NIEOKREŚLONE" in mgr.topics
    assert mgr.get_domain("wladza") is not None
    assert mgr.get_domain("zdarzenia") is not None
    assert mgr.get_domain("swiat") is not None
    assert len(mgr.list_domain_slugs()) == 18


# --------------------------------------------------------------------------
# Acceptance Criteria: 8 Mandatory Unit Tests from User Specification
# --------------------------------------------------------------------------

def test_acceptance_case_1_pozar_tarnow():
    """1. „Pożar hurtowni w Tarnowie” w „Gazecie Krakowskiej” -> zdarzenia / L"""
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)
    art = Article(
        canonical_url="https://gazetakrakowska.pl/pozar-tarnow/1",
        title="Pożar hurtowni w Tarnowie",
        body="Treść artykułu.",
        lead="Strażacy walczą z ogniem w magazynie.",
        published_at=datetime.now(timezone.utc),
        press_title="Gazeta Krakowska",
        domain="gazetakrakowska.pl",
        raw_html_hash="h1",
    )
    result = classifier.classify(art)
    assert result.domain == "zdarzenia"
    assert result.locality == "L"
    assert result.other_region is False


def test_acceptance_case_2_koniec_wibor():
    """2. „Koniec WIBOR coraz bliżej” -> gospodarka / C"""
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)
    art = Article(
        canonical_url="https://pomorska.pl/wibor/2",
        title="Koniec WIBOR coraz bliżej",
        body="Treść artykułu.",
        lead="Rząd i banki pracują nad nowym wskaźnikiem referencyjnym.",
        published_at=datetime.now(timezone.utc),
        press_title="Gazeta Pomorska",
        domain="pomorska.pl",
        raw_html_hash="h2",
    )
    result = classifier.classify(art)
    assert result.domain == "gospodarka"
    assert result.locality == "C"
    assert result.other_region is False


def test_acceptance_case_3_najwyzsza_emerytura_podium():
    """3. „Najwyższa emerytura w Polsce. Seniorka z regionu na podium” w „Gazecie Pomorskiej” -> gospodarka / CL"""
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)
    art = Article(
        canonical_url="https://pomorska.pl/emerytury/3",
        title="Najwyższa emerytura w Polsce. Seniorka z regionu na podium",
        body="Treść artykułu.",
        lead="ZUS opublikował dane o rekordowych świadczeniach w kraju.",
        published_at=datetime.now(timezone.utc),
        press_title="Gazeta Pomorska",
        domain="pomorska.pl",
        raw_html_hash="h3",
    )
    result = classifier.classify(art)
    assert result.domain == "gospodarka"
    assert result.locality == "CL"
    assert result.other_region is False


def test_acceptance_case_4_emerytura_ze_slaska():
    """4. „Najwyższą emeryturę dostaje senior ze Śląska” w „Gazecie Pomorskiej” -> gospodarka / C, other_region = true"""
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)
    art = Article(
        canonical_url="https://pomorska.pl/emerytury/4",
        title="Najwyższą emeryturę dostaje senior ze Śląska",
        body="Treść artykułu.",
        lead="Rekordzista z Katowic otrzymuje co miesiąc gigantyczną kwotę z ZUS.",
        published_at=datetime.now(timezone.utc),
        press_title="Gazeta Pomorska",
        domain="pomorska.pl",
        raw_html_hash="h4",
    )
    result = classifier.classify(art)
    assert result.domain == "gospodarka"
    assert result.locality == "C"
    assert result.other_region is True


def test_acceptance_case_5_szpital_grudziadz():
    """5. „Szpital w Grudziądzu nie wypłacił pensji medykom” w „Gazecie Pomorskiej” -> zdrowie (poboczna gospodarka) / L"""
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)
    art = Article(
        canonical_url="https://pomorska.pl/szpital/5",
        title="Szpital w Grudziądzu nie wypłacił pensji medykom",
        body="Treść artykułu.",
        lead="Lekarze i pielęgniarki domagają się zaległych wynagrodzeń od dyrekcji.",
        published_at=datetime.now(timezone.utc),
        press_title="Gazeta Pomorska",
        domain="pomorska.pl",
        raw_html_hash="h5",
    )
    result = classifier.classify(art)
    assert result.domain == "zdarzenia" or result.domain == "zdrowie"
    assert result.domain == "zdrowie"
    assert result.domain_secondary == "gospodarka"
    assert result.locality == "L"
    assert result.other_region is False


def test_acceptance_case_6_papiez_putin():
    """6. „Papież Leon XIV rozmawiał z Putinem” -> swiat / C"""
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)
    art = Article(
        canonical_url="https://i.pl/swiat/6",
        title="Papież Leon XIV rozmawiał z Putinem",
        body="Treść artykułu.",
        lead="Watykan poinformował o przebiegu rozmowy dyplomatycznej na temat pokoju.",
        published_at=datetime.now(timezone.utc),
        press_title="i.pl",
        domain="i.pl",
        raw_html_hash="h6",
    )
    result = classifier.classify(art)
    assert result.domain == "swiat"
    assert result.locality == "C"
    assert result.other_region is False


def test_acceptance_case_7_ustawa_social_media():
    """7. „Ustawa ograniczy dostęp do social mediów” bez lokalnego wątku -> wladza / C"""
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)
    art = Article(
        canonical_url="https://gazetawroclawska.pl/polityka/7",
        title="Ustawa ograniczy dostęp do social mediów",
        body="Treść artykułu.",
        lead="Rząd przyjął projekt regulacji prawnych dla platform cyfrowych.",
        published_at=datetime.now(timezone.utc),
        press_title="Gazeta Wrocławska",
        domain="gazetawroclawska.pl",
        raw_html_hash="h7",
    )
    result = classifier.classify(art)
    assert result.domain == "wladza"
    assert result.locality == "C"
    assert result.other_region is False


def test_acceptance_case_8_remis_widzew_wisla():
    """8. „Remis z Widzewem. Oceniamy piłkarzy Wisły” w „Gazecie Krakowskiej” -> sport / L"""
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)
    art = Article(
        canonical_url="https://gazetakrakowska.pl/sport/8",
        title="Remis z Widzewem. Oceniamy piłkarzy Wisły",
        body="Treść artykułu.",
        lead="Biała Gwiazda podzieliła się punktami w wyjazdowym starciu ligowym.",
        published_at=datetime.now(timezone.utc),
        press_title="Gazeta Krakowska",
        domain="gazetakrakowska.pl",
        raw_html_hash="h8",
    )
    result = classifier.classify(art)
    assert result.domain == "sport"
    assert result.locality == "L"
    assert result.other_region is False


def test_classifier_benchmark_evaluation():
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)

    now = datetime.now(timezone.utc)
    gold_standard = [
        BenchmarkItem(
            article=Article(
                canonical_url="https://pomorska.pl/art1",
                title="Wybory parlamentarne i głosowanie w sejmie",
                body="Posłowie i rząd debatują nad nową ustawą.",
                section="Polityka",
                published_at=now,
                press_title="Gazeta Pomorska",
                domain="pomorska.pl",
                raw_html_hash="h1",
            ),
            expected_primary_topic="POLITYKA",
        ),
        BenchmarkItem(
            article=Article(
                canonical_url="https://pomorska.pl/art2",
                title="Mecz ligowy i bramka w doliczonym czasie gry",
                body="Sportowcy i piłkarze rozegrali fantastyczny mecz.",
                section="Sport",
                published_at=now,
                press_title="Gazeta Pomorska",
                domain="pomorska.pl",
                raw_html_hash="h2",
            ),
            expected_primary_topic="SPORT",
        ),
        BenchmarkItem(
            article=Article(
                canonical_url="https://pomorska.pl/art3",
                title="Inflacja i stopy procentowe w NBP",
                body="Gospodarka zwalnia, podatki i budżet pod presją przedsiębiorców.",
                section="Biznes",
                published_at=now,
                press_title="Gazeta Pomorska",
                domain="pomorska.pl",
                raw_html_hash="h3",
            ),
            expected_primary_topic="GOSPODARKA",
        ),
    ]

    report = ClassifierBenchmark.evaluate(classifier, gold_standard)
    assert report.total_evaluated == 3
    assert report.overall_accuracy == 1.0
