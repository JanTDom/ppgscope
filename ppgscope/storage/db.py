import sqlite3
import json
from typing import List, Optional, Dict
from datetime import datetime
from pathlib import Path

from ppgscope.models.article import Article
from ppgscope.models.title import MediaTitle
from ppgscope.models.dedup import DuplicateCluster
from ppgscope.models.taxonomy import ClassificationResult
from ppgscope.models.proof import MetricProof, MetricStatus


class StorageRepository:
    """
    Idempotent database storage repository for PPGscope.
    Guarantees that canonical_url is the primary key and updates existing records.
    """

    def __init__(self, db_path: str = ":memory:"):
        self.db_path = db_path
        if db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_sqlite_schema()

    def _init_sqlite_schema(self) -> None:
        with self.conn:
            self.conn.executescript("""
                CREATE TABLE IF NOT EXISTS titles (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    domain TEXT NOT NULL UNIQUE,
                    region TEXT NOT NULL,
                    type TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'DZIAŁA',
                    error_reason TEXT,
                    robots_url TEXT NOT NULL,
                    google_news_sitemap TEXT,
                    sitemap_url TEXT,
                    rss_url TEXT,
                    last_success_at TEXT,
                    fetched_records_count INTEGER NOT NULL DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS duplicate_clusters (
                    cluster_id TEXT PRIMARY KEY,
                    original_url TEXT NOT NULL,
                    original_published_at TEXT NOT NULL,
                    original_title TEXT NOT NULL,
                    original_press_title TEXT NOT NULL,
                    duplicate_count INTEGER NOT NULL DEFAULT 0,
                    member_urls TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS articles (
                    canonical_url TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    lead TEXT,
                    body TEXT NOT NULL,
                    author TEXT,
                    published_at TEXT NOT NULL,
                    modified_at TEXT,
                    section TEXT,
                    tags TEXT NOT NULL,
                    press_title TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    region TEXT,
                    raw_html_hash TEXT NOT NULL,
                    is_duplicate INTEGER NOT NULL DEFAULT 0,
                    duplicate_cluster_id TEXT,
                    original_article_url TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS classifications (
                    canonical_url TEXT PRIMARY KEY,
                    primary_topic TEXT NOT NULL,
                    secondary_topics TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    model_version TEXT NOT NULL,
                    prompt_version TEXT,
                    taxonomy_version TEXT NOT NULL,
                    classified_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS metric_proofs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_name TEXT NOT NULL,
                    metric_value TEXT NOT NULL,
                    status TEXT NOT NULL,
                    source TEXT NOT NULL,
                    measured_at TEXT NOT NULL,
                    sample_size INTEGER NOT NULL,
                    methodology_version TEXT NOT NULL,
                    p_value REAL,
                    is_significant INTEGER,
                    details TEXT
                );
            """)

    # 1. Titles
    def upsert_title(self, title: MediaTitle) -> None:
        with self.conn:
            self.conn.execute("""
                INSERT INTO titles (
                    id, name, domain, region, type, status, error_reason,
                    robots_url, google_news_sitemap, sitemap_url, rss_url,
                    last_success_at, fetched_records_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    domain=excluded.domain,
                    region=excluded.region,
                    type=excluded.type,
                    status=excluded.status,
                    error_reason=excluded.error_reason,
                    robots_url=excluded.robots_url,
                    google_news_sitemap=excluded.google_news_sitemap,
                    sitemap_url=excluded.sitemap_url,
                    rss_url=excluded.rss_url,
                    last_success_at=excluded.last_success_at,
                    fetched_records_count=excluded.fetched_records_count;
            """, (
                title.id, title.name, title.domain, title.region, title.type,
                title.status, title.error_reason, title.robots_url,
                title.google_news_sitemap, title.sitemap_url, title.rss_url,
                title.last_success_at.isoformat() if title.last_success_at else None,
                title.fetched_records_count,
            ))

    def get_all_titles(self) -> List[MediaTitle]:
        cursor = self.conn.execute("SELECT * FROM titles ORDER BY name ASC")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append(
                MediaTitle(
                    id=r["id"],
                    name=r["name"],
                    domain=r["domain"],
                    region=r["region"],
                    type=r["type"],
                    status=r["status"],
                    error_reason=r["error_reason"],
                    robots_url=r["robots_url"],
                    google_news_sitemap=r["google_news_sitemap"],
                    sitemap_url=r["sitemap_url"],
                    rss_url=r["rss_url"],
                    last_success_at=datetime.fromisoformat(r["last_success_at"]) if r["last_success_at"] else None,
                    fetched_records_count=r["fetched_records_count"],
                )
            )
        return result

    # 2. Articles (Idempotent by canonical_url)
    def save_article(self, a: Article) -> None:
        with self.conn:
            self.conn.execute("""
                INSERT INTO articles (
                    canonical_url, title, lead, body, author, published_at, modified_at,
                    section, tags, press_title, domain, region, raw_html_hash,
                    is_duplicate, duplicate_cluster_id, original_article_url, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(canonical_url) DO UPDATE SET
                    title=excluded.title,
                    lead=excluded.lead,
                    body=excluded.body,
                    author=excluded.author,
                    published_at=excluded.published_at,
                    modified_at=excluded.modified_at,
                    section=excluded.section,
                    tags=excluded.tags,
                    press_title=excluded.press_title,
                    domain=excluded.domain,
                    region=excluded.region,
                    raw_html_hash=excluded.raw_html_hash,
                    is_duplicate=excluded.is_duplicate,
                    duplicate_cluster_id=excluded.duplicate_cluster_id,
                    original_article_url=excluded.original_article_url;
            """, (
                a.canonical_url, a.title, a.lead, a.body, a.author,
                a.published_at.isoformat(),
                a.modified_at.isoformat() if a.modified_at else None,
                a.section, json.dumps(a.tags), a.press_title, a.domain, a.region,
                a.raw_html_hash, 1 if a.is_duplicate else 0,
                a.duplicate_cluster_id, a.original_article_url,
                a.created_at.isoformat(),
            ))

    def get_article(self, canonical_url: str) -> Optional[Article]:
        cur = self.conn.execute("SELECT * FROM articles WHERE canonical_url = ?", (canonical_url,))
        r = cur.fetchone()
        if not r:
            return None
        return Article(
            canonical_url=r["canonical_url"],
            title=r["title"],
            lead=r["lead"],
            body=r["body"],
            author=r["author"],
            published_at=datetime.fromisoformat(r["published_at"]),
            modified_at=datetime.fromisoformat(r["modified_at"]) if r["modified_at"] else None,
            section=r["section"],
            tags=json.loads(r["tags"]),
            press_title=r["press_title"],
            domain=r["domain"],
            region=r["region"],
            raw_html_hash=r["raw_html_hash"],
            is_duplicate=bool(r["is_duplicate"]),
            duplicate_cluster_id=r["duplicate_cluster_id"],
            original_article_url=r["original_article_url"],
            created_at=datetime.fromisoformat(r["created_at"]),
        )

    def get_all_articles(self) -> List[Article]:
        cur = self.conn.execute("SELECT * FROM articles ORDER BY published_at DESC")
        rows = cur.fetchall()
        result = []
        for r in rows:
            result.append(
                Article(
                    canonical_url=r["canonical_url"],
                    title=r["title"],
                    lead=r["lead"],
                    body=r["body"],
                    author=r["author"],
                    published_at=datetime.fromisoformat(r["published_at"]),
                    modified_at=datetime.fromisoformat(r["modified_at"]) if r["modified_at"] else None,
                    section=r["section"],
                    tags=json.loads(r["tags"]),
                    press_title=r["press_title"],
                    domain=r["domain"],
                    region=r["region"],
                    raw_html_hash=r["raw_html_hash"],
                    is_duplicate=bool(r["is_duplicate"]),
                    duplicate_cluster_id=r["duplicate_cluster_id"],
                    original_article_url=r["original_article_url"],
                    created_at=datetime.fromisoformat(r["created_at"]),
                )
            )
        return result

    # 3. Classifications
    def save_classification(self, c: ClassificationResult) -> None:
        with self.conn:
            self.conn.execute("""
                INSERT INTO classifications (
                    canonical_url, primary_topic, secondary_topics, confidence,
                    model_version, prompt_version, taxonomy_version, classified_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(canonical_url) DO UPDATE SET
                    primary_topic=excluded.primary_topic,
                    secondary_topics=excluded.secondary_topics,
                    confidence=excluded.confidence,
                    model_version=excluded.model_version,
                    prompt_version=excluded.prompt_version,
                    taxonomy_version=excluded.taxonomy_version,
                    classified_at=excluded.classified_at;
            """, (
                c.canonical_url, c.primary_topic, json.dumps(c.secondary_topics),
                c.confidence, c.model_version, c.prompt_version,
                c.taxonomy_version, c.classified_at.isoformat(),
            ))

    def get_classification(self, canonical_url: str) -> Optional[ClassificationResult]:
        cur = self.conn.execute("SELECT * FROM classifications WHERE canonical_url = ?", (canonical_url,))
        r = cur.fetchone()
        if not r:
            return None
        return ClassificationResult(
            canonical_url=r["canonical_url"],
            primary_topic=r["primary_topic"],
            secondary_topics=json.loads(r["secondary_topics"]),
            confidence=r["confidence"],
            model_version=r["model_version"],
            prompt_version=r["prompt_version"],
            taxonomy_version=r["taxonomy_version"],
            classified_at=datetime.fromisoformat(r["classified_at"]),
        )

    def get_all_classifications(self) -> Dict[str, ClassificationResult]:
        cur = self.conn.execute("SELECT * FROM classifications")
        rows = cur.fetchall()
        result = {}
        for r in rows:
            res = ClassificationResult(
                canonical_url=r["canonical_url"],
                primary_topic=r["primary_topic"],
                secondary_topics=json.loads(r["secondary_topics"]),
                confidence=r["confidence"],
                model_version=r["model_version"],
                prompt_version=r["prompt_version"],
                taxonomy_version=r["taxonomy_version"],
                classified_at=datetime.fromisoformat(r["classified_at"]),
            )
            result[res.canonical_url] = res
        return result

    # 4. Duplicate Clusters
    def save_duplicate_cluster(self, cl: DuplicateCluster) -> None:
        with self.conn:
            self.conn.execute("""
                INSERT INTO duplicate_clusters (
                    cluster_id, original_url, original_published_at,
                    original_title, original_press_title, duplicate_count, member_urls
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(cluster_id) DO UPDATE SET
                    original_url=excluded.original_url,
                    original_published_at=excluded.original_published_at,
                    original_title=excluded.original_title,
                    original_press_title=excluded.original_press_title,
                    duplicate_count=excluded.duplicate_count,
                    member_urls=excluded.member_urls;
            """, (
                cl.cluster_id, cl.original_url, cl.original_published_at.isoformat(),
                cl.original_title, cl.original_press_title, cl.duplicate_count,
                json.dumps(cl.member_urls),
            ))

    def get_duplicate_cluster(self, cluster_id: str) -> Optional[DuplicateCluster]:
        cur = self.conn.execute("SELECT * FROM duplicate_clusters WHERE cluster_id = ?", (cluster_id,))
        r = cur.fetchone()
        if not r:
            return None
        return DuplicateCluster(
            cluster_id=r["cluster_id"],
            original_url=r["original_url"],
            original_published_at=datetime.fromisoformat(r["original_published_at"]),
            original_title=r["original_title"],
            original_press_title=r["original_press_title"],
            duplicate_count=r["duplicate_count"],
            member_urls=json.loads(r["member_urls"]),
        )
