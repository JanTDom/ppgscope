from datetime import datetime, timezone
from ppgscope.ingest.extractor import HtmlArticleExtractor
from ppgscope.ingest.intelligence import (
    PortalVitalityAuditor,
    VitalityStatus,
    HomepageRadarExtractor,
    ArticleVersionTracker,
    NewsroomPulseAnalyzer,
    HomepageStalenessAnalyzer,
    HomepageStalenessStatus,
    SyndicationCanonicalAuditor,
    SyndicationRole,
    RegionalCompetitorBenchmarkAnalyzer,
)


def test_extractor_paywall_sponsored_discover_and_local_institutions():
    paywall_html = """<!DOCTYPE html>
    <html>
    <head>
      <link rel="canonical" href="https://dziennikbaltycki.pl/sledztwo-w-gdansku/ar/c1-1111">
      <meta property="article:author" content="Marek Nowak">
      <script type="application/ld+json">
      {"@type": "NewsArticle", "isAccessibleForFree": false, "commentCount": 14}
      </script>
    </head>
    <body>
      <h1>Śledztwo w Gdańsku: Urząd Miasta i Rada Miasta pod lupą</h1>
      <p>Prezydent miasta oraz Starostwo Powiatowe odnieśli się do zarzutów mieszkańców w sprawie przetargu drogowego.</p>
    </body>
    </html>
    """
    art = HtmlArticleExtractor.extract(paywall_html, "https://dziennikbaltycki.pl/sledztwo-w-gdansku/ar/c1-1111")
    assert art.is_paywalled is True
    assert art.is_sponsored is False
    assert art.is_discover_bait is False
    assert art.byline_type == "named"
    assert art.comments_count == 14
    assert "Urząd Miasta / Gminy" in art.local_institutions_quoted

    discover_html = """<!DOCTYPE html>
    <html>
    <head>
      <link rel="canonical" href="https://pomorska.pl/kiedy-wyplata-14-emerytury/ar/c3-2222">
      <meta property="article:author" content="Redakcja">
    </head>
    <body>
      <h1>Kiedy wypłata 14. emerytury? Sprawdź czy należą ci się dodatkowe pieniądze</h1>
      <h2>Ile wynosi nowy limit?</h2>
      <h2>Komu przysługuje świadczenie?</h2>
      <p>Wielu seniorów zastanawia się nad harmonogramem przelewów z ZUS w tym miesiącu.</p>
    </body>
    </html>
    """
    art_disc = HtmlArticleExtractor.extract(discover_html, "https://pomorska.pl/kiedy-wyplata-14-emerytury/ar/c3-2222")
    assert art_disc.is_discover_bait is True
    assert art_disc.byline_type == "anonymous"

    sponsored_html = """<!DOCTYPE html>
    <html>
    <head>
      <link rel="canonical" href="https://gloswielkopolski.pl/nowe-osiedle/ar/c4-3333">
      <meta property="article:section" content="Materiał partnera">
    </head>
    <body>
      <h1>Nowoczesne osiedle w centrum</h1>
      <p>Artykuł sponsorowany we współpracy z inwestorem mieszkaniowym.</p>
    </body>
    </html>
    """
    art_spon = HtmlArticleExtractor.extract(sponsored_html, "https://gloswielkopolski.pl/nowe-osiedle/ar/c4-3333")
    assert art_spon.is_sponsored is True
    assert art_spon.byline_type == "partner"


def test_portal_vitality_auditor_classifications():
    # 1. Active & Unique
    rep_active = PortalVitalityAuditor.evaluate_portal(
        domain="gazetakrakowska.pl",
        portal_name="Gazeta Krakowska",
        region="Małopolskie",
        portal_type="DZIENNIK_REGIONALNY",
        http_status=200,
        daily_articles_count=75,
        unique_articles_count=44,
        hours_since_last_pub=0.3,
        named_authors_count=18,
        cron_scheduled_pct=14.0,
    )
    assert rep_active.vitality_status == VitalityStatus.AKTYWNY_UNIKALNY
    assert rep_active.uniqueness_pct == 58.7
    assert rep_active.vitality_score > 75.0

    # 2. Active Syndicate Clone
    rep_synd = PortalVitalityAuditor.evaluate_portal(
        domain="puck.naszemiasto.pl",
        portal_name="Puck NaszeMiasto",
        region="Pomorskie",
        portal_type="SERWIS_LOKALNY",
        http_status=200,
        daily_articles_count=16,
        unique_articles_count=3,
        hours_since_last_pub=1.5,
        named_authors_count=1,
        cron_scheduled_pct=42.0,
    )
    assert rep_synd.vitality_status == VitalityStatus.AKTYWNY_SYNDYKAT
    assert rep_synd.syndicated_clones_pct > 75.0

    # 3. Barely Alive
    rep_barely = PortalVitalityAuditor.evaluate_portal(
        domain="lubaczow.naszemiasto.pl",
        portal_name="Lubaczów NaszeMiasto",
        region="Podkarpackie",
        portal_type="SERWIS_LOKALNY",
        http_status=200,
        daily_articles_count=3,
        unique_articles_count=1,
        hours_since_last_pub=9.5,
        named_authors_count=1,
        cron_scheduled_pct=30.0,
    )
    assert rep_barely.vitality_status == VitalityStatus.LEDWO_ZYWY

    # 4. Zombie Automat
    rep_zombie = PortalVitalityAuditor.evaluate_portal(
        domain="choszczno.naszemiasto.pl",
        portal_name="Choszczno NaszeMiasto",
        region="Zachodniopomorskie",
        portal_type="SERWIS_LOKALNY",
        http_status=200,
        daily_articles_count=8,
        unique_articles_count=0,
        hours_since_last_pub=3.0,
        named_authors_count=0,
        cron_scheduled_pct=75.0,
    )
    assert rep_zombie.vitality_status == VitalityStatus.ZOMBIE_AUTOMAT

    # 5. Dead / HTTP 410
    rep_dead = PortalVitalityAuditor.evaluate_portal(
        domain="polskatimes.pl",
        portal_name="Polska Times",
        region="Ogólnopolskie",
        portal_type="PORTAL_KRAJOWY",
        http_status=410,
        daily_articles_count=0,
        unique_articles_count=0,
        hours_since_last_pub=999.0,
        named_authors_count=0,
    )
    assert rep_dead.vitality_status == VitalityStatus.MARTWY
    assert rep_dead.vitality_score == 0.0


def test_homepage_radar_and_version_tracker():
    homepage_html = """<!DOCTYPE html>
    <html><body>
      <a href="/wypadek-na-obwodnicy-krakowa-zablokowane-pasy/ar/c1-9001">PILNE: Groźny wypadek na obwodnicy Krakowa, zablokowane dwa pasy</a>
      <a href="/budzet-miasta-krakowa-uchwalony-strefa-plus/ar/c1-9002"><span class="strefa-plus">Tylko w Plus: Budżet miasta Krakowa uchwalony po burzliwej sesji</span></a>
      <a href="/nowa-inwestycja-dewelopera-w-centrum/ar/c1-9003">Materiał partnera: Nowa inwestycja dewelopera w samym centrum</a>
    </body></html>
    """
    snap = HomepageRadarExtractor.extract_snapshot(homepage_html, "gazetakrakowska.pl")
    assert snap.lead_story is not None
    assert snap.lead_story.is_breaking is True
    assert snap.breaking_badges_count == 1
    assert snap.paywall_slots_pct > 0
    assert snap.sponsored_slots_pct > 0

    # Version tracker tests
    art_v1 = HtmlArticleExtractor.extract(
        "<html><head><link rel='canonical' href='https://i.pl/art-1'></head><body><h1>Spokojny tytuł o ustawie</h1><p>Krótka treść artykułu z posiedzenia komisji.</p></body></html>",
        "https://i.pl/art-1",
    )
    art_v2 = HtmlArticleExtractor.extract(
        "<html><head><link rel='canonical' href='https://i.pl/art-1'></head><body><h1>SZOK! Burza w Sejmie wokół nowej ustawy!</h1><p>Krótka treść artykułu z posiedzenia komisji.</p></body></html>",
        "https://i.pl/art-1",
    )
    diff = ArticleVersionTracker.compare_versions(art_v1, art_v2)
    assert diff is not None
    assert diff.change_type == "HEADLINE_MUTATION"

    tombstone = ArticleVersionTracker.compare_versions(art_v1, None, http_status=404)
    assert tombstone is not None
    assert tombstone.change_type == "TOMBSTONE_DELETED"
    assert tombstone.http_status == 404


def test_newsroom_pulse_analyzer():
    a1 = HtmlArticleExtractor.extract(
        "<html><head><meta property='article:author' content='Anna Wiśniewska'><meta property='article:published_time' content='2026-10-17T06:00:00Z'></head><body><h1>Tekst 1</h1></body></html>",
        "https://dziennikbaltycki.pl/t1",
    )
    a2 = HtmlArticleExtractor.extract(
        "<html><head><meta property='article:author' content='Anna Wiśniewska'><meta property='article:published_time' content='2026-10-17T07:15:00Z'></head><body><h1>Tekst 2</h1></body></html>",
        "https://dziennikzachodni.pl/t2",
    )
    pulse = NewsroomPulseAnalyzer.analyze_cadence([a1, a2])
    assert pulse["named_authors_count"] == 1
    assert pulse["cron_scheduled_pct"] == 100.0
    assert len(pulse["hub_authors"]) == 1


def test_homepage_staleness_analyzer():
    rep_dyn = HomepageStalenessAnalyzer.evaluate_staleness(
        domain="gazetakrakowska.pl",
        portal_name="Gazeta Krakowska",
        region="Małopolskie",
        current_hero_title="PILNE: Obwodnica Krakowa zablokowana",
        current_hero_dwell_hours=2.1,
        avg_weekday_dwell_hours=2.8,
        avg_weekend_dwell_hours=4.2,
        evening_freeze_hours=5.1,
        swaps_per_24h=9,
        median_reaction_minutes=11,
    )
    assert rep_dyn.staleness_status == HomepageStalenessStatus.DYNAMICZNA_CZOLOWKA
    assert rep_dyn.proof.value == "DYNAMICZNA_CZOLOWKA"

    rep_frozen = HomepageStalenessAnalyzer.evaluate_staleness(
        domain="nto.pl",
        portal_name="Nowa Trybuna Opolska",
        region="Opolskie",
        current_hero_title="Weekendowy festyn w Opolu",
        current_hero_dwell_hours=8.4,
        avg_weekday_dwell_hours=4.9,
        avg_weekend_dwell_hours=9.8,
        evening_freeze_hours=10.5,
        swaps_per_24h=3,
        median_reaction_minutes=29,
    )
    assert rep_frozen.staleness_status == HomepageStalenessStatus.ZASTYGLA_JEDYNKA


def test_syndication_canonical_auditor():
    hygiene_ok = SyndicationCanonicalAuditor.check_canonical_hygiene(
        page_url="https://bochnia.naszemiasto.pl/wypadek-na-a4/ar/c1-100",
        canonical_url="https://gazetakrakowska.pl/wypadek-na-a4/ar/c1-100",
        origin_url="https://gazetakrakowska.pl/wypadek-na-a4/ar/c1-100",
    )
    assert hygiene_ok["is_syndicated_copy"] is True
    assert hygiene_ok["points_to_origin"] is True
    assert hygiene_ok["seo_safe"] is True

    hygiene_bad = SyndicationCanonicalAuditor.check_canonical_hygiene(
        page_url="https://bochnia.naszemiasto.pl/wypadek-na-a4/ar/c1-100",
        canonical_url="https://bochnia.naszemiasto.pl/wypadek-na-a4/ar/c1-100",
        origin_url="https://gazetakrakowska.pl/wypadek-na-a4/ar/c1-100",
    )
    assert hygiene_bad["is_self_canonical_clone"] is True
    assert hygiene_bad["seo_safe"] is False

    rep_exporter = SyndicationCanonicalAuditor.evaluate_portal_syndication(
        domain="dziennikbaltycki.pl",
        portal_name="Dziennik Bałtycki",
        region="Pomorskie",
        exported_originals_30d=410,
        generated_network_copies_30d=3280,
        imported_clones_30d=190,
        cross_domain_canonical_pct=91.5,
    )
    assert rep_exporter.role == SyndicationRole.EKSPORTER_TRESCI
    assert rep_exporter.seo_cannibalization_risk == "NISKIE"

    rep_importer = SyndicationCanonicalAuditor.evaluate_portal_syndication(
        domain="puck.naszemiasto.pl",
        portal_name="Puck NaszeMiasto",
        region="Pomorskie",
        exported_originals_30d=12,
        generated_network_copies_30d=18,
        imported_clones_30d=380,
        cross_domain_canonical_pct=34.0,
    )
    assert rep_importer.role == SyndicationRole.BIORCA_KLONOW
    assert rep_importer.seo_cannibalization_risk == "WYSOKIE"


def test_regional_competitor_benchmark_1to1():
    labels = {
        "01": "Władza i polityka",
        "02": "Bezpieczeństwo i zdarzenia",
        "05": "Infrastruktura i transport",
    }
    rep = RegionalCompetitorBenchmarkAnalyzer.compare_1to1(
        region="Pomorskie",
        city_hub="Trójmiasto (Gdańsk / Gdynia / Sopot)",
        ppg_portal_name="Dziennik Bałtycki",
        ppg_domain="dziennikbaltycki.pl",
        competitor_name="Trojmiasto.pl",
        competitor_domain="trojmiasto.pl",
        ppg_domain_counts={"01": 14, "02": 18, "05": 6},
        competitor_domain_counts={"01": 8, "02": 14, "05": 16},
        domain_labels=labels,
        ppg_first_on_breaking_pct=44.0,
        median_lag_minutes=14,
    )
    assert rep.ppg_local_daily_volume == 38
    assert rep.competitor_local_daily_volume == 38
    assert len(rep.domain_comparison) == 3
    assert any("Infrastruktura i transport" in t for t in rep.competitor_advantage_topics)
    assert any("Władza i polityka" in t for t in rep.ppg_advantage_topics)

