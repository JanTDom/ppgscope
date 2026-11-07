#!/usr/bin/env python3
"""
Cykliczny skrypt automatycznego odświeżania czołówek redakcyjnych i prasy PPG.
Uruchamiany w pasmach wydawniczych (np. 07:30, 12:00, 17:00, 21:00):
1. Pobiera okładki wydań drukowanych (CDN Prasa24) wraz z metadanymi PBC
2. Bada czołówki portali regionalnych przez bezgłowy Chromium (Puppeteer)
3. Wylicza wskaźniki autonomii redakcyjnej i syndykacji
4. Zapisuje wyniki bezpośrednio do web/public/data/dashboard.json
5. Archiwizuje snapshot w reports/press_analysis/
"""

import os
import sys
import json
import logging
import subprocess
from datetime import datetime

# Ustawienie ścieżki do modułów projektu
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BASE_DIR)

from ppgscope.press.pbc_registry import PBCRegistry
from ppgscope.press.frontpage_monitor import FrontpageMonitor
from ppgscope.press.editorial_autonomy import EditorialAutonomyAnalyzer
from scripts.refresh_local_benchmark_live import refresh_live_benchmark

LOG_DIR = os.path.join(BASE_DIR, "data", "cron_logs")
os.makedirs(LOG_DIR, exist_ok=True)
log_file = os.path.join(LOG_DIR, f"cron_frontpages_{datetime.now().strftime('%Y%m%d')}.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_file, encoding="utf-8")
    ],
)
logger = logging.getLogger("cron_frontpages")


def refresh_frontpages_cycle() -> dict:
    start_time = datetime.now()
    today_str = start_time.strftime("%Y-%m-%d")
    slot_str = start_time.strftime("%H%M")
    logger.info(f"=== ROZPOCZĘCIE CYKLU AUDYTU CZOŁÓWEK PPG: {today_str} {slot_str} ===")

    pbc = PBCRegistry()
    monitor = FrontpageMonitor(output_base_dir=os.path.join(BASE_DIR, "data", "press_covers"))
    autonomy_analyzer = EditorialAutonomyAnalyzer()

    # 1. Pobranie okładek wydań drukowanych
    logger.info("Krok 1: Pobieranie okładek wydań drukowanych z CDN Prasa24...")
    try:
        frontpages = monitor.run_daily_monitor(target_date=today_str)
        logger.info(f"Pobrano i zindeksowano okładek: {len(frontpages)}/{len(pbc.get_all())}")
    except Exception as e:
        logger.error(f"Błąd podczas pobierania okładek: {e}")
        frontpages = []

    # 2. Skanowanie portali regionalnych przez bezgłowy Chromium
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

    scanner_script = os.path.join(BASE_DIR, "scripts", "browser_hero_scanner.js")
    logger.info(f"Krok 2: Uruchamianie Chromium Puppeteer dla {len(target_urls)} portali...")

    cmd = ["node", scanner_script] + target_urls
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=90, check=True)
        raw_scanned = json.loads(proc.stdout)
        logger.info(f"Pomyślnie zbadano czołówki {len(raw_scanned)} portali.")
    except Exception as e:
        logger.error(f"Błąd podczas skanowania Chromium: {e}")
        raw_scanned = []

    # 3. Analiza Wskaźnika Autonomii
    logger.info("Krok 3: Wyliczanie Wskaźnika Autonomii Redakcyjnej...")
    autonomy_report = autonomy_analyzer.analyze_scanned_leads(raw_scanned, today_str)

    # 4. Zapis do reports/
    out_dir = os.path.join(BASE_DIR, "reports", "press_analysis", today_str)
    os.makedirs(out_dir, exist_ok=True)
    report_file = os.path.join(out_dir, f"editorial_autonomy_slot_{slot_str}.json")
    latest_report_file = os.path.join(out_dir, "editorial_autonomy_and_frontpages_report.json")

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(autonomy_report.model_dump(), f, indent=2, ensure_ascii=False)
    with open(latest_report_file, "w", encoding="utf-8") as f:
        json.dump(autonomy_report.model_dump(), f, indent=2, ensure_ascii=False)

    # 5. Aktualizacja dashboard.json
    dashboard_path = os.path.join(BASE_DIR, "web", "public", "data", "dashboard.json")
    if os.path.exists(dashboard_path):
        try:
            with open(dashboard_path, "r", encoding="utf-8") as f:
                dash_data = json.load(f)

            if "editorial_intelligence" not in dash_data:
                dash_data["editorial_intelligence"] = {}

            dash_data["editorial_intelligence"]["editorial_autonomy_audit"] = autonomy_report.model_dump()
            dash_data["last_frontpage_refresh"] = datetime.now().isoformat()

            with open(dashboard_path, "w", encoding="utf-8") as f:
                json.dump(dash_data, f, indent=2, ensure_ascii=False)
            logger.info("Pomyślnie zaktualizowano dashboard.json najświeższym audytem czołówek.")
        except Exception as e:
            logger.error(f"Błąd aktualizacji dashboard.json: {e}")

    # 6. Automatyczny skan live konkurentów lokalnych i prasy SGL
    logger.info("Krok 6: Automatyczny audyt porównawczy PPG vs Rynek Lokalny...")
    try:
        benchmark_res = refresh_live_benchmark()
        logger.info(f"Pomyślnie zaktualizowano benchmark 20 rynków lokalnych: {benchmark_res.get('updated_pairs_count')} par.")
    except Exception as e:
        logger.error(f"Błąd odświeżania benchmarku lokalnego: {e}")

    duration = (datetime.now() - start_time).total_seconds()
    logger.info(f"=== CYKL ZAKOŃCZONY W CZASIE {duration:.1f}s. Autonomia: {autonomy_report.editorial_autonomy_rate_pct}% ===")
    return autonomy_report.model_dump()


if __name__ == "__main__":
    refresh_frontpages_cycle()
