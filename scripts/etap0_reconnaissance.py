import sys
import re
import json
import time
from pathlib import Path
from datetime import datetime, timezone
import yaml
import httpx

from ppgscope.ingest.client import PoliteHttpClient
from ppgscope.ingest.extractor import HtmlArticleExtractor
from ppgscope.ingest.sitemap import SitemapParser
from ppgscope.ingest.rss import RssParser


# 1. Complete list of PPG domains identified directly from primary sources:
#    - Official network footers of Polska Press media (gazetakrakowska.pl, i.pl)
#    - Corporate advertising network (mediappg.pl)
#    - Official privacy and publisher declarations (prywatnosc.polskapress.pl)
CANDIDATE_DOMAINS = [
    # Regional Dailies
    {"id": "dziennik-baltycki", "name": "Dziennik Bałtycki", "domain": "dziennikbaltycki.pl", "region": "Pomorskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "dziennik-lodzki", "name": "Dziennik Łódzki", "domain": "dzienniklodzki.pl", "region": "Łódzkie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "dziennik-polski", "name": "Dziennik Polski", "domain": "dziennikpolski24.pl", "region": "Małopolskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "dziennik-zachodni", "name": "Dziennik Zachodni", "domain": "dziennikzachodni.pl", "region": "Śląskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "echo-dnia", "name": "Echo Dnia", "domain": "echodnia.eu", "region": "Świętokrzyskie / Mazowieckie / Podkarpackie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "express-bydgoski", "name": "Express Bydgoski", "domain": "expressbydgoski.pl", "region": "Kujawsko-Pomorskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "express-ilustrowany", "name": "Express Ilustrowany", "domain": "expressilustrowany.pl", "region": "Łódzkie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "gazeta-krakowska", "name": "Gazeta Krakowska", "domain": "gazetakrakowska.pl", "region": "Małopolskie", "type": "regional_daily", "source_url": "https://mediappg.pl"},
    {"id": "gazeta-lubuska", "name": "Gazeta Lubuska", "domain": "gazetalubuska.pl", "region": "Lubuskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "gazeta-pomorska", "name": "Gazeta Pomorska", "domain": "pomorska.pl", "region": "Kujawsko-Pomorskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "gazeta-wroclawska", "name": "Gazeta Wrocławska", "domain": "gazetawroclawska.pl", "region": "Dolnośląskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "gazeta-wspolczesna", "name": "Gazeta Współczesna", "domain": "wspolczesna.pl", "region": "Podlaskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "glos-wielkopolski", "name": "Głos Wielkopolski", "domain": "gloswielkopolski.pl", "region": "Wielkopolskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "glos-szczecinski", "name": "Głos Szczeciński", "domain": "gs24.pl", "region": "Zachodniopomorskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "glos-koszalinski", "name": "Głos Koszaliński", "domain": "gk24.pl", "region": "Zachodniopomorskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "glos-pomorza", "name": "Głos Pomorza", "domain": "gp24.pl", "region": "Pomorskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "kurier-lubelski", "name": "Kurier Lubelski", "domain": "kurierlubelski.pl", "region": "Lubelskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "kurier-poranny", "name": "Kurier Poranny", "domain": "poranny.pl", "region": "Podlaskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "nto", "name": "Nowa Trybuna Opolska (NTO)", "domain": "nto.pl", "region": "Opolskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "nowiny", "name": "Nowiny", "domain": "nowiny24.pl", "region": "Podkarpackie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "nowosci-torun", "name": "Nowości – Dziennik Toruński", "domain": "nowosci.com.pl", "region": "Kujawsko-Pomorskie", "type": "regional_daily", "source_url": "https://gazetakrakowska.pl"},
    {"id": "polskatimes", "name": "Polska Metropolia Warszawska / polskatimes.pl", "domain": "polskatimes.pl", "region": "Mazowieckie", "type": "archived", "source_url": "https://gazetakrakowska.pl"},

    # National & Thematic Portals
    {"id": "i-pl", "name": "i.pl", "domain": "i.pl", "region": "Ogólnopolski", "type": "national_portal", "source_url": "https://gazetakrakowska.pl"},
    {"id": "strefa-biznesu", "name": "Strefa Biznesu", "domain": "strefabiznesu.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "strefa-agro", "name": "Strefa Agro", "domain": "strefaagro.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "gol24", "name": "GOL24", "domain": "gol24.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "sportowy24", "name": "Sportowy24", "domain": "sportowy24.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "motofakty", "name": "MotoFakty", "domain": "motofakty.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "strona-kobiet", "name": "Strona Kobiet", "domain": "stronakobiet.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "strona-zdrowia", "name": "Strona Zdrowia", "domain": "stronazdrowia.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "strona-kuchni", "name": "Strona Kuchni", "domain": "stronakuchni.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "strona-podrozy", "name": "Strona Podróży", "domain": "stronapodrozy.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "strefa-edukacji", "name": "Strefa Edukacji", "domain": "strefaedukacji.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "telemagazyn", "name": "Tele Magazyn", "domain": "telemagazyn.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "shownews", "name": "ShowNews", "domain": "shownews.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "regiodom", "name": "RegioDom", "domain": "regiodom.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "strefa-obrony", "name": "Strefa Obrony", "domain": "strefaobrony.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "gra-pl", "name": "Gra.pl", "domain": "gra.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},
    {"id": "nasza-historia", "name": "Nasza Historia", "domain": "naszahistoria.pl", "region": "Ogólnopolski", "type": "vertical", "source_url": "https://gazetakrakowska.pl"},

    # Local Network
    {"id": "nasze-miasto", "name": "Nasze Miasto", "domain": "naszemiasto.pl", "region": "Ogólnopolski (lokalny)", "type": "local_network", "source_url": "https://gazetakrakowska.pl"},

    # Corporate & Advertising
    {"id": "polska-press-corp", "name": "Polska Press Sp. z o.o.", "domain": "polskapress.pl", "region": "Polska", "type": "corporate", "source_url": "https://mediappg.pl"},
    {"id": "media-ppg", "name": "Media PPG (Biuro Reklamy)", "domain": "mediappg.pl", "region": "Polska", "type": "corporate", "source_url": "https://gazetakrakowska.pl"},
]


def run_reconnaissance():
    client = PoliteHttpClient(rate_limit_per_domain_sec=0.5, timeout=8.0)
    verification_time = datetime.now(timezone.utc).isoformat()

    registry_entries = []
    extraction_results = []
    problematic_domains = []
    archive_depths = {}

    print(f"=== ROZPOCZYNAM ROZPOZNANIE ETAPU 0 ({len(CANDIDATE_DOMAINS)} domen) ===")

    for item in CANDIDATE_DOMAINS:
        domain = item["domain"]
        print(f"\nBadam domenę: {domain} ({item['name']})...")

        entry = {
            "id": item["id"],
            "name": item["name"],
            "domain": domain,
            "region": item["region"],
            "type": item["type"],
            "verification_date": verification_time,
            "source_proof_url": item["source_url"],
            "robots_url": f"https://{domain}/robots.txt",
            "robots_status": None,
            "google_news_sitemap": f"https://{domain}/google_news/",
            "google_news_status": None,
            "master_sitemap": f"https://{domain}/sitemapa/",
            "master_sitemap_status": None,
            "rss_url": f"https://{domain}/rss",
            "rss_status": None,
            "overall_status": "DZIAŁA",
            "notes": None,
        }

        # 1. Test robots.txt
        try:
            r = client.get(entry["robots_url"])
            entry["robots_status"] = r.status_code
        except Exception as e:
            entry["robots_status"] = f"BŁĄD: {type(e).__name__}"

        # 2. Test google_news
        news_items = []
        try:
            r = client.get(entry["google_news_sitemap"])
            entry["google_news_status"] = r.status_code
            if r.status_code == 200:
                news_items = SitemapParser.parse_google_news(r.text)
        except Exception as e:
            entry["google_news_status"] = f"BŁĄD: {type(e).__name__}"

        # 3. Test master sitemap
        try:
            r = client.get(entry["master_sitemap"])
            entry["master_sitemap_status"] = r.status_code
            if r.status_code == 200:
                # Find sub-sitemaps and estimate archive depth
                submaps = re.findall(r'<loc>\s*(https?://[^\s<]+)\s*</loc>', r.text)
                if submaps:
                    # check first submap
                    try:
                        r_first = client.get(submaps[0])
                        dates = sorted(re.findall(r'<lastmod>([^<]+)</lastmod>', r_first.text))
                        if dates:
                            archive_depths[domain] = {
                                "submaps_count": len(submaps),
                                "earliest_lastmod": dates[0],
                                "sample_recent": dates[-1] if len(dates) > 1 else dates[0],
                            }
                        else:
                            archive_depths[domain] = {"submaps_count": len(submaps), "earliest_lastmod": "brak lastmod w submapie"}
                    except Exception as ex:
                        archive_depths[domain] = {"submaps_count": len(submaps), "earliest_lastmod": f"błąd odczytu: {ex}"}
                else:
                    dates = sorted(re.findall(r'<lastmod>([^<]+)</lastmod>', r.text))
                    archive_depths[domain] = {
                        "submaps_count": 1,
                        "earliest_lastmod": dates[0] if dates else "brak lastmod",
                    }
            else:
                archive_depths[domain] = {"submaps_count": 0, "earliest_lastmod": "niedostępna sitemapa"}
        except Exception as e:
            entry["master_sitemap_status"] = f"BŁĄD: {type(e).__name__}"
            archive_depths[domain] = {"submaps_count": 0, "earliest_lastmod": f"błąd: {e}"}

        # 4. Test RSS
        try:
            r = client.get(entry["rss_url"])
            entry["rss_status"] = r.status_code
        except Exception as e:
            entry["rss_status"] = f"BŁĄD: {type(e).__name__}"

        # Evaluate Overall Status
        if entry["robots_status"] == 410 or entry["google_news_status"] == 410:
            entry["overall_status"] = "WYCOFANA"
            entry["notes"] = "HTTP 410 Gone: domena wygaszona i zastąpiona w portfolio"
            problematic_domains.append({"domain": domain, "reason": "HTTP 410 Gone (wycofana)"})
        elif entry["google_news_status"] == 403 or entry["robots_status"] == 403:
            entry["overall_status"] = "BLOKADA"
            entry["notes"] = "HTTP 403 Cloudflare Managed Challenge (ochrona antybotowa)"
            problematic_domains.append({"domain": domain, "reason": "Cloudflare Challenge 403"})
        elif entry["google_news_status"] == 404 and entry["rss_status"] == 404:
            entry["overall_status"] = "BRAK_SITEMAPY"
            entry["notes"] = "Brak endpointów news i rss"
            problematic_domains.append({"domain": domain, "reason": "Brak google_news i rss"})

        registry_entries.append(entry)

        # If google_news returned items, use them; otherwise try RSS items
        article_candidates = [it.loc for it in news_items]
        if not article_candidates and entry["rss_status"] == 200:
            try:
                r_rss = client.get(entry["rss_url"])
                if r_rss.status_code == 200:
                    rss_channel = RssParser.parse(r_rss.text)
                    article_candidates = [it.link for it in rss_channel.items]
            except Exception as e:
                pass

        # 5. Extraction test on 3 articles if available
        if article_candidates:
            print(f"  Testuję ekstrakcję 3 artykułów z {domain}...")
            tested_articles = article_candidates[:3]
            for idx, art_url in enumerate(tested_articles, start=1):
                try:
                    r_art = client.get(art_url)
                    if r_art.status_code == 200:
                        art = HtmlArticleExtractor.extract(
                            html_content=r_art.text,
                            fallback_url=art_url,
                            press_title_hint=item["name"],
                            region_hint=item["region"],
                        )
                        
                        # Validate fields
                        f_title = "OK" if art.title and len(art.title) > 5 else "BŁĄD (pusty lub krótki)"
                        f_date = "OK" if art.published_at else "BŁĄD (brak daty)"
                        f_author = "OK" if art.author else "BŁĄD (brak autora w stopce/meta)"
                        f_section = "OK" if art.section else "BŁĄD (brak sekcji)"
                        f_body = "OK" if art.body and len(art.body) > 100 else f"BŁĄD (długość: {len(art.body) if art.body else 0})"
                        f_canonical = "OK" if art.canonical_url and art.canonical_url.startswith("http") else "BŁĄD (niepoprawny URL)"

                        extraction_results.append({
                            "domain": domain,
                            "article_idx": idx,
                            "url": art_url,
                            "title": f_title,
                            "date": f_date,
                            "author": f_author,
                            "section": f_section,
                            "body": f_body,
                            "canonical": f_canonical,
                        })
                    else:
                        extraction_results.append({
                            "domain": domain,
                            "article_idx": idx,
                            "url": art_url,
                            "title": f"BŁĄD HTTP {r_art.status_code}",
                            "date": "-",
                            "author": "-",
                            "section": "-",
                            "body": "-",
                            "canonical": "-",
                        })
                except Exception as ex:
                    extraction_results.append({
                        "domain": domain,
                        "article_idx": idx,
                        "url": art_url,
                        "title": f"BŁĄD: {type(ex).__name__}",
                        "date": "-",
                        "author": "-",
                        "section": "-",
                        "body": "-",
                        "canonical": "-",
                    })

    # Save to sources/ppg_registry.yaml
    out_dir = Path(__file__).resolve().parent.parent / "sources"
    out_dir.mkdir(parents=True, exist_ok=True)
    registry_file = out_dir / "ppg_registry.yaml"

    with open(registry_file, "w", encoding="utf-8") as f:
        yaml.dump(
            {
                "version": "1.0.0",
                "verified_at": verification_time,
                "total_domains": len(registry_entries),
                "active_domains": sum(1 for e in registry_entries if e["overall_status"] == "DZIAŁA"),
                "problematic_domains": len(problematic_domains),
                "entries": registry_entries,
            },
            f,
            allow_unicode=True,
            sort_keys=False,
        )

    # Save extraction results and archive depths as JSON for report compilation
    with open(out_dir / "extraction_audit.json", "w", encoding="utf-8") as f:
        json.dump(extraction_results, f, ensure_ascii=False, indent=2)

    with open(out_dir / "archive_depths.json", "w", encoding="utf-8") as f:
        json.dump(archive_depths, f, ensure_ascii=False, indent=2)

    with open(out_dir / "problematic_domains.json", "w", encoding="utf-8") as f:
        json.dump(problematic_domains, f, ensure_ascii=False, indent=2)

    print(f"\n=== ZAKOŃCZONO ROZPOZNANIE ===")
    print(f"Rejestr zapisany: {registry_file}")
    print(f"Liczba zbadanych domen: {len(registry_entries)}")
    print(f"Liczba przetestowanych artykułów: {len(extraction_results)}")
    print(f"Liczba domen problematycznych: {len(problematic_domains)}")


if __name__ == "__main__":
    run_reconnaissance()
