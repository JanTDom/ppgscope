from enum import Enum
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict


class AccessTier(str, Enum):
    DARMOWY = "DARMOWY"         # Public free feeds / web
    PLATNY = "PŁATNY"           # Paid third-party media monitoring / APIs
    WEWNETRZNY = "WEWNĘTRZNY"   # Internal PPG systems (GA4, Search Console, Gemius)


class HealthStatus(str, Enum):
    DZIALA = "DZIAŁA"
    BLAD = "BŁĄD"
    ZABLOKOWANE = "ZABLOKOWANE"
    WYLACZONE = "WYŁĄCZONE"


class HealthCheckResult(BaseModel):
    """Output of a connector health check probe."""
    model_config = ConfigDict(use_enum_values=True)

    status: HealthStatus = Field(..., description="Operating status of the connector")
    message: str = Field(..., description="Explanatory status message in Polish")
    checked_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of probe execution"
    )
    latency_ms: Optional[float] = Field(default=None, description="Roundtrip latency in milliseconds")
    details: Optional[dict] = Field(default=None, description="Optional diagnostic data")


class ConnectorInfo(BaseModel):
    """Metadata describing a registered connector module."""
    model_config = ConfigDict(use_enum_values=True)

    id: str = Field(..., description="Unique connector identifier")
    name: str = Field(..., description="Human-readable name")
    access_tier: AccessTier = Field(..., description="DARMOWY, PŁATNY, WEWNĘTRZNY")
    measured_metrics: List[str] = Field(..., description="List of metrics delivered by connector")
    frequency: str = Field(..., description="Update cadence (e.g. co 15 minut, codziennie)")
    reliability_score: float = Field(..., ge=0.0, le=1.0, description="Estimated reliability index 0.0 to 1.0")
    is_enabled: bool = Field(default=True, description="Whether connector is activated in current environment")
    disabled_reason: Optional[str] = Field(default=None, description="Reason if connector is disabled (e.g. missing API key)")
    last_health_check: Optional[HealthCheckResult] = Field(default=None, description="Latest health check status")
