import pytest
from datetime import datetime, timezone
from ppgscope.models.article import Article
from ppgscope.classifier.taxonomy import TaxonomyManager
from ppgscope.classifier.rule_classifier import RuleBasedTopicClassifier
from ppgscope.classifier.benchmark import ClassifierBenchmark, BenchmarkItem


def test_taxonomy_manager_has_mandatory_fallback():
    mgr = TaxonomyManager()
    assert "INNE/NIEOKREŚLONE" in mgr.topics
    assert mgr.get_topic("POLITYKA") is not None
    assert mgr.get_topic("SPORT") is not None


def test_classifier_sport_article():
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)

    art = Article(
        canonical_url="https://gazetakrakowska.pl/sport-mecz/123",
        title="Cracovia gra z Legią w Ekstraklasie o mistrzostwo",
        lead="Trener ogłosił skład na sobotni mecz piłki nożnej.",
        body="Mecz piłkarski na stadionie przy ul. Kałuży zapowiada się pasjonująco. Cracovia i Legia walczą o ligowe punkty.",
        section="Sport",
        tags=["piłka nożna", "ekstraklasa"],
        published_at=datetime.now(timezone.utc),
        press_title="Gazeta Krakowska",
        domain="gazetakrakowska.pl",
        raw_html_hash="h1",
    )

    result = classifier.classify(art)
    assert result.primary_topic == "SPORT"
    assert result.confidence >= 0.50
    assert result.taxonomy_version == "1.0.0"


def test_classifier_mandatory_fallback():
    mgr = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(mgr)

    art = Article(
        canonical_url="https://nto.pl/tajemniczy-tekst/999",
        title="Cokolwiek innego zupełnie bez słów kluczowych",
        lead="Nietypowy wpis bez żadnych nawiązań tematycznych.",
        body="Xyzz qwerty asdfgh jkl.",
        published_at=datetime.now(timezone.utc),
        press_title="NTO",
        domain="nto.pl",
        raw_html_hash="h2",
    )

    result = classifier.classify(art)
    assert result.primary_topic == "INNE/NIEOKREŚLONE"
    assert result.confidence < mgr.confidence_threshold


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
    assert report.macro_precision == 1.0
    assert report.macro_recall == 1.0
