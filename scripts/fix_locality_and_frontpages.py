#!/usr/bin/env python3
"""
Skrypt korygujący klasyfikację lokalności i integrujący audyt autonomii czołówek w dashboard.json.
Usuwa błąd kwalifikowania tematów miejskich i komunalnych jako 'C' (zrzut z Warszawy).
"""

import json
import os
import re
from collections import Counter

DASHBOARD_PATH = "web/public/data/dashboard.json"

LOCAL_THEMES = [
    r'park\s+miejsk', r'osiedl', r'centrum\s+przesiadkow', r'arteri', r'centrum\s+miasta',
    r'odpad', r'gabaryt', r'gmin', r'żłobek\s+miejsk', r'budżet\s+obywatelsk',
    r'schronisk', r'droga\s+krajow', r'droga\s+wojewódzk', r'teatr', r'remont',
    r'rewitalizacj', r'linia\s+autobusow', r'mieszkańc', r'rondo', r'skrzyżowani',
    r'szkoł', r'liceum', r'szpital', r'prezydent\s+miasta', r'burmistrz', r'wójt',
    r'starost', r'radn', r'urząd\s+miasta', r'urząd\s+gminy', r'magistrat',
    r'kpp', r'kmp', r'psp', r'osp', r'komenda', r'wypadek', r'kolizj', r'pożar',
    r'zderzeni', r'tragedi', r'policjanc', r'strażac', r'parafi', r'proboszcz',
    r'sukiennic', r'wawel', r'anwil', r'górnik\s+zabrze', r'wisła\s+kraków',
    r'cracovia', r'lech\s+poznań', r'lechia\s+gdańsk', r'śląsk\s+wrocław', r'widzew',
    r'korona\s+kielce', r'zajazd', r'rybi\s+rynek', r'beniaminek'
]

LOCAL_COMPILED = [re.compile(p, re.IGNORECASE) for p in LOCAL_THEMES]

REGIONAL_WORDS = [
    'województw', 'marszałek', 'wojewoda', 'subregion', 'dolny śląsk', 'kujaw',
    'pomorz', 'lubelszczyzn', 'lubusk', 'ziemia łódzka', 'małopolsk', 'mazowsz',
    'opolszczyzn', 'podkarpaci', 'podlas', 'śląsk', 'zagłębi', 'świętokrzysk',
    'warmia', 'mazur', 'wielkopolsk', 'pomorze zachodnie'
]

def main():
    if not os.path.exists(DASHBOARD_PATH):
        print(f"Błąd: {DASHBOARD_PATH} nie istnieje.")
        return

    with open(DASHBOARD_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    articles = data.get("recent_articles", [])
    print(f"Wczytano {len(articles)} artykułów z {DASHBOARD_PATH}.")

    reclassified_count = 0
    stats_before = Counter(a.get("locality", "MISSING") for a in articles)

    for a in articles:
        title = a.get("title", "")
        lead = a.get("lead", "")
        text = f"{title} {lead}"
        dom = a.get("portal_domain", "").lower()

        # Miasto z domeny (np. tarnow z tarnow.naszemiasto.pl)
        city_sub = dom.split(".")[0].lower() if "naszemiasto.pl" in dom else ""

        is_local = False
        is_cl = False

        # Sprawdzenie obecności tematów miejskich / komunalnych
        if any(rgx.search(text) for rgx in LOCAL_COMPILED):
            is_local = True
        elif city_sub and len(city_sub) > 2 and city_sub in text.lower():
            is_local = True
        elif any(w in text.lower() for w in REGIONAL_WORDS):
            is_cl = True

        old_loc = a.get("locality")
        new_loc = "L" if is_local else ("CL" if is_cl else "C")

        if old_loc != new_loc:
            a["locality"] = new_loc
            reclassified_count += 1

    stats_after = Counter(a.get("locality", "MISSING") for a in articles)
    print(f"Rozkład przed: {dict(stats_before)}")
    print(f"Rozkład po:    {dict(stats_after)}")
    print(f"Liczba zmodyfikowanych rekordów: {reclassified_count}")

    # Sprawdzenie unikalnych domen (symulacja jedynek per portal)
    domains_map = {}
    for a in sorted(articles, key=lambda x: x.get("published_at", ""), reverse=True):
        dom = a.get("portal_domain")
        if dom not in domains_map:
            domains_map[dom] = a

    fp_stats = Counter(a.get("locality") for a in domains_map.values())
    print(f"Nowe statystyki jedynek dla 549 portali: {dict(fp_stats)}")

    # Dołączenie audytu autonomii z pliku wygenerowanego przez skaner
    autonomy_report_file = "reports/press_analysis/2026-11-07/editorial_autonomy_and_frontpages_report.json"
    if os.path.exists(autonomy_report_file):
        with open(autonomy_report_file, "r", encoding="utf-8") as rf:
            autonomy_data = json.load(rf)
            if "editorial_intelligence" not in data:
                data["editorial_intelligence"] = {}
            data["editorial_intelligence"]["editorial_autonomy_audit"] = autonomy_data
            print("Pomyślnie zintegrowano audyt autonomii czołówek z Chromium w dashboard.json.")

    with open(DASHBOARD_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("Zapisano zaktualizowany dashboard.json.")

if __name__ == "__main__":
    main()
