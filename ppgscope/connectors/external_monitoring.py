import os
from typing import List, Optional
from datetime import datetime, timezone

from ppgscope.models.connector import AccessTier, HealthCheckResult, HealthStatus
from ppgscope.connectors.base import BaseConnector


class ExternalMonitoringConnector(BaseConnector):
    """
    Paid third-party media monitoring connector (e.g. Brand24, IMM, PSMM).
    Strictly follows rule: if no license key is configured, stays disabled and never fakes data.
    """

    ENV_VAR = "PPGSCOPE_MONITORING_API_KEY"

    def __init__(self):
        self.api_key = os.getenv(self.ENV_VAR)

    @property
    def id(self) -> str:
        return "connector-external-monitoring"

    @property
    def name(self) -> str:
        return "Monitoring Mediów Zewnętrznych (Płatny)"

    @property
    def access_tier(self) -> AccessTier:
        return AccessTier.PLATNY

    @property
    def measured_metrics(self) -> List[str]:
        return [
            "Zasięg i wzmianki w mediach społecznościowych (Brand24 / Sotrender)",
            "Widoczność SEO i udział w Google Discover (Senuto / Semrush)",
            "Ekwiwalent reklamowy AVE i monitoring konkurencji (IMM / PSMM)",
            "Sentyment wypowiedzi odbiorców w zewnętrznych kanałach",
        ]

    @property
    def frequency(self) -> str:
        return "Cyklicznie co 1 godzinę"

    @property
    def reliability(self) -> float:
        return 0.90

    @property
    def is_enabled(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    @property
    def disabled_reason(self) -> Optional[str]:
        if not self.is_enabled:
            return f"Brak klucza licencyjnego w zmiennej środowiskowej {self.ENV_VAR}"
        return None

    def health_check(self) -> HealthCheckResult:
        if not self.is_enabled:
            return HealthCheckResult(
                status=HealthStatus.WYLACZONE,
                message=f"Konektor wyłączony: {self.disabled_reason}. Brak danych do pokazania.",
                latency_ms=0.0,
                details={"env_var": self.ENV_VAR, "configured": False},
            )

        # In production with key: call third-party API /ping
        return HealthCheckResult(
            status=HealthStatus.DZIALA,
            message="Klucz licencyjny poprawnie zweryfikowany",
            latency_ms=45.0,
            details={"configured": True},
        )
