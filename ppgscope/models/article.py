from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field, HttpUrl
import hashlib


class Article(BaseModel):
    """
    Representation of an ingested editorial article from Polska Press Grupa.
    Uses canonical URL as the immutable identity key.
    """
    canonical_url: str = Field(..., description="Canonical URL (rel=canonical) acting as unique primary key")
    title: str = Field(..., description="Headline of the article")
    lead: Optional[str] = Field(default=None, description="Editorial lead / summary text")
    body: str = Field(..., description="Clean text content of the article body")
    author: Optional[str] = Field(default=None, description="Author / journalist name if published")
    published_at: datetime = Field(..., description="Publication timestamp")
    modified_at: Optional[datetime] = Field(default=None, description="Last modification timestamp")
    section: Optional[str] = Field(default=None, description="Editorial section / category breadcrumb")
    tags: List[str] = Field(default_factory=list, description="Editorial tags associated with the article")
    press_title: str = Field(..., description="Name of the press title (e.g. Gazeta Krakowska)")
    domain: str = Field(..., description="Domain name (e.g. gazetakrakowska.pl)")
    region: Optional[str] = Field(default=None, description="Voivodeship or regional scope")
    raw_html_hash: str = Field(..., description="SHA-256 hash of raw HTML payload for audit and provenance")
    
    # Deduplication and syndicate text metadata
    is_duplicate: bool = Field(default=False, description="True if marked as syndicate / shared copy (TEKST WSPÓLNY)")
    duplicate_cluster_id: Optional[str] = Field(default=None, description="Cluster identifier grouping identical publications")
    original_article_url: Optional[str] = Field(default=None, description="Canonical URL of the first published instance")

    # Monetization, SEO bait & editorial provenance signals (free external HTML extraction)
    is_paywalled: bool = Field(default=False, description="True if locked behind PPG Strefa Plus paywall")
    is_sponsored: bool = Field(default=False, description="True if labeled as commercial / partner / sponsored material")
    is_discover_bait: bool = Field(default=False, description="True if structured as Google Discover / SEO evergreen bait")
    byline_type: str = Field(default="anonymous", description="Authorship type: named, anonymous, wire, partner")
    comments_count: int = Field(default=0, ge=0, description="Public comments count extracted from page metadata")
    local_institutions_quoted: List[str] = Field(
        default_factory=list,
        description="Local institutions, mayors, councils or emergency services quoted in the text"
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Ingestion timestamp in PPGscope"
    )

    @staticmethod
    def calculate_hash(raw_content: str | bytes) -> str:
        """Calculates deterministic SHA-256 hash of raw payload for audit trails."""
        if isinstance(raw_content, str):
            raw_content = raw_content.encode("utf-8")
        return hashlib.sha256(raw_content).hexdigest()

