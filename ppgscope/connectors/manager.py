from typing import List, Dict
from datetime import datetime, timezone

from ppgscope.models.connector import ConnectorInfo, HealthCheckResult
from ppgscope.models.proof import MetricProof, MetricStatus
from ppgscope.connectors.base import BaseConnector
from ppgscope.connectors.ppg_web import PPGWebPublicConnector
from ppgscope.connectors.external_monitoring import ExternalMonitoringConnector
from ppgscope.connectors.internal_analytics import InternalAnalyticsConnector


class ConnectorManager:
    """
    Registry and supervisor for all data connectors.
    Calculates composite coverage indicators (e.g. '1 z 3 konektorów aktywny').
    """

    def __init__(self, connectors: List[BaseConnector] = None):
        if connectors is None:
            self.connectors = [
                PPGWebPublicConnector(),
                ExternalMonitoringConnector(),
                InternalAnalyticsConnector(),
            ]
        else:
            self.connectors = connectors

    def list_connectors(self) -> List[BaseConnector]:
        return self.connectors

    def get_connector(self, connector_id: str) -> BaseConnector | None:
        for c in self.connectors:
            if c.id == connector_id:
                return c
        return None

    def run_all_health_checks(self) -> Dict[str, HealthCheckResult]:
        """Runs health checks across all registered connectors."""
        results = {}
        for c in self.connectors:
            results[c.id] = c.health_check()
        return results

    def get_coverage_metric(self) -> MetricProof:
        """
        Calculates composite data coverage metric.
        Example: '1 z 3 konektorów aktywny (33%)'
        """
        total = len(self.connectors)
        active = sum(1 for c in self.connectors if c.is_enabled)
        pct = round((active / total) * 100.0, 1) if total > 0 else 0.0

        return MetricProof(
            value=f"{active} z {total} ({pct}%)",
            status=MetricStatus.POMIAR,
            source="ppgscope-connector-manager",
            measured_at=datetime.now(timezone.utc),
            sample_size=total,
            methodology_version="v1.0.0 (Data coverage index)",
            details={
                "total_connectors": total,
                "active_connectors": active,
                "percentage": pct,
                "active_list": [c.name for c in self.connectors if c.is_enabled],
                "inactive_list": [
                    {"name": c.name, "reason": c.disabled_reason}
                    for c in self.connectors
                    if not c.is_enabled
                ],
            },
        )
