#!/usr/bin/env python3
"""
Skrypt integracyjny potoku prasy drukowanej, czołówek redakcyjnych i wskaźnika autonomii PPGscope.
Realizuje:
- Wariant 1: Monitoring okładek (jedynek) z CDN Prasa24 wraz z metrykami PBC (nakład, CPW)
- Wariant 2: Rejestracja i gotowość konektora agencyjnego (IMM / PSMM)
- Wariant 3: Ekstrakcja sygnatur wydania papierowego z artykułów webowych
- Visual Hero Detection: Bezgłowy silnik Chromium (Puppeteer) omijający Cloudflare WAF
- Wskaźnik Autonomii Redakcyjnej: audyt syndykacji czołówek („sieciówki” vs tematy lokalne)
"""

import os
import sys
import json
import logging
import subprocess
from datetime import datetime
from typing import Dict, List

# Ustawienie ścieżki do modułów projektu
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ppgscope.press.pbc_registry import PBCRegistry
from ppgscope.press.frontpage_monitor import FrontpageMonitor
from ppgscope.press.institutional_connector import InstitutionalConnector
from ppgscope.press.print_in_web_extractor import PrintInWebExtractor
from ppgscope.press.editorial_autonomy import EditorialAutonomyAnalyzer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("press_hero_pipeline")


def main():
    logger.info("=== START POTOKU: PRASA DRUKOWANA, CZOŁÓWKI REDAKCYJNE I AUTONOMIA PPG ===")
    today_str = datetime.now().strftime("%Y-%m-%d")

    # Inicjalizacja komponentów
    pbc = PBCRegistry()
    monitor = FrontpageMonitor(output_base_dir="data/press_covers")
    autonomy_analyzer = EditorialAutonomyAnalyzer()

    # 1. Pobieranie okładek (Wariant 1) dla 20 dzienników
    logger.info("--- KROK 1: Pobieranie okładek ('jedynek') z CDN Prasa24 (Wariant 1) ---")
    frontpages = monitor.run_daily_monitor(target_date=today_str)
    logger.info(f"Pobrano i zindeksowano okładek: {len(frontpages)}/{len(pbc.get_all())}")

    # 2. Skanowanie czołówek portali przez bezgłowy Chromium (Visual Hero Scanner)
    logger.info("--- KROK 2: Bezgłowe skanowanie Chromium portali regionalnych (Cloudflare Bypass) ---")
    
    # Wybór kluczowych domen regionalnych PPG do audytu autonomii
    target_papers = [
        "gazeta-krakowska",
        "dziennik-zachodni",
        "glos-wielkopolski",
        "gazeta-pomorska",
        "dziennik-baltycki",
        "echo-dnia",
        "gazeta-wroclawska",
        "nowiny",
        "dziennik-lodzki",
        "dziennik-polski"
    ]

    target_urls = []
    for code in target_papers:
        paper = pbc.get_by_code(code)
        if paper:
            target_urls.append(f"https://{paper.portal_domain}")

    scanner_script = os.path.join(os.path.dirname(__file__), "browser_hero_scanner.js")
    logger.info(f"Uruchamianie skanera browser_hero_scanner.js dla {len(target_urls)} portali...")

    cmd = ["node", scanner_script] + target_urls
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=90, check=True)
        raw_scanned = json.loads(proc.stdout)
    except Exception as e:
        logger.error(f"Błąd uruchomienia browser_hero_scanner: {e}")
        raw_scanned = []

    logger.info(f"Pomyślnie zebrano dane czołówek dla {len(raw_scanned)} portali.")

    # 3. Analiza Wskaźnika Autonomii Redakcyjnej
    logger.info("--- KROK 3: Wyliczanie Wskaźnika Autonomii Redakcyjnej i Klastrów Syndykacji ---")
    autonomy_report = autonomy_analyzer.analyze_scanned_leads(raw_scanned, today_str)

    # 4. Zapis raportów wyjściowych
    out_dir = f"reports/press_analysis/{today_str}"
    os.makedirs(out_dir, exist_ok=True)

    report_json_path = os.path.join(out_dir, "editorial_autonomy_and_frontpages_report.json")
    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(autonomy_report.model_dump(), f, indent=2, ensure_ascii=False)

    logger.info(f"Zapisano pełny raport do: {report_json_path}")

    # 5. Prezentacja tabelaryczna w kanonie edytorskim
    print("\n" + "=" * 115)
    print(f"RAPORT AUDYTU AUTONOMII REDAKCYJNEJ I CZOŁÓWEK PPG — {today_str}")
    print("=" * 115)
    print(f"Zbadane portale: {autonomy_report.total_portals_scanned} | "
          f"Czołówki autonomiczne: {autonomy_report.autonomous_portals_count} | "
          f"Czołówki syndykowane ('sieciówki'): {autonomy_report.syndicated_portals_count}")
    print(f"WSKAŹNIK AUTONOMII REDAKCYJNEJ (prosty): {autonomy_report.editorial_autonomy_rate_pct}%")
    print(f"WSKAŹNIK AUTONOMII WAŻONY NAKŁADEM PBC:   {autonomy_report.circulation_weighted_autonomy_pct}%")
    if autonomy_report.top_syndication_sources:
        print(f"Główne źródła syndykacji (huby): {autonomy_report.top_syndication_sources}")
    print("-" * 115)

    header_fmt = "{:<20} | {:<16} | {:<22} | {:<15} | {:<32}"
    row_fmt = "{:<20} | {:<16} | {:<22} | {:<15} | {:<32}"
    print(header_fmt.format("Tytuł prasowy", "Województwo", "Status autonomii", "Źródło tekstu", "Tytuł czołówki (Hero)"))
    print("-" * 115)

    for r in autonomy_report.records:
        title_disp = r.paper_title[:20]
        woj_disp = r.voivodeship[:16]
        status_disp = r.autonomy_status.replace("_", " ")[:22]
        origin_disp = r.origin_domain[:15]
        hero_disp = (r.hero_title[:29] + "...") if len(r.hero_title) > 32 else r.hero_title
        print(row_fmt.format(title_disp, woj_disp, status_disp, origin_disp, hero_disp))

    print("=" * 115 + "\n")
    logger.info("=== POTOK ZAKOŃCZONY SUKCESEM ===")


if __name__ == "__main__":
    main()
