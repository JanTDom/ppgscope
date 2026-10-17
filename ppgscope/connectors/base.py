from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime, timezone

from ppgscope.models.connector import ConnectorInfo, AccessTier, HealthCheckResult, HealthStatus


class BaseConnector(ABC):
    """
    Standard interface for all PPGscope data connectors.
    Enforces uniform metadata, access tiers, and health check diagnostics.
    """

    @property
    @abstractmethod
    def id(self) -> str:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def access_tier(self) -> AccessTier:
        pass

    @property
    @abstractmethod
    def measured_metrics(self) -> List[str]:
        pass

    @property
    @abstractmethod
    def frequency(self) -> str:
        pass

    @property
    @abstractmethod
    def reliability(self) -> float:
        pass

    @property
    @abstractmethod
    def is_enabled(self) -> bool:
        pass

    @property
    @abstractmethod
    def disabled_reason(self) -> Optional[str]:
        pass

    @abstractmethod
    def health_check(self) -> HealthCheckResult:
        """Executes a diagnostic probe to verify endpoint reachability and validity."""
        pass

    def get_info(self) -> ConnectorInfo:
        return ConnectorInfo(
            id=self.id,
            name=self.name,
            access_tier=self.access_tier,
            measured_metrics=self.measured_metrics,
            frequency=self.frequency,
            reliability_score=self.reliability,
            is_enabled=self.is_enabled,
            disabled_reason=self.disabled_reason,
            last_health_check=None,
        )
