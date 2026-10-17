"""
Continuous Ingestion & Monitoring Service for PPGscope (Cykliczny monitoring co 3h).
- Monitors active PPG titles across regional dailies, NaszeMiasto, and vertical portals.
- Ingests latest articles from Google News sitemaps and RSS feeds.
- Extracts article metadata, title, lead, body, and publication timestamp.
- Deduplicates against existing canonical_url in SQLite database (data/ppgscope.db).
- Classifies new incoming articles into Taxonomy v2.0 (18 domains, locality C/CL/L).
- Syncs with data/dashboard.json, web/public/data/dashboard.json, and pre-computed aggregation cubes.
- Logs structured run reports to data/ingest_runs.log.
"""

import sys
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
import yaml

repo_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(repo_root))

from ppgscope.ingest.client import PoliteHttpClient
from ppgscope.ingest.sitemap import SitemapParser
from ppgscope.ingest.rss import RssParser
from ppgscope.ingest.extractor import HtmlArticleExtractor
from ppgscope.classifier.taxonomy import TaxonomyManager
from ppgscope.classifier.rule_classifier import RuleBasedTopicClassifier
from ppgscope.storage.aggregates import DatabaseAggregator, build_preaggregated_cube

# Configure structured logging
log_path = repo_root / "data" / "ingest_runs.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_path, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("ppgscope-ingest")


def run_ingest(max_titles: int = 15, max_articles_per_title: int = 4):
    logger.info("Rozpoczynam cykliczny monitoring serwisów Polska Press Grupa (co 3h)...")

    db_agg = DatabaseAggregator()
    tax_mgr = TaxonomyManager(str(repo_root / "config" / "taxonomy_v2.json"))
    classifier = RuleBasedTopicClassifier(tax_mgr)
    client = PoliteHttpClient(rate_limit_per_domain_sec=0.5)

    # Load titles from verified registry
    registry_file = repo_root / "sources" / "ppg_registry.yaml"
    with open(registry_file, "r", encoding="utf-8") as f:
        titles_raw = yaml.safe_load(f)

    # Filter titles that have active websites
    active_titles = [t for t in titles_raw if t.get("domain") and not t.get("domain").startswith("http")]
    logger.info(f"Załadowano {len(active_titles)} zarejestrowanych tytułów PPG. W tym cyklu odpytuję próbę {max_titles} czołowych serwisów.")

    total_discovered = 0
    total_new_ingested = 0
    domain_counts = {}

    # Prioritize key regional dailies and i.pl in the monitoring queue
    priority_domains = [
        "gazetakrakowska.pl", "dziennikbaltycki.pl", "gloswielkopolski.pl",
        "dzienniklodzki.pl", "gazetawroclawska.pl", "pomorska.pl",
        "dziennikzachodni.pl", "echodnia.eu", "nowiny24.pl", "i.pl",
        "krakow.naszemiasto.pl", "warszawa.naszemiasto.pl", "wroclaw.naszemiasto.pl"
    ]

    sorted_titles = sorted(
        active_titles,
        key=lambda x: (0 if any(p in x.get("domain", "") for p in priority_domains) else 1)
    )

    for title_info in sorted_titles[:max_titles]:
        domain = title_info["domain"]
        name = title_info["name"]
        region = title_info.get("region", "kraj")

        # Try Google News Sitemap first, fallback to RSS
        sitemap_url = f"https://{domain}/sitemap-google-news.xml"
        rss_url = f"https://{domain}/rss"

        article_urls = []
        try:
            resp = client.get(sitemap_url)
            if resp.status_code == 200 and "<urlset" in resp.text:
                items = SitemapParser.parse_google_news(resp.text)
                article_urls = [item.loc for item in items[:max_articles_per_title]]
                logger.info(f"[{domain}] Sitemap Google News: odnaleziono {len(items)} artykułów (pobieram {len(article_urls)})")
            else:
                # Try RSS fallback
                rss_resp = client.get(rss_url)
                if rss_resp.status_code == 200:
                    rss_channel = RssParser.parse(rss_resp.text)
                    article_urls = [item.link for item in rss_channel.items[:max_articles_per_title]]
                    logger.info(f"[{domain}] RSS feed: odnaleziono {len(rss_channel.items)} artykułów (pobieram {len(article_urls)})")
        except Exception as e:
            logger.warning(f"[{domain}] Błąd pobierania sitemapy/RSS: {e}")
            continue

        total_discovered += len(article_urls)

        # Ingest and classify each article
        for url in article_urls:
            # Check if article already exists in DB
            existing = db_agg.conn.execute(
                "SELECT canonical_url FROM articles WHERE canonical_url = ?",
                (url,)
            ).fetchone()
            if existing:
                continue

            try:
                art_resp = client.get(url)
                if art_resp.status_code == 200:
                    article_obj = HtmlArticleExtractor.extract(
                        html_content=art_resp.text,
                        fallback_url=url,
                        press_title_hint=name,
                        region_hint=region
                    )

                    # Classify into Taxonomy v2.0
                    class_res = classifier.classify(article_obj)

                    # Save to SQLite database
                    with db_agg.conn:
                        db_agg.conn.execute("""
                            INSERT INTO articles (
                                canonical_url, title, lead, body, author, published_at,
                                press_title, domain, portal_domain, region, raw_html_hash,
                                tags, created_at, category_domain, locality, domain_secondary,
                                other_region, needs_review, confidence
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(canonical_url) DO NOTHING
                        """, (
                            article_obj.canonical_url,
                            article_obj.title,
                            article_obj.lead,
                            article_obj.body,
                            article_obj.author,
                            article_obj.published_at.isoformat(),
                            name,
                            domain,
                            domain,
                            region,
                            article_obj.raw_html_hash,
                            datetime.now(timezone.utc).isoformat(),
                            class_res.domain,
                            class_res.locality,
                            class_res.domain_secondary,
                            1 if class_res.other_region else 0,
                            1 if class_res.needs_review else 0,
                            class_res.confidence
                        ))

                    total_new_ingested += 1
                    dom = class_res.domain
                    domain_counts[dom] = domain_counts.get(dom, 0) + 1
                    logger.info(f"  + Zapisano: [{class_res.domain}/{class_res.locality}] {article_obj.title[:60]}...")

            except Exception as e:
                logger.warning(f"  ! Błąd przetwarzania {url}: {e}")

    # Recompute server-side aggregation cubes
    logger.info("Aktualizacja kostek agregacyjnych i pliku dashboard.json...")
    cubes = build_preaggregated_cube()

    dashboard_path = repo_root / "data" / "dashboard.json"
    web_dashboard_path = repo_root / "web" / "public" / "data" / "dashboard.json"

    if dashboard_path.exists():
        with open(dashboard_path, "r", encoding="utf-8") as f:
            dash_data = json.load(f)
        
        dash_data["last_ingest_run"] = datetime.now(timezone.utc).isoformat()
        dash_data["server_aggregates"] = cubes
        dash_data["ingest_summary"] = {
            "titles_checked": max_titles,
            "articles_discovered": total_discovered,
            "new_articles_ingested": total_new_ingested,
            "domains_distribution": domain_counts
        }

        with open(dashboard_path, "w", encoding="utf-8") as f:
            json.dump(dash_data, f, ensure_ascii=False, indent=2)

        with open(web_dashboard_path, "w", encoding="utf-8") as f:
            json.dump(dash_data, f, ensure_ascii=False, indent=2)

    logger.info(
        f"Zakończono cykl monitoringu. Sprawdzono: {max_titles} serwisów, "
        f"Odnaleziono: {total_discovered} art., Nowo pobrano i sklasyfikowano: {total_new_ingested} art."
    )
    return {
        "status": "SUCCESS",
        "titles_checked": max_titles,
        "articles_discovered": total_discovered,
        "new_articles_ingested": total_new_ingested,
        "domains_distribution": domain_counts
    }


if __name__ == "__main__":
    result = run_ingest()
    print("\nWynik wykonania:")
    print(json.dumps(result, ensure_ascii=False, indent=2))
