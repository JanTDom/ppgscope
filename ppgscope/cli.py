import sys
import json
from typing import List, Optional, Dict
from pathlib import Path
from datetime import datetime, timezone
import argparse

from ppgscope.models.title import MediaTitle
from ppgscope.models.article import Article
from ppgscope.ingest.client import PoliteHttpClient
from ppgscope.ingest.sitemap import SitemapParser
from ppgscope.ingest.rss import RssParser
from ppgscope.ingest.extractor import HtmlArticleExtractor
from ppgscope.dedup.engine import DeduplicationEngine
from ppgscope.classifier.taxonomy import TaxonomyManager
from ppgscope.classifier.rule_classifier import RuleBasedTopicClassifier
from ppgscope.stats.proportions import TrendCalculator, PeriodType
from ppgscope.connectors.manager import ConnectorManager
from ppgscope.storage.db import StorageRepository


def get_repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def sync_registry(db: StorageRepository) -> List[MediaTitle]:
    """Loads verified domains from config/verified_domains.json into the DB."""
    config_path = get_repo_root() / "config" / "verified_domains.json"
    with open(config_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    titles = []
    for item in data:
        t = MediaTitle(
            id=item["id"],
            name=item["name"],
            domain=item["domain"],
            region=item["region"],
            type=item["type"],
            status=item["status"],
            error_reason=item.get("error_reason"),
            robots_url=item["robots_url"],
            google_news_sitemap=item.get("google_news_sitemap"),
            sitemap_url=item.get("sitemap_url"),
            rss_url=item.get("rss_url"),
            last_success_at=None,
            fetched_records_count=0,
        )
        db.upsert_title(t)
        titles.append(t)
    return titles


def ingest_live(db: StorageRepository, max_titles: int = 5, max_articles_per_title: int = 3):
    """
    Ingests live articles from Google News sitemaps of verified PPG titles.
    Respects rate limits, extracts HTML and saves to database.
    """
    titles = [t for t in db.get_all_titles() if t.status == "DZIAŁA" and t.google_news_sitemap]
    client = PoliteHttpClient(rate_limit_per_domain_sec=1.0)
    
    total_ingested = 0
    print(f"Rozpoczynam pobieranie z {min(len(titles), max_titles)} aktywnych serwisów PPG...")

    for t in titles[:max_titles]:
        print(f"--> Pobieram sitemapę Google News dla: {t.name} ({t.google_news_sitemap})")
        try:
            resp = client.get(t.google_news_sitemap)
            if resp.status_code != 200:
                print(f"    Błąd sitemapy: HTTP {resp.status_code}")
                continue

            items = SitemapParser.parse_google_news(resp.text)
            print(f"    Znaleziono {len(items)} artykułów w sitemapie")

            success_for_title = 0
            for item in items[:max_articles_per_title]:
                try:
                    art_resp = client.get(item.loc)
                    if art_resp.status_code == 200:
                        article = HtmlArticleExtractor.extract(
                            html_content=art_resp.text,
                            fallback_url=item.loc,
                            press_title_hint=t.name,
                            region_hint=t.region,
                        )
                        db.save_article(article)
                        success_for_title += 1
                        total_ingested += 1
                except Exception as ex:
                    print(f"    Błąd pobierania artykułu {item.loc}: {ex}")

            t.last_success_at = datetime.now(timezone.utc)
            t.fetched_records_count += success_for_title
            db.upsert_title(t)
            print(f"    Pomyślnie zapisano {success_for_title} artykułów z: {t.name}")

        except Exception as ex:
            print(f"    Błąd przetwarzania tytułu {t.name}: {ex}")

    print(f"Pobieranie zakończone. Łącznie pobrano: {total_ingested} artykułów.")


def process_dedup_and_classify(db: StorageRepository):
    """Processes deduplication and classification on all stored articles."""
    articles = db.get_all_articles()
    print(f"Przetwarzam deduplikację i klasyfikację dla {len(articles)} artykułów...")
    
    dedup_engine = DeduplicationEngine(threshold=0.80)
    # Sort by published_at ascending so earliest publication is processed first
    sorted_articles = sorted(articles, key=lambda a: a.published_at)

    for a in sorted_articles:
        processed = dedup_engine.process_article(a)
        db.save_article(processed)

    # Save clusters
    for cl in dedup_engine.get_all_clusters():
        db.save_duplicate_cluster(cl)

    # Classification
    tax_manager = TaxonomyManager()
    classifier = RuleBasedTopicClassifier(tax_manager)

    for a in articles:
        res = classifier.classify(a)
        db.save_classification(res)

    print("Deduplikacja i klasyfikacja zakończona sukcesem.")


def export_dashboard_data(db: StorageRepository, output_path: Path):
    """Exports structured data for the Next.js frontend."""
    titles = db.get_all_titles()
    articles = db.get_all_articles()
    classifications = db.get_all_classifications()
    
    connector_mgr = ConnectorManager()
    health_results = connector_mgr.run_all_health_checks()
    coverage_metric = connector_mgr.get_coverage_metric()

    tax_manager = TaxonomyManager()
    trend_calc = TrendCalculator(min_sample_size=1)

    # Calculate trends and distribution
    topic_distribution_all = trend_calc.calculate_topic_distribution(articles, classifications, variant="ALL")
    topic_distribution_own = trend_calc.calculate_topic_distribution(articles, classifications, variant="OWN")

    total_articles = len(articles)
    total_duplicates = sum(1 for a in articles if a.is_duplicate)
    unique_articles = total_articles - total_duplicates

    # Format articles for JSON export
    serialized_articles = []
    for a in articles[:100]:
        cl = classifications.get(a.canonical_url)
        serialized_articles.append({
            "canonical_url": a.canonical_url,
            "title": a.title,
            "lead": a.lead,
            "author": a.author,
            "published_at": a.published_at.isoformat(),
            "section": a.section,
            "tags": a.tags,
            "press_title": a.press_title,
            "domain": a.domain,
            "region": a.region,
            "raw_html_hash": a.raw_html_hash,
            "is_duplicate": a.is_duplicate,
            "original_article_url": a.original_article_url,
            "primary_topic": cl.primary_topic if cl else "INNE/NIEOKREŚLONE",
            "secondary_topics": cl.secondary_topics if cl else [],
            "confidence": cl.confidence if cl else 0.0,
        })

    # Connectors info
    connectors_data = []
    for c in connector_mgr.list_connectors():
        h = health_results.get(c.id)
        access_tier_str = c.access_tier if isinstance(c.access_tier, str) else c.access_tier.value
        status_str = "BRAK_DANYCH"
        if h:
            status_str = h.status if isinstance(h.status, str) else h.status.value

        connectors_data.append({
            "id": c.id,
            "name": c.name,
            "access_tier": access_tier_str,
            "measured_metrics": c.measured_metrics,
            "frequency": c.frequency,
            "reliability_score": c.reliability,
            "is_enabled": c.is_enabled,
            "disabled_reason": c.disabled_reason,
            "status": status_str,
            "status_message": h.message if h else "Brak danych z autotestu",
            "latency_ms": h.latency_ms if h else None,
        })

    data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_articles": total_articles,
            "unique_articles": unique_articles,
            "duplicate_articles": total_duplicates,
            "syndicate_share": round((total_duplicates / total_articles * 100.0), 1) if total_articles > 0 else 0.0,
            "active_titles_count": sum(1 for t in titles if t.status == "DZIAŁA"),
            "coverage_metric": coverage_metric.model_dump(mode="json"),
        },
        "topic_distribution": {
            "all_production": topic_distribution_all,
            "own_reporting_only": topic_distribution_own,
        },
        "taxonomy": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
            }
            for t in tax_manager.topics.values()
        ],
        "titles": [t.model_dump(mode="json") for t in titles],
        "connectors": connectors_data,
        "recent_articles": serialized_articles,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Dane wyeksportowane do: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="PPGscope Engine CLI")
    parser.add_argument("--db", default=str(get_repo_root() / "data" / "ppgscope.db"), help="Path to SQLite DB")
    parser.add_argument("--sync", action="store_true", help="Sync verified titles registry into DB")
    parser.add_argument("--ingest", action="store_true", help="Ingest live articles from verified PPG titles")
    parser.add_argument("--process", action="store_true", help="Run deduplication and classification")
    parser.add_argument("--export", type=str, help="Export JSON data for frontend")
    parser.add_argument("--max-titles", type=int, default=5, help="Max titles to ingest in one batch")
    parser.add_argument("--max-articles", type=int, default=3, help="Max articles per title")

    args = parser.parse_args()
    db = StorageRepository(args.db)

    if args.sync:
        sync_registry(db)
        print("Rejestr tytułów zsynchronizowany.")

    if args.ingest:
        ingest_live(db, max_titles=args.max_titles, max_articles_per_title=args.max_articles)

    if args.process:
        process_dedup_and_classify(db)

    if args.export:
        export_dashboard_data(db, Path(args.export))


if __name__ == "__main__":
    main()
