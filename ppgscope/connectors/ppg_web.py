import time
from typing import List, Optional
from datetime import datetime, timezone
import httpx

from ppgscope.models.connector import AccessTier, HealthCheckResult, HealthStatus
from ppgscope.connectors.base import BaseConnector
from ppgscope.ingest.client import PoliteHttpClient


class PPGWebPublicConnector(BaseConnector):
    """
    Primary free and public data connector.
    Ingests editorial content, Google News sitemaps and RSS feeds across verified PPG domains.
    """

    def __init__(self, probe_url: str = "https://gazetakrakowska.pl/robots.txt"):
        self.probe_url = probe_url
        self.http_client = PoliteHttpClient()

    @property
    def id(self) -> str:
        return "connector-ppg-web-public"

    @property
    def name(self) -> str:
        return "PPG Public Web & RSS (Darmowy)"

    @property
    def access_tier(self) -> AccessTier:
        return AccessTier.DARMOWY

    @property
    def measured_metrics(self) -> List[str]:
        return [
            "Liczba opublikowanych artykułów",
            "Struktura tematyczna publikacji",
            "Odsetek tekstów wspólnych (przedruki syndykatowe)",
            "Dynamika i trendy publikacji w czasie",
            "Audyt żywotności i unikalności 546 portali (Czynne vs Syndykaty vs Martwe)",
            "Radar czołówek (ekspozycja na stronach głównych vs masówka z sitemapy)",
            "Śledzenie zmian nagłówków (A/B), cichych edycji i usunięć (Tombstone 404/410)",
            "Detekcja paywalla (Strefa Plus), tekstów sponsorowanych i przynęt Google Discover",
            "Mapa białych plam powiatowych (TERYT) i puls kadr redakcyjnych",
        ]

    @property
    def frequency(self) -> str:
        return "Cyklicznie co 15 minut"

    @property
    def reliability(self) -> float:
        return 0.95

    @property
    def is_enabled(self) -> bool:
        return True

    @property
    def disabled_reason(self) -> Optional[str]:
        return None

    def health_check(self) -> HealthCheckResult:
        t0 = time.time()
        try:
            resp = self.http_client.get(self.probe_url)
            latency = round((time.time() - t0) * 1000.0, 1)

            if resp.status_code == 200:
                return HealthCheckResult(
                    status=HealthStatus.DZIALA,
                    message="Połączenie aktywne, nagłówki i sitemapy dostępne (HTTP 200)",
                    latency_ms=latency,
                    details={"probe_url": self.probe_url, "status_code": resp.status_code},
                )
            else:
                return HealthCheckResult(
                    status=HealthStatus.BLAD,
                    message=f"Błąd odpowiedzi serwera PPG (HTTP {resp.status_code})",
                    latency_ms=latency,
                    details={"probe_url": self.probe_url, "status_code": resp.status_code},
                )
        except Exception as e:
            latency = round((time.time() - t0) * 1000.0, 1)
            return HealthCheckResult(
                status=HealthStatus.BLAD,
                message=f"Błąd komunikacji sieciowej: {str(e)}",
                latency_ms=latency,
                details={"error": str(e)},
            )
