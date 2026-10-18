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


class HomepageStalenessStatus(str, Enum):
    DYNAMICZNA_CZOLOWKA = "DYNAMICZNA_CZOLOWKA"
    UMIARKOWANA_ROTACJA = "UMIARKOWANA_ROTACJA"
    ZASTYGLA_JEDYNKA = "ZASTYGLA_JEDYNKA"


class HomepageStalenessReport(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    domain: str
    portal_name: str
    region: str
    current_hero_title: str
    current_hero_dwell_hours: float = Field(..., ge=0.0)
    avg_weekday_dwell_hours: float = Field(..., ge=0.0)
    avg_weekend_dwell_hours: float = Field(..., ge=0.0)
    evening_freeze_hours: float = Field(..., ge=0.0)
    swaps_per_24h: int = Field(..., ge=0)
    median_reaction_minutes: int = Field(..., ge=0)
    staleness_status: HomepageStalenessStatus
    staleness_label: str
    diagnosis: str
    proof: MetricProof


class HomepageStalenessAnalyzer:
    """
    Evaluates front-page (Hero Slot) rotation dynamics, weekend/evening freeze gaps,
    and reaction speed to regional breaking events strictly from external DOM polling.
    """

    STATUS_LABELS = {
        HomepageStalenessStatus.DYNAMICZNA_CZOLOWKA: "Dynamiczna czołówka (częsta rotacja)",
        HomepageStalenessStatus.UMIARKOWANA_ROTACJA: "Umiarkowana rotacja (widoczne luki wieczorne)",
        HomepageStalenessStatus.ZASTYGLA_JEDYNKA: "Zastygła jedynka (długi przestój wydawniczy)",
    }

    @classmethod
    def evaluate_staleness(
        cls,
        domain: str,
        portal_name: str,
        region: str,
        current_hero_title: str,
        current_hero_dwell_hours: float,
        avg_weekday_dwell_hours: float,
        avg_weekend_dwell_hours: float,
        evening_freeze_hours: float,
        swaps_per_24h: int,
        median_reaction_minutes: int,
    ) -> HomepageStalenessReport:
        if (
            current_hero_dwell_hours >= 7.5
            or avg_weekend_dwell_hours >= 8.0
            or evening_freeze_hours >= 8.5
            or avg_weekday_dwell_hours >= 5.5
        ):
            status = HomepageStalenessStatus.ZASTYGLA_JEDYNKA
            diagnosis = (
                f"Zastygła czołówka: główny materiał wisi {current_hero_dwell_hours:.1f}h, "
                f"a w weekendy jedynka nie zmienia się średnio przez {avg_weekend_dwell_hours:.1f}h "
                f"(nocna luka po 17:00 wynosi {evening_freeze_hours:.1f}h)."
            )
        elif (
            avg_weekday_dwell_hours <= 3.6
            and avg_weekend_dwell_hours <= 5.5
            and evening_freeze_hours <= 6.2
            and current_hero_dwell_hours <= 5.0
        ):
            status = HomepageStalenessStatus.DYNAMICZNA_CZOLOWKA
            diagnosis = (
                f"Aktywny dyżur wydawniczy: {swaps_per_24h} wymian jedynki na dobę, "
                f"średni czas ekspozycji w dni robocze {avg_weekday_dwell_hours:.1f}h i szybka reakcja ({median_reaction_minutes} min)."
            )
        else:
            status = HomepageStalenessStatus.UMIARKOWANA_ROTACJA
            diagnosis = (
                f"Płynna praca w dzień ({avg_weekday_dwell_hours:.1f}h na jedynce), ale zauważalne spowolnienie "
                f"w weekendy ({avg_weekend_dwell_hours:.1f}h) oraz wieczorny przestój ({evening_freeze_hours:.1f}h)."
            )

        proof = MetricProof(
            value=status.value,
            status=MetricStatus.POMIAR,
            source="connector-ppg-web-public",
            measured_at=datetime.now(timezone.utc),
            sample_size=max(1, swaps_per_24h * 30),
            methodology_version="v2.2.0 (Homepage Staleness & Reaction Radar)",
            details={
                "current_hero_dwell_hours": round(current_hero_dwell_hours, 1),
                "avg_weekday_dwell_hours": round(avg_weekday_dwell_hours, 1),
                "avg_weekend_dwell_hours": round(avg_weekend_dwell_hours, 1),
                "evening_freeze_hours": round(evening_freeze_hours, 1),
                "swaps_per_24h": swaps_per_24h,
            },
        )

        return HomepageStalenessReport(
            domain=domain,
            portal_name=portal_name,
            region=region,
            current_hero_title=current_hero_title,
            current_hero_dwell_hours=round(current_hero_dwell_hours, 1),
            avg_weekday_dwell_hours=round(avg_weekday_dwell_hours, 1),
            avg_weekend_dwell_hours=round(avg_weekend_dwell_hours, 1),
            evening_freeze_hours=round(evening_freeze_hours, 1),
            swaps_per_24h=swaps_per_24h,
            median_reaction_minutes=median_reaction_minutes,
            staleness_status=status,
            staleness_label=cls.STATUS_LABELS[status],
            diagnosis=diagnosis,
            proof=proof,
        )


class SyndicationRole(str, Enum):
    EKSPORTER_TRESCI = "EKSPORTER_TRESCI"
    ZROWNOWAZONY = "ZROWNOWAZONY"
    BIORCA_KLONOW = "BIORCA_KLONOW"


class SyndicationCanonicalReport(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    domain: str
    portal_name: str
    region: str
    role: SyndicationRole
    role_label: str
    exported_originals_30d: int = Field(..., ge=0)
    generated_network_copies_30d: int = Field(..., ge=0)
    imported_clones_30d: int = Field(..., ge=0)
    export_to_import_ratio: float = Field(..., ge=0.0)
    cross_domain_canonical_pct: float = Field(..., ge=0.0, le=100.0)
    self_canonical_clones_30d: int = Field(..., ge=0)
    seo_cannibalization_risk: str
    diagnosis: str
    proof: MetricProof


class SyndicationCanonicalAuditor:
    """
    Audits who feeds the 546-portal network vs who only consumes reprints, and verifies
    whether syndicated clones include a proper cross-domain <link rel="canonical"> pointing
    to the origin daily to prevent Google Search / Discover cannibalization.
    """

    ROLE_LABELS = {
        SyndicationRole.EKSPORTER_TRESCI: "Żywiciel sieci (eksporter netto)",
        SyndicationRole.ZROWNOWAZONY: "Wymiana zrównoważona",
        SyndicationRole.BIORCA_KLONOW: "Biorca gotowców (importer klonów)",
    }

    @staticmethod
    def check_canonical_hygiene(
        page_url: str,
        canonical_url: str,
        origin_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Inspects whether a syndicated article points its canonical tag to the original publisher
        or self-canonicalizes (creating duplicate content cannibalization in Google).
        """
        from urllib.parse import urlparse

        page_host = urlparse(page_url).netloc.lower().replace("www.", "")
        canon_host = urlparse(canonical_url).netloc.lower().replace("www.", "")
        origin_host = urlparse(origin_url).netloc.lower().replace("www.", "") if origin_url else page_host

        is_syndicated_copy = bool(origin_url and origin_host != page_host)
        points_to_origin = bool(is_syndicated_copy and canon_host == origin_host)
        is_self_canonical_clone = bool(is_syndicated_copy and canon_host == page_host)

        return {
            "page_domain": page_host,
            "canonical_domain": canon_host,
            "origin_domain": origin_host,
            "is_syndicated_copy": is_syndicated_copy,
            "points_to_origin": points_to_origin,
            "is_self_canonical_clone": is_self_canonical_clone,
            "seo_safe": (not is_syndicated_copy) or points_to_origin,
        }

    @classmethod
    def evaluate_portal_syndication(
        cls,
        domain: str,
        portal_name: str,
        region: str,
        exported_originals_30d: int,
        generated_network_copies_30d: int,
        imported_clones_30d: int,
        cross_domain_canonical_pct: float,
    ) -> SyndicationCanonicalReport:
        imp = max(1, imported_clones_30d)
        ratio = round(exported_originals_30d / imp, 2)
        canon_pct = round(max(0.0, min(100.0, cross_domain_canonical_pct)), 1)
        self_canon_clones = int(round(imported_clones_30d * ((100.0 - canon_pct) / 100.0)))

        if ratio >= 1.25:
            role = SyndicationRole.EKSPORTER_TRESCI
        elif ratio >= 0.60:
            role = SyndicationRole.ZROWNOWAZONY
        else:
            role = SyndicationRole.BIORCA_KLONOW

        if canon_pct >= 85.0 or self_canon_clones < 50:
            risk = "NISKIE"
        elif canon_pct >= 60.0:
            risk = "SREDNIE"
        else:
            risk = "WYSOKIE"

        diagnosis = (
            f"Bilans 30d: wyeksportowano {exported_originals_30d} oryginałów (powielonych {generated_network_copies_30d} razy w sieci) "
            f"przy imporcie {imported_clones_30d} tekstów wspólnych. "
            f"Poprawny canonical do źródła posiada {canon_pct}% przedruków ({self_canon_clones} kopii kanibalizuje oryginał w Google)."
        )

        proof = MetricProof(
            value=role.value,
            status=MetricStatus.POMIAR,
            source="connector-ppg-web-public",
            measured_at=datetime.now(timezone.utc),
            sample_size=max(1, exported_originals_30d + imported_clones_30d),
            methodology_version="v2.2.0 (MinHash Cascade & Canonical SEO Audit)",
            details={
                "export_to_import_ratio": ratio,
                "cross_domain_canonical_pct": canon_pct,
                "self_canonical_clones_30d": self_canon_clones,
            },
        )

        return SyndicationCanonicalReport(
            domain=domain,
            portal_name=portal_name,
            region=region,
            role=role,
            role_label=cls.ROLE_LABELS[role],
            exported_originals_30d=exported_originals_30d,
            generated_network_copies_30d=generated_network_copies_30d,
            imported_clones_30d=imported_clones_30d,
            export_to_import_ratio=ratio,
            cross_domain_canonical_pct=canon_pct,
            self_canonical_clones_30d=self_canon_clones,
            seo_cannibalization_risk=risk,
            diagnosis=diagnosis,
            proof=proof,
        )


class CompetitorDomainGapItem(BaseModel):
    domain_code: str
    domain_name: str
    ppg_daily_count: int
    competitor_daily_count: int
    ppg_share_pct: float
    competitor_share_pct: float
    delta_pp: float


class RegionalCompetitorBenchmarkReport(BaseModel):
    region: str
    city_hub: str
    ppg_portal_name: str
    ppg_domain: str
    competitor_name: str
    competitor_domain: str
    ppg_local_daily_volume: int
    competitor_local_daily_volume: int
    ppg_first_on_breaking_pct: float
    median_lag_minutes: int
    competitor_advantage_topics: List[str]
    ppg_advantage_topics: List[str]
    domain_comparison: List[CompetitorDomainGapItem]
    executive_verdict: str


class RegionalCompetitorBenchmarkAnalyzer:
    """
    Compares a PPG regional daily 1:1 against its leading independent regional competitor
    using identical RSS/Sitemap ingestion and Taxonomy v2.0 18-domain classification.
    """

    @classmethod
    def compare_1to1(
        cls,
        region: str,
        city_hub: str,
        ppg_portal_name: str,
        ppg_domain: str,
        competitor_name: str,
        competitor_domain: str,
        ppg_domain_counts: Dict[str, int],
        competitor_domain_counts: Dict[str, int],
        domain_labels: Dict[str, str],
        ppg_first_on_breaking_pct: float,
        median_lag_minutes: int,
    ) -> RegionalCompetitorBenchmarkReport:
        ppg_total = max(1, sum(ppg_domain_counts.values()))
        comp_total = max(1, sum(competitor_domain_counts.values()))

        items: List[CompetitorDomainGapItem] = []
        comp_adv: List[str] = []
        ppg_adv: List[str] = []

        for code in sorted(domain_labels.keys()):
            p_cnt = ppg_domain_counts.get(code, 0)
            c_cnt = competitor_domain_counts.get(code, 0)
            p_pct = round((p_cnt / ppg_total) * 100.0, 1)
            c_pct = round((c_cnt / comp_total) * 100.0, 1)
            delta = round(p_pct - c_pct, 1)
            name = domain_labels[code]

            items.append(
                CompetitorDomainGapItem(
                    domain_code=code,
                    domain_name=name,
                    ppg_daily_count=p_cnt,
                    competitor_daily_count=c_cnt,
                    ppg_share_pct=p_pct,
                    competitor_share_pct=c_pct,
                    delta_pp=delta,
                )
            )
            if delta <= -2.5:
                comp_adv.append(f"{name} ({delta:+.1f} pkt proc.)")
            elif delta >= 2.5:
                ppg_adv.append(f"{name} (+{delta:.1f} pkt proc.)")

        verdict = (
            f"W aglomeracji {city_hub} {ppg_portal_name} publikuje {ppg_total} tekstów lokalnych dziennie "
            f"wobec {comp_total} u konkurenta ({competitor_name}). "
            f"PPG podaje informację jako pierwsze w {ppg_first_on_breaking_pct:.1f}% zdarzeń (mediana różnicy: {median_lag_minutes} min)."
        )

        return RegionalCompetitorBenchmarkReport(
            region=region,
            city_hub=city_hub,
            ppg_portal_name=ppg_portal_name,
            ppg_domain=ppg_domain,
            competitor_name=competitor_name,
            competitor_domain=competitor_domain,
            ppg_local_daily_volume=ppg_total,
            competitor_local_daily_volume=comp_total,
            ppg_first_on_breaking_pct=round(ppg_first_on_breaking_pct, 1),
            median_lag_minutes=median_lag_minutes,
            competitor_advantage_topics=comp_adv[:3],
            ppg_advantage_topics=ppg_adv[:3],
            domain_comparison=items,
            executive_verdict=verdict,
        )

