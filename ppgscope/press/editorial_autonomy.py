"""
Wskaźnik Autonomii Redakcyjnej i Analiza Syndykacji Czołówek PPG.
Klasyfikuje czołówki portali regionalnych Polska Press na:
- AUTONOMICZNA_LOKALNA: własny temat redakcji regionalnej, niepublikowany jako czołówka w innych regionach
- HUB_SYNDYKACJI: własny materiał regionalny, który stał się czołówką sieciową dla innych portali grupy
- SYNDYKACJA_SIECIOWA („sieciówka”): czołówka przejęta z innego regionu lub centralnego desku (i.pl, echodnia.eu)
Wylicza wskaźniki autonomii ilościowe oraz ważone nakładem i czytelnictwem PBC.
"""

from typing import Dict, List, Optional
from collections import Counter
from pydantic import BaseModel, Field

from .pbc_registry import PBCRegistry


class PortalAutonomyRecord(BaseModel):
    portal_domain: str
    paper_code: str
    paper_title: str
    voivodeship: str
    circ_paid_pbc: int
    readers_cpw: int
    hero_title: str
    hero_url: str
    article_id: Optional[str] = None
    origin_domain: str
    is_cross_domain: bool
    autonomy_status: str  # 'AUTONOMICZNA_LOKALNA', 'HUB_SYNDYKACJI', 'SYNDYKACJA_SIECIOWA'
    cluster_id: str
    cluster_size: int
    autonomy_score: float  # 1.0 (pełna autonomia) lub 0.0 (sieciówka)


class EditorialAutonomyReport(BaseModel):
    scan_date: str
    total_portals_scanned: int
    autonomous_portals_count: int
    syndicated_portals_count: int
    editorial_autonomy_rate_pct: float
    circulation_weighted_autonomy_pct: float
    top_syndication_sources: Dict[str, int]
    records: List[PortalAutonomyRecord]


class EditorialAutonomyAnalyzer:
    """Silnik audytu autonomii redakcyjnej czołówek PPG."""

    def __init__(self):
        self.registry = PBCRegistry()

    def analyze_scanned_leads(self, scanned_items: List[Dict], date_str: str) -> EditorialAutonomyReport:
        """
        Analizuje listę obiektów zwróconych ze skanera browser_hero_scanner.
        scanned_items: lista słowników z polami portalDomain, title, url, articleId, originDomain, isCrossDomain
        """
        # 1. Grupuj artykuły w klastry tematyczne (po articleId lub znormalizowanym tytule)
        clusters: Dict[str, List[Dict]] = {}
        for item in scanned_items:
            art_id = item.get("articleId")
            norm_title = item.get("title", "").strip().lower()[:45]
            cluster_key = art_id if art_id else f"title_{norm_title}"
            if cluster_key not in clusters:
                clusters[cluster_key] = []
            clusters[cluster_key].append(item)

        records: List[PortalAutonomyRecord] = []
        source_counter: Counter = Counter()

        for item in scanned_items:
            p_domain = item.get("portalDomain", "")
            paper = self.registry.get_by_domain(p_domain)

            art_id = item.get("articleId")
            norm_title = item.get("title", "").strip().lower()[:45]
            cluster_key = art_id if art_id else f"title_{norm_title}"
            cluster_list = clusters[cluster_key]
            cluster_size = len(cluster_list)

            origin = item.get("originDomain") or p_domain
            is_cross = bool(item.get("isCrossDomain", False))

            # Ustalenie statusu autonomii
            if cluster_size == 1 and not is_cross:
                status = "AUTONOMICZNA_LOKALNA"
                score = 1.0
            elif cluster_size > 1 and origin == p_domain:
                status = "HUB_SYNDYKACJI"
                score = 1.0
                source_counter[origin] += (cluster_size - 1)
            else:
                status = "SYNDYKACJA_SIECIOWA"
                score = 0.0
                source_counter[origin] += 1

            rec = PortalAutonomyRecord(
                portal_domain=p_domain,
                paper_code=paper.code if paper else "nieznany",
                paper_title=paper.title if paper else p_domain,
                voivodeship=paper.voivodeship if paper else "ogólnopolski",
                circ_paid_pbc=paper.circ_paid_total if paper else 1000,
                readers_cpw=paper.readers_cpw if paper else 2800,
                hero_title=item.get("title", ""),
                hero_url=item.get("url", ""),
                article_id=art_id,
                origin_domain=origin,
                is_cross_domain=is_cross,
                autonomy_status=status,
                cluster_id=cluster_key,
                cluster_size=cluster_size,
                autonomy_score=score,
            )
            records.append(rec)

        total_count = len(records)
        autonomous_count = sum(1 for r in records if r.autonomy_status in ["AUTONOMICZNA_LOKALNA", "HUB_SYNDYKACJI"])
        syndicated_count = total_count - autonomous_count

        raw_autonomy_pct = round((autonomous_count / total_count * 100.0) if total_count > 0 else 0.0, 1)

        # Wskaźnik ważony nakładem PBC
        total_circ = sum(r.circ_paid_pbc for r in records)
        weighted_circ_auto = sum(r.circ_paid_pbc for r in records if r.autonomy_score > 0.5)
        weighted_autonomy_pct = round((weighted_circ_auto / total_circ * 100.0) if total_circ > 0 else 0.0, 1)

        return EditorialAutonomyReport(
            scan_date=date_str,
            total_portals_scanned=total_count,
            autonomous_portals_count=autonomous_count,
            syndicated_portals_count=syndicated_count,
            editorial_autonomy_rate_pct=raw_autonomy_pct,
            circulation_weighted_autonomy_pct=weighted_autonomy_pct,
            top_syndication_sources=dict(source_counter.most_common(5)),
            records=records,
        )
