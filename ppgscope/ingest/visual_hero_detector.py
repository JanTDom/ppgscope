"""
Visual Hero Detector (Wykrywacz Czołówek Redakcyjnych Portali Polska Press).
Eliminuje błąd traktowania ostatniego tekstu chronologicznego (np. z RSS) jako czołówki.
Definiuje czołówkę na podstawie hierarchii wizualnej: komponenty Hero (atomsTileArticleHero),
wielkości typografii, pozycji above-the-fold, obecności nadtytułu (kicker) oraz wiodącego zdjęcia.
Integruje silnik Headless Chromium (Puppeteer) omijający zabezpieczenia Cloudflare (WAF/JS challenges).
"""

import os
import re
import json
import subprocess
import logging
from typing import Dict, List, Optional
import requests
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class VisualLeadStory(BaseModel):
    portal_domain: str
    headline: str
    url: str
    article_id: Optional[str] = None
    kicker: Optional[str] = None  # Nadtytuł redakcyjny (np. "PILNE", "STRZELANINA W KRAKOWIE")
    lead_image_url: Optional[str] = None
    component_type: str
    visual_rank: int = 1  # 1 = Główna czołówka (Hero), 2-3 = Sub-hero
    font_size_px: Optional[float] = None
    prominence_score: float
    detected_via: str  # 'BROWSER_HEADLESS' lub 'ATOMS_HERO_PARSER'


class VisualHeroDetector:
    """Silnik detekcji rzeczywistej czołówki redakcyjnej w sieci."""

    def __init__(self, browser_scanner_script: Optional[str] = None):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        }
        if browser_scanner_script:
            self.scanner_script = browser_scanner_script
        else:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            self.scanner_script = os.path.join(base_dir, "scripts", "browser_hero_scanner.js")

    def detect_via_browser(self, portal_urls: List[str]) -> List[VisualLeadStory]:
        """
        Skanuje portale za pomocą bezgłowej przeglądarki Chromium (Puppeteer),
        omijając zabezpieczenia Cloudflare 403 i analizując renderowany DOM.
        """
        if not os.path.exists(self.scanner_script):
            logger.error(f"Skrypt browser_hero_scanner.js nie istnieje: {self.scanner_script}")
            return []

        try:
            cmd = ["node", self.scanner_script] + portal_urls
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60,
                check=True
            )
            raw_json = result.stdout.strip()
            items = json.loads(raw_json)
            leads = []
            for item in items:
                portal_url = item.get("portalUrl", "")
                domain = portal_url.replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")
                title = item.get("title", "")
                if not title or "Błąd skanowania" in title:
                    continue

                lead = VisualLeadStory(
                    portal_domain=domain,
                    headline=title,
                    url=item.get("url") or portal_url,
                    kicker=item.get("kicker"),
                    lead_image_url=item.get("imageUrl"),
                    component_type=item.get("componentType") or "atomsTileArticleHero",
                    visual_rank=1,
                    font_size_px=float(item.get("fontSize") or 24.0),
                    prominence_score=float(item.get("prominenceScore") or 70.0),
                    detected_via="BROWSER_HEADLESS"
                )
                leads.append(lead)
            return leads
        except Exception as e:
            logger.error(f"Błąd uruchamiania skanera przeglądarkowego: {e}")
            return []

    def detect_hero_from_html(self, html_content: str, portal_url: str) -> List[VisualLeadStory]:
        """
        Analizuje kod HTML strony głównej portalu PPG (fallback HTTP)
        zgodnie z architekturą Atoms/Bifrost stosowaną w Polska Press.
        """
        clean_domain = portal_url.replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")
        leads: List[VisualLeadStory] = []

        hero_block_rgx = re.compile(
            r'<div[^>]*class=\"([^\"]*atomsTileArticleHero[^\"]*)\"[^>]*data-ea=\"tile:(\d+)\"[^>]*data-article-id=\"(\d+)\"[\s\S]*?(?=<div[^>]*data-ea=\"tile:|$)',
            re.IGNORECASE,
        )

        matches = hero_block_rgx.findall(html_content)
        if not matches:
            hero_block_rgx_alt = re.compile(
                r'<div[^>]*class=\"([^\"]*atomsTileArticleHero[^\"]*)\"[\s\S]*?</div>\s*</div>',
                re.IGNORECASE,
            )
            matches_alt = hero_block_rgx_alt.findall(html_content)
            if matches_alt:
                matches = [(matches_alt[0], "1", "")]

        global_kicker = None
        kicker_match = re.search(r'<h2[^>]*class=\"[^\"]*(?:kicker|leadHeader|titleSpecial|topic)[^\"]*\"[^>]*>([^<]+)</h2>', html_content, re.IGNORECASE)
        if not kicker_match:
            kicker_match = re.search(r'<h2[^>]*>([A-ZĄĆĘŁŃÓŚŹŻ\s]{5,40})</h2>', html_content)
        if kicker_match:
            global_kicker = kicker_match.group(1).strip()

        rank = 1
        for cls_name, tile_num, art_id in matches[:3]:
            link_match = re.search(r'href=\"(/[^\"]+/ar/(?:c\d+p\d+-)?(\d+)[^\"]*)\"', cls_name + html_content[html_content.find(cls_name) : html_content.find(cls_name) + 2500])
            title_match = re.search(r'title=\"([^\"]{10,250})\"', cls_name + html_content[html_content.find(cls_name) : html_content.find(cls_name) + 2500])
            if not title_match:
                title_match = re.search(r'<h[1-4][^>]*>([\s\S]*?)</h[1-4]>', html_content[html_content.find(cls_name) : html_content.find(cls_name) + 2500])

            img_match = re.search(r'src=\"(https://[^\"]+(?:ppstatic|polskapress)[^\"]+)\"', html_content[html_content.find(cls_name) : html_content.find(cls_name) + 2500])

            if title_match and link_match:
                raw_title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()
                raw_link = link_match.group(1)
                full_link = raw_link if raw_link.startswith("http") else f"https://{clean_domain}{raw_link}"
                img_url = img_match.group(1) if img_match else None

                prominence = 100.0 - (rank - 1) * 25.0
                if global_kicker and rank == 1:
                    prominence += 20.0

                lead = VisualLeadStory(
                    portal_domain=clean_domain,
                    headline=raw_title,
                    url=full_link,
                    article_id=art_id if art_id else link_match.group(2),
                    kicker=global_kicker if rank == 1 else None,
                    lead_image_url=img_url,
                    component_type=cls_name.split()[0],
                    visual_rank=rank,
                    font_size_px=30.0 if rank == 1 else 22.0,
                    prominence_score=prominence,
                    detected_via="ATOMS_HERO_PARSER",
                )
                leads.append(lead)
                rank += 1

        return leads

    def detect_for_portal(self, portal_url: str) -> List[VisualLeadStory]:
        """Pobiera stronę główną portalu (najpierw HTTP, przy 403 / braku Hero uruchamia Browser)."""
        try:
            resp = requests.get(portal_url, headers=self.headers, timeout=8)
            if resp.status_code == 200:
                leads = self.detect_hero_from_html(resp.text, portal_url)
                if leads:
                    return leads
        except Exception as http_err:
            logger.debug(f"HTTP fallback napotkał błąd dla {portal_url}: {http_err}")

        # Jeśli HTTP zwrócił 403 (Cloudflare) lub nie odnalazł klocka Hero, uruchom Browser
        logger.info(f"Uruchamianie silnika Chromium (Puppeteer) dla {portal_url} z ominięciem Cloudflare...")
        return self.detect_via_browser([portal_url])
