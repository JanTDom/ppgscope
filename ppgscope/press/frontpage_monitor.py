"""
Wariant 1: Monitoring i pobieranie okładek wydań drukowanych Polska Press z CDN Prasa24.
Pobiera pliki okladka_max.png (800x969 px) dla 20 dzienników regionalnych wraz z metadanymi PBC.
"""

import os
import re
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import requests
from pydantic import BaseModel, Field

from .pbc_registry import PBCRegistry, NewspaperCirculation

logger = logging.getLogger(__name__)


class DailyFrontpage(BaseModel):
    code: str
    title: str
    voivodeship: str
    date_str: str
    issue_id: int
    paper_id: int
    cover_cdn_url: str
    local_image_path: str
    image_bytes: int
    image_width: int
    image_height: int
    circulation_paid: int
    readership_cpw: int
    impact_weight: float


class FrontpageMonitor:
    """Moduł pobierania i indeksowania okładek ('jedynek') prasy drukowanej PPG."""

    def __init__(self, output_base_dir: str = "data/press_covers"):
        self.output_base_dir = output_base_dir
        self.registry = PBCRegistry()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    def fetch_latest_issue_info(self, slug: str) -> Optional[Dict]:
        """Pobiera informacje o bieżącym numerze z podstrony tytułu na prasa24.pl."""
        url = f"https://prasa24.pl/gazeta/{slug}/"
        try:
            resp = requests.get(url, headers=self.headers, timeout=12)
            if resp.status_code != 200:
                logger.warning(f"Błąd HTTP {resp.status_code} dla {slug}")
                return None

            # Szukanie URL okladka_max.png lub okladka_d.png
            # Wzorzec: https://d-p24.ppstatic.pl/wydania/{paper_id}/{rok}/{miesiac}/{issue_id}/okladka_max.png?...
            pattern = r'(https://d-p24\.ppstatic\.pl/wydania/(\d+)/\d+/\d+/(\d+)/okladka_max\.png(?:\?\d+)?)'
            match = re.search(pattern, resp.text)
            if not match:
                # Wariant rezerwowy: okladka_d.png
                pattern_d = r'(https://d-p24\.ppstatic\.pl/wydania/(\d+)/\d+/\d+/(\d+)/okladka_d\.png(?:\?\d+)?)'
                match = re.search(pattern_d, resp.text)
                if not match:
                    return None

            cover_url = match.group(1)
            paper_id = int(match.group(2))
            issue_id = int(match.group(3))

            return {
                "cover_url": cover_url,
                "paper_id": paper_id,
                "issue_id": issue_id,
            }
        except Exception as e:
            logger.error(f"Wyjątek podczas pobierania {slug}: {e}")
            return None

    def download_cover(self, cover_url: str, dest_path: str) -> Optional[int]:
        """Pobiera plik graficzny okładki na dysk."""
        try:
            resp = requests.get(cover_url, headers=self.headers, timeout=15)
            if resp.status_code == 200 and len(resp.content) > 1000:
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with open(dest_path, "wb") as f:
                    f.write(resp.content)
                return len(resp.content)
            return None
        except Exception as e:
            logger.error(f"Błąd zapisu pliku {dest_path}: {e}")
            return None

    def run_daily_monitor(self, target_date: Optional[str] = None) -> List[DailyFrontpage]:
        """
        Pobiera okładki wszystkich 20 dzienników regionalnych i generuje indeks.
        target_date: format YYYY-MM-DD (domyślnie dzisiaj)
        """
        if not target_date:
            target_date = datetime.now().strftime("%Y-%m-%d")

        target_dir = os.path.join(self.output_base_dir, target_date)
        os.makedirs(target_dir, exist_ok=True)

        results: List[DailyFrontpage] = []
        all_papers = self.registry.get_all()

        for paper in all_papers:
            info = self.fetch_latest_issue_info(paper.prasa24_slug)
            if not info:
                continue

            file_name = f"{paper.code}_{info['issue_id']}_okladka.png"
            dest_path = os.path.join(target_dir, file_name)

            # Sprawdzenie czy plik już istnieje
            file_bytes = None
            if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
                file_bytes = os.path.getsize(dest_path)
            else:
                file_bytes = self.download_cover(info["cover_url"], dest_path)

            if not file_bytes:
                continue

            # Odczyt wymiarów jeśli PIL jest dostępny
            w, h = 800, 969
            try:
                from PIL import Image
                with Image.open(dest_path) as img:
                    w, h = img.size
            except Exception as img_err:
                logger.debug(f"Nie udało się odczytać wymiarów PIL dla {dest_path}: {img_err}")

            frontpage = DailyFrontpage(
                code=paper.code,
                title=paper.title,
                voivodeship=paper.voivodeship,
                date_str=target_date,
                issue_id=info["issue_id"],
                paper_id=info["paper_id"],
                cover_cdn_url=info["cover_url"],
                local_image_path=os.path.abspath(dest_path),
                image_bytes=file_bytes,
                image_width=w,
                image_height=h,
                circulation_paid=paper.circ_paid_total,
                readership_cpw=paper.readers_cpw,
                impact_weight=paper.impact_weight,
            )
            results.append(frontpage)

        # Zapisz indeks JSON
        index_file = os.path.join(target_dir, "index.json")
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump([item.dict() for item in results], f, indent=2, ensure_ascii=False)

        return results
