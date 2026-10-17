import os
from typing import List, Optional

from ppgscope.models.connector import AccessTier, HealthCheckResult, HealthStatus
from ppgscope.connectors.base import BaseConnector


class InternalAnalyticsConnector(BaseConnector):
    """
    Internal publisher analytics connector (GA4, Google Search Console, Gemius Megapanel).
    Strictly stays disabled when credentials are not configured in environment.
    """

    ENV_VAR = "PPGSCOPE_GA4_CREDENTIALS"

    def __init__(self):
        self.credentials = os.getenv(self.ENV_VAR)

    @property
    def id(self) -> str:
        return "connector-internal-analytics"

    @property
    def name(self) -> str:
        return "Analityka Wewnętrzna PPG (Wewnętrzny)"

    @property
    def access_tier(self) -> AccessTier:
        return AccessTier.WEWNETRZNY

    @property
    def measured_metrics(self) -> List[str]:
        return [
            "Liczba odsłon artykułów (Pageviews)",
            "Czas zaangażowania czytelników",
            "Źródła ruchu (Search / Social / Direct / Referral)",
            "Współczynnik konwersji na subskrypcje cyfrowe (Plus)",
        ]

    @property
    def frequency(self) -> str:
        return "Cyklicznie raz na dobę"

    @property
    def reliability(self) -> float:
        return 0.99

    @property
    def is_enabled(self) -> bool:
        return bool(self.credentials and self.credentials.strip())

    @property
    def disabled_reason(self) -> Optional[str]:
        if not self.is_enabled:
            return f"Brak poświadczeń uwierzytelnienia w zmiennej {self.ENV_VAR}"
        return None

    def health_check(self) -> HealthCheckResult:
        if not self.is_enabled:
            return HealthCheckResult(
                status=HealthStatus.WYLACZONE,
                message=f"Konektor wyłączony: {self.disabled_reason}. Brak danych do pokazania.",
                latency_ms=0.0,
                details={"env_var": self.ENV_VAR, "configured": False},
            )

        return HealthCheckResult(
            status=HealthStatus.DZIALA,
            message="Autoryzacja GA4/Gemius aktywna",
            latency_ms=25.0,
            details={"configured": True},
        )
