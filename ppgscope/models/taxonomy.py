from typing import List, Optional, Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class TopicDefinition(BaseModel):
    """Definition of an individual topic in taxonomy v1 (deprecated)."""
    id: str = Field(..., description="Unique machine key (e.g. POLITYKA, GOSPODARKA)")
    name: str = Field(..., description="Human-readable Polish label")
    description: str = Field(..., description="Scope and thematic boundaries of the category")
    keywords: List[str] = Field(default_factory=list, description="Indicative lexical cues")


class DomainDefinition(BaseModel):
    """Definition of an individual domain in taxonomy v2 (18 domains)."""
    slug: str = Field(..., description="Unique slug (e.g. wladza, zdarzenia, obronnosc)")
    code: str = Field(..., description="Two-digit code (e.g. 01, 02)")
    name: str = Field(..., description="Human-readable Polish label")
    description: str = Field(..., description="Scope and thematic boundaries")
    allowed_localities: List[Literal["C", "CL", "L"]] = Field(
        default_factory=lambda: ["C", "CL", "L"],
        description="Allowed locality variants"
    )


class ClassificationResult(BaseModel):
    """
    Topic classification output for an article with provenance metadata.
    Supports Taxonomy v2 (domain, locality, other_region, domain_secondary, needs_review)
    while maintaining backward compatibility for legacy primary_topic.
    """
    canonical_url: str = Field(..., description="Target article canonical URL")
    
    # Taxonomy v2 Fields
    domain: str = Field(default="wladza", description="Primary domain slug (one of 18 domains)")
    locality: Literal["C", "CL", "L"] = Field(default="C", description="Locality variant: C, CL, L")
    domain_secondary: Optional[str] = Field(default=None, description="Max 1 secondary domain slug")
    other_region: bool = Field(default=False, description="True if article is about another PPG title's region")
    needs_review: bool = Field(default=False, description="True if confidence < 0.6")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")

    # Legacy Taxonomy v1 Fields (Deprecated - preserved for backward compatibility)
    primary_topic: str = Field(default="INNE/NIEOKREŚLONE", description="[DEPRECATED] Legacy primary topic identifier")
    secondary_topics: List[str] = Field(default_factory=list, max_length=2, description="[DEPRECATED] Up to 2 secondary topics")

    # Audit trail
    model_version: str = Field(..., description="Model identifier or classifier version")
    prompt_version: Optional[str] = Field(default=None, description="Prompt version if LLM classifier was used")
    taxonomy_version: str = Field(default="2.0.0", description="Taxonomy schema version (e.g. 2.0.0)")
    classified_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of classification"
    )
