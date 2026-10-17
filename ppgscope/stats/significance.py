import math
from typing import List, Tuple, Optional
from pydantic import BaseModel


class TestInput(BaseModel):
    id: str
    x_curr: int      # Count of topic in current period
    n_curr: int      # Total articles in current period
    x_prev: int      # Count of topic in previous period
    n_prev: int      # Total articles in previous period


class TestOutput(BaseModel):
    id: str
    p_curr: float
    p_prev: float
    diff: float
    z_score: Optional[float]
    p_value: Optional[float]
    is_significant_raw: bool
    is_significant_fdr: bool
    direction: str   # WZROST, SPADEK, STABILNY, BRAK_DANYCH


class TwoProportionZTest:
    """
    Two-proportion hypothesis test for differences between proportions across two independent periods.
    Uses pooled proportion standard error and two-tailed standard normal CDF.
    """

    @staticmethod
    def _normal_cdf(z: float) -> float:
        """Approximates standard normal cumulative distribution function using error function."""
        return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))

    @classmethod
    def test(
        cls,
        x1: int,
        n1: int,
        x2: int,
        n2: int,
        min_sample_size: int = 10,
        alpha: float = 0.05,
    ) -> Tuple[Optional[float], Optional[float], bool]:
        """
        Calculates (z_score, p_value, is_significant_raw).
        Returns (None, None, False) if minimum sample size constraint is not met.
        """
        if n1 < min_sample_size or n2 < min_sample_size:
            return None, None, False

        p1 = x1 / n1
        p2 = x2 / n2

        # Check edge cases
        if p1 == p2:
            return 0.0, 1.0, False

        # Pooled sample proportion
        pooled_p = (x1 + x2) / (n1 + n2)

        if pooled_p == 0.0 or pooled_p == 1.0:
            return 0.0, 1.0, False

        se = math.sqrt(pooled_p * (1.0 - pooled_p) * (1.0 / n1 + 1.0 / n2))
        if se == 0.0:
            return 0.0, 1.0, False

        z = (p1 - p2) / se
        # Two-tailed p-value: 2 * (1 - CDF(|z|))
        p_val = 2.0 * (1.0 - cls._normal_cdf(abs(z)))
        p_val = max(0.0, min(1.0, p_val))

        is_sig = p_val < alpha
        return round(z, 4), round(p_val, 5), is_sig


class BenjaminiHochberg:
    """
    Controls False Discovery Rate (FDR) across multiple hypothesis testing comparisons.
    """

    @classmethod
    def adjust(cls, p_values: List[float], fdr_q: float = 0.05) -> List[bool]:
        """
        Applies Benjamini-Hochberg procedure.
        Returns boolean mask indicating FDR-significant discoveries.
        """
        m = len(p_values)
        if m == 0:
            return []

        # Pair each p-value with its original index
        indexed_p = sorted(enumerate(p_values), key=lambda x: (x[1] if x[1] is not None else 1.0))
        
        significant_indices = set()
        max_k = -1

        for rank_1_based, (orig_idx, p) in enumerate(indexed_p, start=1):
            if p is None:
                continue
            threshold = (rank_1_based / m) * fdr_q
            if p <= threshold:
                max_k = rank_1_based

        if max_k > 0:
            for rank_1_based in range(1, max_k + 1):
                orig_idx, _ = indexed_p[rank_1_based - 1]
                significant_indices.add(orig_idx)

        return [i in significant_indices for i in range(m)]
