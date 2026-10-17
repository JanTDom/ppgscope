from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class TopicDefinition(BaseModel):
    """Definition of an individual topic in the taxonomy."""
    id: str = Field(..., description="Unique machine key (e.g. POLITYKA, GOSPODARKA)")
    name: str = Field(..., description="Human-readable Polish label")
    description: str = Field(..., description="Scope and thematic boundaries of the category")
    keywords: List[str] = Field(default_factory=list, description="Indicative lexical cues")


class ClassificationResult(BaseModel):
    """
    Topic classification output for an article with provenance metadata.
    Enforces primary topic, up to 2 secondary topics, confidence score and INNE/NIEOKREŚLONE fallback.
    """
    canonical_url: str = Field(..., description="Target article canonical URL")
    primary_topic: str = Field(..., description="Primary topic identifier or INNE/NIEOKREŚLONE")
    secondary_topics: List[str] = Field(default_factory=list, max_length=2, description="Up to 2 secondary topics")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    
    # Audit trail
    model_version: str = Field(..., description="Model identifier or classifier version")
    prompt_version: Optional[str] = Field(default=None, description="Prompt version if LLM classifier was used")
    taxonomy_version: str = Field(..., description="Taxonomy schema version (e.g. 1.0.0)")
    classified_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of classification"
    )
