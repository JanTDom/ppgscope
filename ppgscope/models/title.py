from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class MediaTitle(BaseModel):
    """
    Representation of a registered PPG newspaper title, national portal or thematic vertical.
    """
    id: str = Field(..., description="Unique slug identifier (e.g. gazeta-krakowska)")
    name: str = Field(..., description="Official title name (e.g. Gazeta Krakowska)")
    domain: str = Field(..., description="Apex domain (e.g. gazetakrakowska.pl)")
    region: str = Field(..., description="Geographical scope or voivodeship")
    type: str = Field(..., description="Type of outlet: regional_daily, national_portal, vertical, local_network")
    status: str = Field(default="DZIAŁA", description="Health status: DZIAŁA, BŁĄD, ZABLOKOWANE")
    error_reason: Optional[str] = Field(default=None, description="Detailed explanation if status is BŁĄD or ZABLOKOWANE")
    robots_url: str = Field(..., description="URL to robots.txt")
    google_news_sitemap: Optional[str] = Field(default=None, description="URL to news sitemap")
    sitemap_url: Optional[str] = Field(default=None, description="URL to master sitemap")
    rss_url: Optional[str] = Field(default=None, description="URL to main RSS feed")
    last_success_at: Optional[datetime] = Field(default=None, description="Timestamp of last successful ingestion")
    fetched_records_count: int = Field(default=0, ge=0, description="Total ingested articles from this title")
