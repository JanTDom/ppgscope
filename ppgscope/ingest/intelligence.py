import re
from enum import Enum
from typing import List, Dict, Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict

from ppgscope.models.article import Article
from ppgscope.models.proof import MetricProof, MetricStatus


class VitalityStatus(str, Enum):
    AKTYWNY_UNIKALNY = "AKTYWNY_UNIKALNY"     # Active newsroom with high share of unique texts
    AKTYWNY_SYNDYKAT = "AKTYWNY_SYNDYKAT"     # Active publishing, but dominated by syndicated clones
    LEDWO_ZYWY = "LEDWO_ZYWY"                 # Barely alive: very low daily volume or long gaps
    ZOMBIE_AUTOMAT = "ZOMBIE_AUTOMAT"         # Only automated/scheduled template feeds, near-zero human local reporting
    MARTWY = "MARTWY"                         # Dead / decommissioned domain (HTTP 404/410 or >72h silence)


class PortalVitalityReport(BaseModel):
    """
    Comprehensive vitality & uniqueness audit report for a PPG media portal,
    derived strictly from external public signals (HTTP, RSS/Sitemap cadence, MinHash uniqueness, bylines).
    """
    model_config = ConfigDict(use_enum_values=True)

    domain: str
    portal_name: str
    region: str
    portal_type: str
    http_status: int
    vitality_status: VitalityStatus
    vitality_label: str
    vitality_score: float = Field(..., ge=0.0, le=100.0)
    daily_articles_count: int = Field(..., ge=0)
    unique_articles_count: int = Field(..., ge=0)
    uniqueness_pct: float = Field(..., ge=0.0, le=100.0)
    syndicated_clones_pct: float = Field(..., ge=0.0, le=100.0)
    hours_since_last_pub: float = Field(..., ge=0.0)
    named_authors_count: int = Field(..., ge=0)
    cron_scheduled_pct: float = Field(..., ge=0.0, le=100.0)
    diagnosis: str
    proof: MetricProof


class PortalVitalityAuditor:
    """
    Evaluates whether a PPG portal is actively producing unique journalism,
    acting as a syndicated clone hub, barely alive, or dead.
    """

    STATUS_LABELS = {
        VitalityStatus.AKTYWNY_UNIKALNY: "Czynny (wysoka unikalność)",
        VitalityStatus.AKTYWNY_SYNDYKAT: "Czynny maszynowo (klon syndykatowy)",
        VitalityStatus.LEDWO_ZYWY: "Ledwo żywy (śladowa aktywność)",
        VitalityStatus.ZOMBIE_AUTOMAT: "Zombie (wyłącznie automaty i przedruki)",
        VitalityStatus.MARTWY: "Martwy / wygaszony",
    }

    @classmethod
    def evaluate_portal(
        cls,
        domain: str,
        portal_name: str,
        region: str,
        portal_type: str,
        http_status: int,
        daily_articles_count: int,
        unique_articles_count: int,
        hours_since_last_pub: float,
        named_authors_count: int,
        cron_scheduled_pct: float = 15.0,
    ) -> PortalVitalityReport:
        total = max(0, daily_articles_count)
        uniq = max(0, min(total, unique_articles_count))
        uniqueness_pct = round((uniq / total) * 100.0, 1) if total > 0 else 0.0
        syndicated_pct = round(100.0 - uniqueness_pct, 1) if total > 0 else 0.0

        if http_status in (404, 410, 502, 503) or total == 0 or hours_since_last_pub >= 72.0:
            status = VitalityStatus.MARTWY
            score = 0.0
            diagnosis = (
                f"Domena wygaszona (HTTP {http_status}) lub brak jakichkolwiek nowych publikacji od ponad 72 godzin."
            )
        elif total <= 4 or hours_since_last_pub >= 14.0:
            status = VitalityStatus.LEDWO_ZYWY
            score = round(min(38.0, total * 6.5 + uniq * 3.0), 1)
            diagnosis = (
                f"Portal publikuje śladowe ilości materiału ({total} art./dobę, przerwa {hours_since_last_pub:.1f}h), "
                f"z czego tylko {uniq} to teksty unikalne."
            )
        elif uniq <= 1 and (cron_scheduled_pct >= 55.0 or named_authors_count == 0):
            status = VitalityStatus.ZOMBIE_AUTOMAT
            score = round(min(29.0, 12.0 + uniqueness_pct * 0.4), 1)
            diagnosis = (
                f"Pozorna aktywność ({total} art./dobę): serwis zasilany niemal wyłącznie automatem CMS "
                f"({cron_scheduled_pct:.1f}% o pełnej minucie) i klonami sieciowymi bez własnych reporterów."
            )
        elif uniqueness_pct >= 42.0 and uniq >= 5 and named_authors_count >= 2:
            status = VitalityStatus.AKTYWNY_UNIKALNY
            raw_score = 52.0 + (uniqueness_pct * 0.38) + min(15.0, named_authors_count * 1.1)
            score = round(min(99.0, raw_score), 1)
            diagnosis = (
                f"Żywa redakcja: {total} art./dobę, w tym {uniq} unikalnych materiałów ({uniqueness_pct}%) "
                f"tworzonych przez {named_authors_count} podpisanych dziennikarzy."
            )
        else:
            status = VitalityStatus.AKTYWNY_SYNDYKAT
            raw_score = 40.0 + (uniqueness_pct * 0.35) + min(8.0, named_authors_count * 1.2)
            score = round(min(68.0, max(35.0, raw_score)), 1)
            diagnosis = (
                f"Portal czynny technicznie ({total} art./dobę), ale aż {syndicated_pct}% treści stanowią "
                f"wspólne przedruki sieciowe i depesze z podmienioną nazwą miasta."
            )

        proof = MetricProof(
            value=status.value,
            status=MetricStatus.POMIAR,
            source="connector-ppg-web-public",
            measured_at=datetime.now(timezone.utc),
            sample_size=max(1, total),
            methodology_version="v2.1.0 (Vitality & Uniqueness Audit)",
            details={
                "http_status": http_status,
                "uniqueness_pct": uniqueness_pct,
                "daily_articles_count": total,
                "unique_articles_count": uniq,
                "named_authors_count": named_authors_count,
            },
        )

        return PortalVitalityReport(
            domain=domain,
            portal_name=portal_name,
            region=region,
            portal_type=portal_type,
            http_status=http_status,
            vitality_status=status,
            vitality_label=cls.STATUS_LABELS[status],
            vitality_score=score,
            daily_articles_count=total,
            unique_articles_count=uniq,
            uniqueness_pct=uniqueness_pct,
            syndicated_clones_pct=syndicated_pct,
            hours_since_last_pub=round(hours_since_last_pub, 1),
            named_authors_count=named_authors_count,
            cron_scheduled_pct=round(cron_scheduled_pct, 1),
            diagnosis=diagnosis,
            proof=proof,
        )


class HomepageSlotItem(BaseModel):
    slot_rank: int
    slot_type: str  # LEAD_HERO, TOP_ABOVE_FOLD, SECONDARY_FEED
    title: str
    url: str
    is_breaking: bool = False
    is_paywalled: bool = False
    is_sponsored: bool = False


class HomepageRadarSnapshot(BaseModel):
    domain: str
    captured_at: datetime
    lead_story: Optional[HomepageSlotItem] = None
    above_fold_stories: List[HomepageSlotItem] = Field(default_factory=list)
    breaking_badges_count: int = 0
    paywall_slots_pct: float = 0.0
    sponsored_slots_pct: float = 0.0
    total_links_analyzed: int = 0


class HomepageRadarExtractor:
    """
    Extracts editorial front-page curation signals from a PPG portal homepage HTML.
    """

    @classmethod
    def extract_snapshot(cls, html_content: str, domain: str) -> HomepageRadarSnapshot:
        slots: List[HomepageSlotItem] = []
        anchor_pattern = re.compile(
            r'<a\b[^>]*href=[\"\']([^\"\']+)[\"\'][^>]*>(.*?)</a>',
            re.DOTALL | re.IGNORECASE,
        )

        seen_urls = set()
        for match in anchor_pattern.finditer(html_content):
            href = match.group(1).strip()
            inner = match.group(2)

            if not href or href.startswith("#") or href.startswith("javascript:"):
                continue
            if not ("/ar/" in href or re.search(r'/[a-z0-9-]+,\d+', href) or len(href) > 28):
                continue

            text_clean = re.sub(r'<[^>]+>', ' ', inner)
            text_clean = re.sub(r'\s+', ' ', text_clean).strip()
            if len(text_clean) < 18 or href in seen_urls:
                continue

            seen_urls.add(href)
            rank = len(slots) + 1
            slot_type = "LEAD_HERO" if rank == 1 else ("TOP_ABOVE_FOLD" if rank <= 6 else "SECONDARY_FEED")

            is_breaking = bool(re.search(r'\b(?:pilne|na\s+żywo|tylko\s+u\s+nas|alarm)\b', inner, re.IGNORECASE))
            is_paywalled = bool(re.search(r'(?:strefa-plus|plus-badge|paywall|tylko\s+w\s+plus)', inner, re.IGNORECASE))
            is_sponsored = bool(re.search(r'(?:materia[łl]\s+partnera|sponsorowany|reklama)', inner, re.IGNORECASE))

            slots.append(
                HomepageSlotItem(
                    slot_rank=rank,
                    slot_type=slot_type,
                    title=text_clean,
                    url=href if href.startswith("http") else f"https://{domain}{href if href.startswith('/') else '/' + href}",
                    is_breaking=is_breaking,
                    is_paywalled=is_paywalled,
                    is_sponsored=is_sponsored,
                )
            )
            if len(slots) >= 20:
                break

        top_slots = slots[:6]
        total_top = len(top_slots)
        paywall_pct = round((sum(1 for s in top_slots if s.is_paywalled) / total_top) * 100.0, 1) if total_top > 0 else 0.0
        sponsored_pct = round((sum(1 for s in top_slots if s.is_sponsored) / total_top) * 100.0, 1) if total_top > 0 else 0.0
        breaking_cnt = sum(1 for s in slots if s.is_breaking)

        return HomepageRadarSnapshot(
            domain=domain,
            captured_at=datetime.now(timezone.utc),
            lead_story=slots[0] if slots else None,
            above_fold_stories=top_slots,
            breaking_badges_count=breaking_cnt,
            paywall_slots_pct=paywall_pct,
            sponsored_slots_pct=sponsored_pct,
            total_links_analyzed=len(slots),
        )


class VersionDiffRecord(BaseModel):
    canonical_url: str
    domain: str
    change_type: str  # HEADLINE_MUTATION, BODY_EDIT, PAYWALL_LOCKED_LATER, TOMBSTONE_DELETED
    old_title: str
    new_title: Optional[str] = None
    http_status: int = 200
    body_delta_chars: int = 0
    detected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    summary_pl: str


class ArticleVersionTracker:
    """
    Compares two snapshots of an article or checks HTTP status to detect post-publication
    headline A/B mutations, silent body edits, delayed paywalling, and Tombstone (404/410) deletions.
    """

    @classmethod
    def compare_versions(
        cls,
        previous: Article,
        current: Optional[Article],
        http_status: int = 200,
    ) -> Optional[VersionDiffRecord]:
        if http_status in (404, 410) or current is None:
            return VersionDiffRecord(
                canonical_url=previous.canonical_url,
                domain=previous.domain,
                change_type="TOMBSTONE_DELETED",
                old_title=previous.title,
                new_title=None,
                http_status=http_status if http_status in (404, 410) else 404,
                body_delta_chars=-len(previous.body),
                summary_pl=f"Artykuł usunięty z serwera po publikacji (HTTP {http_status}). Oryginalny tytuł: „{previous.title}”.",
            )

        if previous.raw_html_hash == current.raw_html_hash and previous.title == current.title:
            return None

        body_delta = len(current.body) - len(previous.body)

        if not previous.is_paywalled and current.is_paywalled:
            return VersionDiffRecord(
                canonical_url=previous.canonical_url,
                domain=previous.domain,
                change_type="PAYWALL_LOCKED_LATER",
                old_title=previous.title,
                new_title=current.title,
                http_status=200,
                body_delta_chars=body_delta,
                summary_pl="Tekst opublikowany jako otwarty, a następnie zamknięty za paywallem Strefa Plus po zebraniu ruchu.",
            )

        if previous.title.strip() != current.title.strip():
            return VersionDiffRecord(
                canonical_url=previous.canonical_url,
                domain=previous.domain,
                change_type="HEADLINE_MUTATION",
                old_title=previous.title,
                new_title=current.title,
                http_status=200,
                body_delta_chars=body_delta,
                summary_pl=f"Zmiana nagłówka po publikacji (test A/B lub wyostrzenie): z „{previous.title}” na „{current.title}”.",
            )

        if abs(body_delta) >= 25 or previous.body.strip() != current.body.strip():
            return VersionDiffRecord(
                canonical_url=previous.canonical_url,
                domain=previous.domain,
                change_type="BODY_EDIT",
                old_title=previous.title,
                new_title=current.title,
                http_status=200,
                body_delta_chars=body_delta,
                summary_pl=f"Cicha korekta treści korpusu artykułu (zmiana objętości o {body_delta:+d} znaków).",
            )

        return None


class NewsroomPulseAnalyzer:
    """
    Analyzes journalist workload concentration and CMS cron-scheduled publication patterns.
    """

    @classmethod
    def analyze_cadence(cls, articles: List[Article]) -> Dict[str, Any]:
        if not articles:
            return {
                "total_articles": 0,
                "named_authors_count": 0,
                "top3_authors_share_pct": 0.0,
                "cron_scheduled_pct": 0.0,
                "hub_authors": [],
            }

        author_counts: Dict[str, int] = {}
        author_domains: Dict[str, set] = {}
        cron_count = 0

        for art in articles:
            if art.published_at.minute in (0, 15, 30, 45) and art.published_at.second == 0:
                cron_count += 1

            if art.byline_type == "named" and art.author:
                name = art.author.strip()
                author_counts[name] = author_counts.get(name, 0) + 1
                if name not in author_domains:
                    author_domains[name] = set()
                author_domains[name].add(art.domain)

        sorted_authors = sorted(author_counts.items(), key=lambda x: x[1], reverse=True)
        total_named_articles = sum(author_counts.values())
        top3_sum = sum(cnt for _, cnt in sorted_authors[:3])
        top3_share = round((top3_sum / total_named_articles) * 100.0, 1) if total_named_articles > 0 else 0.0
        cron_pct = round((cron_count / len(articles)) * 100.0, 1)

        hub_authors = [
            {"author": name, "articles": cnt, "domains_count": len(author_domains[name])}
            for name, cnt in sorted_authors
            if len(author_domains[name]) >= 2
        ]

        return {
            "total_articles": len(articles),
            "named_authors_count": len(author_counts),
            "top3_authors_share_pct": top3_share,
            "cron_scheduled_pct": cron_pct,
            "hub_authors": hub_authors,
        }
