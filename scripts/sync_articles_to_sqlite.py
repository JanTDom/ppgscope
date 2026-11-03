#!/usr/bin/env python3
"""
Synchronizuje najnowsze artykuły z dashboard.json do lokalnej bazy SQLite (data/ppgscope.db).
"""

import json
import sqlite3
import hashlib
from datetime import datetime, timezone
from pathlib import Path

repo_root = Path(__file__).resolve().parent.parent

def main():
    dash_path = repo_root / "data" / "dashboard.json"
    db_path = repo_root / "data" / "ppgscope.db"

    with open(dash_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    articles = data.get("recent_articles", [])
    print(f"Liczba artykułów w dashboard.json: {len(articles)}")

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Get existing canonical URLs
    cur.execute("SELECT canonical_url FROM articles")
    existing_urls = {row[0] for row in cur.fetchall()}
    print(f"Dotychczasowa liczba artykułów w SQLite: {len(existing_urls)}")

    inserted = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for a in articles:
        url = a.get("url") or a.get("canonical_url")
        if not url or url in existing_urls:
            continue

        title = a.get("title", "")
        lead = a.get("lead", title)
        body = lead
        author = a.get("author_name") or ("Redakcja" if a.get("byline_type") != "named" else "Dziennikarz")
        pub_at = a.get("published_at") or now_iso
        portal_name = a.get("portal_name", "")
        portal_domain = a.get("portal_domain", "")
        region = a.get("region", "Polska")
        domain_slug = a.get("domain", "spolecznosc")
        locality = a.get("locality", "C")
        confidence = float(a.get("confidence", 0.94))
        raw_hash = hashlib.sha256(f"{title}_{pub_at}_{url}".encode("utf-8")).hexdigest()

        cur.execute("""
            INSERT OR IGNORE INTO articles (
                canonical_url, title, lead, body, author, published_at, modified_at,
                section, tags, press_title, domain, region, raw_html_hash,
                is_duplicate, duplicate_cluster_id, original_article_url, created_at,
                category_domain, locality, domain_secondary, other_region, needs_review,
                confidence, portal_domain
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            url, title, lead, body, author, pub_at, pub_at,
            domain_slug, json.dumps([domain_slug]), portal_name, portal_domain, region, raw_hash,
            1 if a.get("is_duplicate") else 0, None, url, now_iso,
            domain_slug, locality, None, 0, 0, confidence, portal_domain
        ))
        existing_urls.add(url)
        inserted += 1

    conn.commit()
    conn.close()

    print(f"Pomyślnie dodano {inserted} nowych artykułów do SQLite.")
    print("Baza data/ppgscope.db jest w pełni zsynchronizowana.")

if __name__ == "__main__":
    main()
