from enum import Enum
from typing import Any, Optional, Dict
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict


class MetricStatus(str, Enum):
    POMIAR = "POMIAR"           # Direct measurement / count
    PRZYBLIZENIE = "PRZYBLIŻENIE"  # Statistical estimation / sample calculation
    SZACUNEK = "SZACUNEK"       # Algorithmic estimate / prediction


class MetricProof(BaseModel):
    """
    Provenance and evidentiary foundation for every single number presented in PPGscope.
    Guarantees that no metric can exist without proof, source, timestamp and methodology.
    """
    model_config = ConfigDict(use_enum_values=True)

    value: Any = Field(..., description="The calculated or measured value (number, percentage, or boolean)")
    status: MetricStatus = Field(..., description="Measurement rigor status: POMIAR, PRZYBLIŻENIE, SZACUNEK")
    source: str = Field(..., description="Identifier of the connector or data source responsible for the measurement")
    measured_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when the metric was calculated or recorded"
    )
    sample_size: int = Field(default=1, ge=0, description="Number of underlying data points (N) in this measurement")
    methodology_version: str = Field(default="v1.0.0", description="Version of the calculation formula or rule")
    p_value: Optional[float] = Field(default=None, description="Statistical p-value if metric involves hypothesis testing")
    is_significant: Optional[bool] = Field(default=None, description="Whether the trend or difference is statistically significant")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional auditing metadata or test parameters")

