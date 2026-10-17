"""
Migration script: Reclassifies existing articles in data/dashboard.json into Taxonomy v2.0
- Creates backup data/dashboard.backup.json
- Reclassifies all articles using RuleBasedTopicClassifier with title coverage areas
- Adds domain, domain_name, domain_secondary, locality (C, L, CL), other_region, needs_review
- Preserves legacy fields (topic_id, topic_name) for backward compatibility
- Generates migration distribution report (Old Topic -> Domain x Locality)
"""

import json
import shutil
from pathlib import Path
from datetime import datetime, timezone
from ppgscope.models.article import Article
from ppgscope.classifier.taxonomy import TaxonomyManager
from ppgscope.classifier.rule_classifier import RuleBasedTopicClassifier

def run_migration():
    repo_root = Path(__file__).resolve().parent.parent
    data_file = repo_root / "data" / "dashboard.json"
    backup_file = repo_root / "data" / "dashboard.backup.json"
    web_file = repo_root / "web" / "public" / "data" / "dashboard.json"

    # 1. Backup
    shutil.copy2(data_file, backup_file)
    print(f"Created backup at {backup_file}")

    with open(data_file, "r", encoding="utf-8") as f:
        dashboard = json.load(f)

    mgr = TaxonomyManager(str(repo_root / "config" / "taxonomy_v2.json"))
    classifier = RuleBasedTopicClassifier(mgr)

    domain_names = {d.slug: d.name for d in mgr.domains.values()}

    articles = dashboard.get("recent_articles", [])
    print(f"Loaded {len(articles)} articles to migrate...")

    migration_matrix = {}
    needs_review_count = 0
    locality_counts = {"C": 0, "CL": 0, "L": 0}
    domain_counts = {}

    migrated_articles = []
    for art in articles:
        old_topic = art.get("topic_id", "INNE/NIEOKREŚLONE")
        title_domain = art.get("portal_domain", "")
        press_title = art.get("portal_name", "")

        article_obj = Article(
            canonical_url=art["url"],
            title=art["title"],
            lead=art.get("lead", ""),
            body=art.get("lead", "") or art["title"],
            published_at=datetime.fromisoformat(art["published_at"]),
            press_title=press_title,
            domain=title_domain,
            raw_html_hash=art.get("id", "hash"),
        )

        res = classifier.classify(article_obj)

        if res.needs_review:
            needs_review_count += 1

        loc = res.locality
        locality_counts[loc] = locality_counts.get(loc, 0) + 1
        dom = res.domain
        domain_counts[dom] = domain_counts.get(dom, 0) + 1

        key = (old_topic, dom, loc)
        migration_matrix[key] = migration_matrix.get(key, 0) + 1

        # Enrich article
        art_updated = dict(art)
        art_updated["domain"] = res.domain
        art_updated["domain_name"] = domain_names.get(res.domain, res.domain)
        art_updated["domain_secondary"] = res.domain_secondary
        art_updated["locality"] = res.locality
        art_updated["other_region"] = res.other_region
        art_updated["needs_review"] = res.needs_review
        art_updated["confidence"] = res.confidence

        migrated_articles.append(art_updated)

    dashboard["recent_articles"] = migrated_articles
    dashboard["taxonomy_v2"] = {
        "version": "2.0.0",
        "domains": [d.model_dump() for d in mgr.domains.values()],
        "locality_variants": [
            {"code": "L", "name": "Lokalne", "description": "Sprawa o źródle lokalnym z obszaru tytułu"},
            {"code": "CL", "name": "Centralne z rozwinięciem lokalnym", "description": "Sprawa ogólnokrajowa pokazana na przykładzie lokalnym"},
            {"code": "C", "name": "Centralne", "description": "Brak lokalnego podmiotu z obszaru tytułu"}
        ]
    }
    dashboard["taxonomy_v2_stats"] = {
        "locality_counts": locality_counts,
        "domain_counts": domain_counts,
        "needs_review_count": needs_review_count,
        "total_migrated": len(migrated_articles)
    }

    # Save to data/dashboard.json and web/public/data/dashboard.json
    with open(data_file, "w", encoding="utf-8") as f:
        json.dump(dashboard, f, ensure_ascii=False, indent=2)

    with open(web_file, "w", encoding="utf-8") as f:
        json.dump(dashboard, f, ensure_ascii=False, indent=2)

    print("Migration completed successfully!")
    print(f"Total migrated: {len(migrated_articles)}")
    print(f"Locality distribution: {locality_counts}")
    print(f"Needs review count: {needs_review_count}")

    # Print sample migration matrix
    print("\nSample Old Topic -> New Domain x Locality transitions:")
    for (old, new_dom, new_loc), count in sorted(migration_matrix.items(), key=lambda x: -x[1])[:15]:
        print(f"  {old:22} -> {new_dom:15} [{new_loc:2}]: {count:4} art.")

if __name__ == "__main__":
    run_migration()
