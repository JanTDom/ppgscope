from typing import List, Dict, Optional, Literal
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from collections import defaultdict

from ppgscope.models.article import Article
from ppgscope.models.taxonomy import ClassificationResult
from ppgscope.models.trend import TrendResult, TrendDirection, PeriodType
from ppgscope.models.proof import MetricProof, MetricStatus
from ppgscope.stats.significance import TwoProportionZTest, BenjaminiHochberg


WARSAW_TZ = ZoneInfo("Europe/Warsaw")


class TrendCalculator:
    """
    Computes topic production shares and statistical trends between consecutive periods.
    Supports dual variant:
    - 'ALL': Entire production (including syndicate / shared texts)
    - 'OWN': Exclusive original reporting only (filtering out duplicates)
    """

    def __init__(self, min_sample_size: int = 10, alpha: float = 0.05, fdr_q: float = 0.05):
        self.min_sample_size = min_sample_size
        self.alpha = alpha
        self.fdr_q = fdr_q

    @staticmethod
    def get_period_key(dt: datetime, period_type: PeriodType) -> str:
        """Converts datetime to period identifier in Europe/Warsaw timezone."""
        localized = dt.astimezone(WARSAW_TZ)
        if period_type == PeriodType.DAY:
            return localized.strftime("%Y-%m-%d")
        elif period_type == PeriodType.ISO_WEEK:
            year, week, _ = localized.isocalendar()
            return f"{year}-W{week:02d}"
        elif period_type == PeriodType.MONTH:
            return localized.strftime("%Y-%m")
        return localized.strftime("%Y-%m-%d")

    def calculate_topic_distribution(
        self,
        articles: List[Article],
        classifications: Dict[str, ClassificationResult],
        variant: Literal["ALL", "OWN"] = "ALL",
        title_filter: Optional[str] = None,
    ) -> Dict[str, int]:
        """Calculates topic counts for the selected cohort."""
        counts = defaultdict(int)
        for a in articles:
            if title_filter and a.press_title != title_filter and a.domain != title_filter:
                continue
            if variant == "OWN" and a.is_duplicate:
                continue

            c = classifications.get(a.canonical_url)
            if c:
                counts[c.primary_topic] += 1
            else:
                counts["INNE/NIEOKREŚLONE"] += 1
        return dict(counts)

    def calculate_trends(
        self,
        current_articles: List[Article],
        previous_articles: List[Article],
        classifications: Dict[str, ClassificationResult],
        all_topic_ids: List[str],
        period_type: PeriodType,
        current_period_key: str,
        previous_period_key: str,
        variant: Literal["ALL", "OWN"] = "ALL",
        title_id: Optional[str] = None,
    ) -> List[TrendResult]:
        """
        Calculates trends across all topics between two periods, applies two-proportion z-tests
        and controls FDR via Benjamini-Hochberg.
        """
        curr_dist = self.calculate_topic_distribution(current_articles, classifications, variant, title_id)
        prev_dist = self.calculate_topic_distribution(previous_articles, classifications, variant, title_id)

        # Filter total counts according to variant & title
        def count_valid(arts: List[Article]) -> int:
            return sum(
                1 for a in arts
                if (not title_id or a.press_title == title_id or a.domain == title_id)
                and (variant == "ALL" or not a.is_duplicate)
            )

        n_curr = count_valid(current_articles)
        n_prev = count_valid(previous_articles)

        prelim_results = []
        p_values = []

        for tid in all_topic_ids:
            x_curr = curr_dist.get(tid, 0)
            x_prev = prev_dist.get(tid, 0)

            p_curr = (x_curr / n_curr) if n_curr > 0 else 0.0
            p_prev = (x_prev / n_prev) if n_prev > 0 else 0.0

            abs_change = round(p_curr - p_prev, 4)
            rel_change = round((p_curr - p_prev) / p_prev, 4) if p_prev > 0 else None

            z, p_val, is_sig_raw = TwoProportionZTest.test(
                x_curr, n_curr, x_prev, n_prev, min_sample_size=self.min_sample_size, alpha=self.alpha
            )
            p_values.append(p_val if p_val is not None else 1.0)

            prelim_results.append({
                "topic_id": tid,
                "x_curr": x_curr,
                "n_curr": n_curr,
                "p_curr": round(p_curr, 4),
                "x_prev": x_prev,
                "n_prev": n_prev,
                "p_prev": round(p_prev, 4),
                "abs_change": abs_change,
                "rel_change": rel_change,
                "z_score": z,
                "p_value": p_val,
                "is_sig_raw": is_sig_raw,
            })

        # Apply Benjamini-Hochberg FDR correction
        fdr_mask = BenjaminiHochberg.adjust(p_values, fdr_q=self.fdr_q)

        trend_results: List[TrendResult] = []
        for item, is_fdr_sig in zip(prelim_results, fdr_mask):
            z = item["z_score"]
            p_val = item["p_value"]
            is_sig = item["is_sig_raw"]

            # Determine direction
            if item["n_curr"] < self.min_sample_size or item["n_prev"] < self.min_sample_size:
                direction = TrendDirection.BRAK_DANYCH
            elif is_sig:
                direction = TrendDirection.WZROST if item["p_curr"] > item["p_prev"] else TrendDirection.SPADEK
            else:
                direction = TrendDirection.STABILNY

            # Create MetricProof
            proof = MetricProof(
                value=round(item["p_curr"] * 100.0, 2),
                status=MetricStatus.PRZYBLIZENIE,
                source=f"ppgscope-trend-engine (wariant: {variant})",
                measured_at=datetime.now(timezone.utc),
                sample_size=item["n_curr"] + item["n_prev"],
                methodology_version="v1.0.0 (Two-proportion z-test + Benjamini-Hochberg)",
                p_value=p_val,
                is_significant=is_fdr_sig if p_val is not None else False,
                details={
                    "variant": variant,
                    "title_id": title_id,
                    "z_score": z,
                    "is_sig_raw": is_sig,
                    "is_sig_fdr": is_fdr_sig,
                    "min_sample_size": self.min_sample_size,
                    "alpha": self.alpha,
                    "fdr_q": self.fdr_q,
                },
            )

            trend_results.append(
                TrendResult(
                    topic_id=item["topic_id"],
                    title_id=title_id,
                    period_type=period_type,
                    current_period=current_period_key,
                    previous_period=previous_period_key,
                    current_topic_count=item["x_curr"],
                    current_total_count=item["n_curr"],
                    current_share=item["p_curr"],
                    previous_topic_count=item["x_prev"],
                    previous_total_count=item["n_prev"],
                    previous_share=item["p_prev"],
                    absolute_share_change=item["abs_change"],
                    relative_change=item["rel_change"],
                    z_score=z,
                    p_value=p_val,
                    is_significant_raw=is_sig,
                    is_significant_fdr=is_fdr_sig,
                    direction=direction,
                    proof=proof,
                )
            )

        return trend_results
