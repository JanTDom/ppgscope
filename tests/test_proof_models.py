import pytest
from datetime import datetime, timezone
from ppgscope.models.proof import MetricProof, MetricStatus


def test_metric_proof_creation():
    proof = MetricProof(
        value=42.5,
        status=MetricStatus.POMIAR,
        source="connector-ppg-web",
        sample_size=100,
        methodology_version="v1.0.0",
    )
    assert proof.value == 42.5
    assert proof.status == "POMIAR"
    assert proof.source == "connector-ppg-web"
    assert proof.sample_size == 100
    assert proof.methodology_version == "v1.0.0"


def test_metric_proof_statistical():
    proof = MetricProof(
        value=15.2,
        status=MetricStatus.PRZYBLIZENIE,
        source="trend-engine",
        p_value=0.012,
        is_significant=True,
    )
    assert proof.status == "PRZYBLIŻENIE"
    assert proof.p_value == 0.012
    assert proof.is_significant is True
