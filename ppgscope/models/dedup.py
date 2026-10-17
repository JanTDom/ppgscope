from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class DuplicateCluster(BaseModel):
    """
    Cluster grouping identical or near-identical articles republished across PPG outlets.
    Identifies the earliest published article as original canonical source.
    """
    cluster_id: str = Field(..., description="Unique cluster identifier (hash or UUID)")
    original_url: str = Field(..., description="Canonical URL of the first published instance")
    original_published_at: datetime = Field(..., description="Publication time of the earliest instance")
    original_title: str = Field(..., description="Title of original article")
    original_press_title: str = Field(..., description="Title of the press outlet that published first")
    duplicate_count: int = Field(default=0, ge=0, description="Number of syndicated secondary republishings")
    member_urls: List[str] = Field(default_factory=list, description="All canonical URLs belonging to this cluster")
    minhash_signature: Optional[List[int]] = Field(default=None, description="MinHash signature used for cluster linkage")
