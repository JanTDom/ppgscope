from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from ppgscope.models.proof import MetricProof


class TrendDirection(str, Enum):
    WZROST = "WZROST"
    SPADEK = "SPADEK"
    STABILNY = "STABILNY"
    BRAK_DANYCH = "BRAK_DANYCH"


class PeriodType(str, Enum):
    DAY = "day"
    ISO_WEEK = "week"
    MONTH = "month"


class TrendResult(BaseModel):
    """
    Topic or title trend calculation with two-proportion hypothesis testing and FDR correction.
    Highlights relative shares (% of production) rather than raw totals, while presenting counts alongside.
    """
    model_config = ConfigDict(use_enum_values=True)

    topic_id: str = Field(..., description="Topic identifier")
    title_id: Optional[str] = Field(default=None, description="Specific title ID, or None for whole group")
    period_type: PeriodType = Field(..., description="Aggregation cadence: day, week, month")
    
    current_period: str = Field(..., description="Identifier of current period (e.g. 2026-W41)")
    previous_period: str = Field(..., description="Identifier of previous comparison period (e.g. 2026-W40)")
    
    # Counts and proportions
    current_topic_count: int = Field(..., ge=0, description="Articles on topic in current period")
    current_total_count: int = Field(..., ge=0, description="Total articles in current period")
    current_share: float = Field(..., ge=0.0, le=1.0, description="Current topic share as proportion of total (0.0 to 1.0)")
    
    previous_topic_count: int = Field(..., ge=0, description="Articles on topic in previous period")
    previous_total_count: int = Field(..., ge=0, description="Total articles in previous period")
    previous_share: float = Field(..., ge=0.0, le=1.0, description="Previous topic share as proportion of total (0.0 to 1.0)")
    
    absolute_share_change: float = Field(..., description="Percentage points difference (current_share - previous_share)")
    relative_change: Optional[float] = Field(default=None, description="Relative growth rate ((current - previous)/previous)")
    
    # Statistical significance
    z_score: Optional[float] = Field(default=None, description="Calculated two-proportion z-statistic")
    p_value: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Raw p-value from two-proportion test")
    is_significant_raw: bool = Field(default=False, description="Significant at unadjusted alpha=0.05")
    is_significant_fdr: bool = Field(default=False, description="Significant after Benjamini-Hochberg FDR correction")
    
    direction: TrendDirection = Field(..., description="Final trend verdict: WZROST, SPADEK, STABILNY, BRAK_DANYCH")
    proof: MetricProof = Field(..., description="Evidentiary proof attached to this trend metric")
