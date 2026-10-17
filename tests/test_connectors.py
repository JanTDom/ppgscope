import pytest
from ppgscope.connectors.ppg_web import PPGWebPublicConnector
from ppgscope.connectors.external_monitoring import ExternalMonitoringConnector
from ppgscope.connectors.internal_analytics import InternalAnalyticsConnector
from ppgscope.connectors.manager import ConnectorManager
from ppgscope.models.connector import AccessTier, HealthStatus


def test_ppg_web_connector_attributes():
    conn = PPGWebPublicConnector()
    assert conn.access_tier == AccessTier.DARMOWY
    assert conn.is_enabled is True
    assert conn.disabled_reason is None
    assert "Liczba opublikowanych artykułów" in conn.measured_metrics


def test_external_monitoring_connector_disabled_by_default():
    conn = ExternalMonitoringConnector()
    assert conn.access_tier == AccessTier.PLATNY
    # Without API key, connector is strictly disabled
    assert conn.is_enabled is False
    assert "Brak klucza licencyjnego" in conn.disabled_reason
    
    check = conn.health_check()
    assert check.status == HealthStatus.WYLACZONE
    assert "Konektor wyłączony" in check.message


def test_internal_analytics_connector_disabled_by_default():
    conn = InternalAnalyticsConnector()
    assert conn.access_tier == AccessTier.WEWNETRZNY
    assert conn.is_enabled is False
    assert "Brak poświadczeń uwierzytelnienia" in conn.disabled_reason

    check = conn.health_check()
    assert check.status == HealthStatus.WYLACZONE


def test_connector_manager_coverage_metric():
    mgr = ConnectorManager()
    coverage = mgr.get_coverage_metric()

    assert coverage.status == "POMIAR"
    assert coverage.sample_size == 3
    # 1 active out of 3 total (33.3%)
    assert "1 z 3" in str(coverage.value)
    assert coverage.details["active_connectors"] == 1
    assert coverage.details["total_connectors"] == 3
