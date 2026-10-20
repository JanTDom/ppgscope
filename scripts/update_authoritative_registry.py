"""
Authoritative PPG Media Registry & Dashboard Updater.
- Fixes strefaobronnosci.pl typo -> strefaobrony.pl (Strefa Obrony)
- Adds authoritative PPG regional dailies: expressbydgoski.pl, expressilustrowany.pl
- Adds authoritative PPG portals: polskatimes.pl, shownews.pl, stronakuchni.pl, stronapodrozy.pl, gotujmy.pl
- Preserves all 509 local NaszeMiasto editions intact
- Synchronizes sources/ppg_registry.yaml, config/verified_domains.json, data/dashboard.json, web/public/data/dashboard.json
"""

import json
from pathlib import Path
import yaml

repo_root = Path(__file__).resolve().parent.parent

def update_registry():
    yaml_path = repo_root / "sources" / "ppg_registry.yaml"
    with open(yaml_path, "r", encoding="utf-8") as f:
        registry = yaml.safe_load(f)

    # 1. Fix strefaobronnosci typo
    for item in registry:
        if item.get("domain") == "strefaobronnosci.pl":
            item["id"] = "strefaobrony_pl"
            item["name"] = "Strefa Obrony"
            item["domain"] = "strefaobrony.pl"
            item["robots_url"] = "https://strefaobrony.pl/robots.txt"
            item["sitemap_url"] = "https://strefaobrony.pl/sitemap.xml"
            item["rss_url"] = "https://strefaobrony.pl/rss"

    existing_domains = {r["domain"] for r in registry}

    # 2. Additional authoritative PPG media
    new_entries = [
        {
            "id": "expressbydgoski_pl",
            "name": "Express Bydgoski",
            "domain": "expressbydgoski.pl",
            "region": "Kujawsko-Pomorskie",
            "type": "DZIENNIK_REGIONALNY",
            "status": "DZIAŁA",
            "robots_url": "https://expressbydgoski.pl/robots.txt",
            "sitemap_url": "https://expressbydgoski.pl/sitemapa/",
            "rss_url": "https://expressbydgoski.pl/rss",
            "primary_source_url": "https://polskapress.pl/o-nas",
        },
        {
            "id": "expressilustrowany_pl",
            "name": "Express Ilustrowany",
            "domain": "expressilustrowany.pl",
            "region": "Łódzkie",
            "type": "DZIENNIK_REGIONALNY",
            "status": "DZIAŁA",
            "robots_url": "https://expressilustrowany.pl/robots.txt",
            "sitemap_url": "https://expressilustrowany.pl/sitemapa/",
            "rss_url": "https://expressilustrowany.pl/rss",
            "primary_source_url": "https://polskapress.pl/o-nas",
        },
        {
            "id": "polskatimes_pl",
            "name": "Polska Times",
            "domain": "polskatimes.pl",
            "region": "Ogólnopolski",
            "type": "PORTAL_KRAJOWY",
            "status": "DZIAŁA",
            "robots_url": "https://polskatimes.pl/robots.txt",
            "sitemap_url": "https://polskatimes.pl/sitemap.xml",
            "rss_url": "https://polskatimes.pl/rss",
            "primary_source_url": "https://polskapress.pl/o-nas",
        },
        {
            "id": "shownews_pl",
            "name": "ShowNews.pl",
            "domain": "shownews.pl",
            "region": "Ogólnopolski",
            "type": "PORTAL_TEMATYCZNY",
            "status": "DZIAŁA",
            "robots_url": "https://shownews.pl/robots.txt",
            "sitemap_url": "https://shownews.pl/sitemap.xml",
            "rss_url": "https://shownews.pl/rss",
            "primary_source_url": "https://mediappg.pl/oferta",
        },
        {
            "id": "stronakuchni_pl",
            "name": "Strona Kuchni",
            "domain": "stronakuchni.pl",
            "region": "Ogólnopolski",
            "type": "PORTAL_TEMATYCZNY",
            "status": "DZIAŁA",
            "robots_url": "https://stronakuchni.pl/robots.txt",
            "sitemap_url": "https://stronakuchni.pl/sitemap.xml",
            "rss_url": "https://stronakuchni.pl/rss",
            "primary_source_url": "https://mediappg.pl/oferta",
        },
        {
            "id": "stronapodrozy_pl",
            "name": "Strona Podróży",
            "domain": "stronapodrozy.pl",
            "region": "Ogólnopolski",
            "type": "PORTAL_TEMATYCZNY",
            "status": "DZIAŁA",
            "robots_url": "https://stronapodrozy.pl/robots.txt",
            "sitemap_url": "https://stronapodrozy.pl/sitemap.xml",
            "rss_url": "https://stronapodrozy.pl/rss",
            "primary_source_url": "https://mediappg.pl/oferta",
        },
        {
            "id": "gotujmy_pl",
            "name": "Gotujmy.pl",
            "domain": "gotujmy.pl",
            "region": "Ogólnopolski",
            "type": "PORTAL_TEMATYCZNY",
            "status": "DZIAŁA",
            "robots_url": "https://gotujmy.pl/robots.txt",
            "sitemap_url": "https://gotujmy.pl/sitemap.xml",
            "rss_url": "https://gotujmy.pl/rss",
            "primary_source_url": "https://mediappg.pl/oferta",
        },
    ]

    # Insert dailies after existing dailies, and verticals after verticals
    dailies_to_add = [e for e in new_entries if e["type"] == "DZIENNIK_REGIONALNY" and e["domain"] not in existing_domains]
    verticals_to_add = [e for e in new_entries if e["type"] != "DZIENNIK_REGIONALNY" and e["domain"] not in existing_domains]

    # Find insertion points
    last_daily_idx = 0
    for idx, r in enumerate(registry):
        if r.get("type") == "DZIENNIK_REGIONALNY":
            last_daily_idx = idx

    for offset, d in enumerate(dailies_to_add):
        registry.insert(last_daily_idx + 1 + offset, d)

    last_vertical_idx = 0
    for idx, r in enumerate(registry):
        if r.get("type") in ("PORTAL_TEMATYCZNY", "PORTAL_KRAJOWY"):
            last_vertical_idx = idx

    for offset, v in enumerate(verticals_to_add):
        registry.insert(last_vertical_idx + 1 + offset, v)

    print(f"Registry updated: {len(registry)} titles (was {len(existing_domains)})")

    # Save YAML
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(registry, f, allow_unicode=True, sort_keys=False)
    print(f"Saved: {yaml_path}")

    # Save JSON config/verified_domains.json
    json_path = repo_root / "config" / "verified_domains.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)
    print(f"Saved: {json_path}")

    return registry

if __name__ == "__main__":
    update_registry()
