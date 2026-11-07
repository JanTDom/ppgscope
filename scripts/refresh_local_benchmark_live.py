#!/usr/bin/env python3
"""
Skrypt automatycznego odświeżania na żywo pojedynku czołówek: PPG vs Niezależni Konkurenci.
Wykorzystuje bezgłowy Chromium (Puppeteer) do równoległego badania Slotu #1 obu stron,
analizuje syndykację i zbieżność tematyczną oraz aktualizuje local_benchmark.json.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("refresh_benchmark_live")

BENCHMARK_FILE = BASE_DIR / "web" / "public" / "data" / "local_benchmark.json"
COMPETITOR_SCANNER = BASE_DIR / "scripts" / "competitor_hero_scanner.js"
PPG_SCANNER = BASE_DIR / "scripts" / "browser_hero_scanner.js"


def evaluate_topic_convergence(title_a: str, title_b: str) -> bool:
    """Sprawdza zbieżność tematyczną na podstawie wspólnych istotnych słów kluczowych."""
    if not title_a or not title_b:
        return False
    words_a = {w.lower().strip(".,!?:;\"'()[]") for w in title_a.split() if len(w) > 4}
    words_b = {w.lower().strip(".,!?:;\"'()[]") for w in title_b.split() if len(w) > 4}
    stop_words = {"bardzo", "będzie", "został", "została", "zobacz", "sprawdź", "zdjęcia", "wideo", "nowy", "nowa", "gdzie", "kiedy"}
    meaningful_common = (words_a & words_b) - stop_words
    return len(meaningful_common) >= 2 or ("krakow" in words_a and "krakow" in words_b and len(words_a & words_b) >= 1)


def synthesize_verdict(ppg_title: str, ppg_syndicated: bool, comp_title: str, convergence: bool, city: str) -> str:
    """Generuje zwięzłą tezę edytorską oceniającą pojedynek czołówek."""
    if convergence:
        return f"Zbieżność tematyczna w {city}: oba media wiodąco monitorują to samo kluczowe wydarzenie miejskie."
    if ppg_syndicated:
        return f"PPG w {city} stawia na syndykację ogólnopolską/sieciową; rywal niezależny relacjonuje autentyczny temat lokalny."
    return f"Zróżnicowana agenda w {city}: medium PPG i niezależny rywal podejmują odmienne wątki lokalne."


def refresh_live_benchmark(target_pair_ids: list[str] | None = None) -> dict[str, Any]:
    start_time = datetime.now(timezone.utc)
    logger.info("=== ROZPOCZĘCIE LIVE-SKANU BENCHMARKU PPG VS RYNEK LOKALNY ===")

    if not BENCHMARK_FILE.exists():
        logger.error(f"Nie znaleziono pliku bazy: {BENCHMARK_FILE}")
        return {"status": "ERROR", "message": "Plik local_benchmark.json nie istnieje"}

    with open(BENCHMARK_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    pairs = data.get("pairs", [])
    if target_pair_ids:
        target_pairs = [p for p in pairs if p["pair_id"] in target_pair_ids]
    else:
        # Domyślnie bierzemy czołowe metropolie i powiaty reprezentatywne
        target_pairs = pairs

    logger.info(f"Liczba par do odświeżenia live: {len(target_pairs)}")

    # 1. Przygotowanie celów dla konkurentów
    competitor_targets = []
    ppg_domains = []
    for p in target_pairs:
        comp = p["competitor_entity"]
        competitor_targets.append({
            "pair_id": p["pair_id"],
            "domain": comp["domain"],
            "name": comp["name"],
            "url": f"https://{comp['domain']}",
        })
        ppg_domains.append(f"https://{p['ppg_entity']['domain']}")

    # 2. Skanowanie konkurentów przez Chromium
    logger.info("Krok 1: Skanowanie czołówek niezależnych konkurentów przez Chromium...")
    comp_results = {}
    try:
        cmd_comp = ["node", str(COMPETITOR_SCANNER), json.dumps(competitor_targets)]
        proc_comp = subprocess.run(cmd_comp, capture_output=True, text=True, timeout=120, check=True)
        raw_comp = json.loads(proc_comp.stdout)
        for r in raw_comp:
            if r.get("hero_title"):
                comp_results[r["pair_id"]] = r
        logger.info(f"Pomyślnie zbadano konkurentów: {len(comp_results)}/{len(competitor_targets)}")
    except Exception as e:
        logger.error(f"Błąd skanowania konkurentów: {e}")

    # 3. Skanowanie czołówek PPG przez Chromium
    logger.info("Krok 2: Skanowanie czołówek portali PPG przez Chromium...")
    ppg_results = {}
    try:
        cmd_ppg = ["node", str(PPG_SCANNER)] + list(set(ppg_domains))
        proc_ppg = subprocess.run(cmd_ppg, capture_output=True, text=True, timeout=120, check=True)
        raw_ppg = json.loads(proc_ppg.stdout)
        for r in raw_ppg:
            if r.get("portalDomain"):
                ppg_results[r["portalDomain"]] = r
        logger.info(f"Pomyślnie zbadano portale PPG: {len(ppg_results)}/{len(set(ppg_domains))}")
    except Exception as e:
        logger.error(f"Błąd skanowania portali PPG: {e}")

    # 4. Aktualizacja par w benchmarku
    updated_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    now_time_str = datetime.now().strftime("%H:%M")

    for pair in pairs:
        pid = pair["pair_id"]
        ppg_domain = pair["ppg_entity"]["domain"]
        ppg_scan = ppg_results.get(ppg_domain)
        comp_scan = comp_results.get(pid)

        duel = pair.get("duel", {})

        if ppg_scan and ppg_scan.get("title") and not ppg_scan["title"].startswith("Błąd"):
            duel["ppg_hero_title"] = ppg_scan["title"]
            duel["ppg_hero_url"] = ppg_scan.get("url")
            duel["ppg_is_syndicated"] = ppg_scan.get("isCrossDomain", False)
            origin = ppg_scan.get("originDomain") or ppg_domain
            duel["ppg_origin"] = f"Syndykacja ({origin})" if ppg_scan.get("isCrossDomain") else f"Redakcja ({origin})"
            if ppg_scan.get("kicker"):
                duel["ppg_hero_category"] = ppg_scan["kicker"]

        if comp_scan and comp_scan.get("hero_title"):
            duel["competitor_hero_title"] = comp_scan["hero_title"]
            duel["competitor_hero_url"] = comp_scan.get("hero_url")
            if comp_scan.get("hero_category") and comp_scan["hero_category"] != "Wydarzenia lokalne":
                duel["competitor_hero_category"] = comp_scan["hero_category"]
            if comp_scan.get("author") and comp_scan["author"] != "Redakcja lokalna":
                duel["competitor_author"] = comp_scan["author"]

        duel["scan_time"] = f"{now_time_str} (Live DOM Slot #1)"
        duel["last_scanned_iso"] = now_iso

        # Analiza zbieżności i werdyktu
        convergence = evaluate_topic_convergence(duel.get("ppg_hero_title", ""), duel.get("competitor_hero_title", ""))
        duel["topic_convergence"] = convergence
        duel["verdict"] = synthesize_verdict(
            duel.get("ppg_hero_title", ""),
            duel.get("ppg_is_syndicated", False),
            duel.get("competitor_hero_title", ""),
            convergence,
            pair["city"].split(" / ")[0],
        )

        pair["duel"] = duel
        updated_count += 1

    # 5. Aktualizacja metadanych
    data["generated_at"] = now_iso
    data["last_live_scan_at"] = now_iso
    data["live_scan_status"] = "SUCCESS"

    with open(BENCHMARK_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()
    logger.info(f"=== LIVE-SKAN ZAKOŃCZONY W CZASIE {duration:.1f}s. Zaktualizowano par: {updated_count} ===")

    return {
        "status": "SUCCESS",
        "updated_pairs_count": updated_count,
        "scanned_at": now_iso,
        "duration_seconds": round(duration, 1),
    }


if __name__ == "__main__":
    refresh_live_benchmark()
