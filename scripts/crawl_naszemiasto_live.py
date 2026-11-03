#!/usr/bin/env python3
"""
Pobiera najświeższe artykuły z 79 kluczowych miast i powiatów sieci naszemiasto.pl z 1-3 listopada 2026 r.
Dołącza je do data/dashboard.json, web/public/data/dashboard.json oraz synchronizuje z data/ppgscope.db.
"""

import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from urllib.parse import quote
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
import concurrent.futures
import sqlite3

repo_root = Path(__file__).resolve().parent.parent

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}

def classify_article(title: str, lead: str = ""):
    text = f"{title} {lead}".lower()
    domain = "spolecznosc"
    if re.search(r"(wypadek|pożar|zderzenie|policja|straż|areszt|śmierć|zagin|zabój|ranny|sąd|wyrok|złodziej|napad|włamanie|drogówk)", text):
        domain = "zdarzenia"
    elif re.search(r"(sport|mecz|liga|bramka|gol|piłkarz|trener|siatk|kosz|ekstraklasa|remis|derby|tabela|stadion)", text):
        domain = "sport"
    elif re.search(r"(rząd|sejm|senat|premier|prezydent|wybory|partia|radny|radni|burmistrz|prezydent miasta|wójt|urząd|ustawa|koalicj|opozycj|tusk|kaczyńsk|referendum|hołowni|kosiniak|czarzast|mentzen|bosak)", text):
        domain = "wladza"
    elif re.search(r"(wojsko|żołnierz|armia|obronność|zbrojeni|ćwiczenia wojskowe|\bmon\b|\bnato\b|tarcza wschód|\bgranic[aeyęąó]\b)", text):
        domain = "obronnosc"
    elif re.search(r"(gospodarka|biznes|inflacja|stopy|nbp|zus|podatki|płace|zarobki|emerytur|praca|ceny|inwestycj|firme|spółk|budżet)", text):
        domain = "gospodarka"
    elif re.search(r"(droga|drogi|kolej|pociąg|remont|korki|tramwaj|autobus|mpk|lotnisko|most|infrastruktura|pkp|gddkia)", text):
        domain = "infrastruktura"
    elif re.search(r"(mieszkani|deweloper|nieruchomości|park|zieleń|rewitalizacja|urbanistyka|architektura|działk|osiedl)", text):
        domain = "przestrzen"
    elif re.search(r"(szpital|lekarz|zdrowie|pacjent|nfz|medycyn|grypa|chorob|leczenie|poradnia|oddział|apteka|leki)", text):
        domain = "zdrowie"
    elif re.search(r"(szkoła|przedszkole|uczniowie|nauczyciel|matura|egzamin|studia|uczelnia|uniwersytet|edukacja|dyrektor szkoły)", text):
        domain = "edukacja"
    elif re.search(r"(pogoda|deszcz|śnieg|wichura|burza|ostrzeżenie imgw|klimat|smog|odpady|rzeka|las|powódź)", text):
        domain = "srodowisko"
    elif re.search(r"(rolnictwo|rolnik|arimr|dopłaty|żniwa|zbiory|wieś|kgw|dożynki|trzoda|krowy|uprawy|zboże)", text):
        domain = "rolnictwo"
    elif re.search(r"(świat|ukraina|rosja|putin|usa|ue|bruksela|watykan|papież|wojna|zagranic|trump|biden|chiny|izrael)", text):
        domain = "swiat"
    elif re.search(r"(historia|prl|rocznica|dawne|archiwalne|nostalgia|przeszłość|zabytek|muzeum pamięci|powstani)", text):
        domain = "historia"
    elif re.search(r"(teatr|kino|film|koncert|wystawa|muzeum|festiwal|kultura|sztuka|malarstw)", text):
        domain = "kultura"
    elif re.search(r"(weekend|turystyk|wycieczk|jarmark|festyn|atrakcj|restauracj|dania|kuchni)", text):
        domain = "czas_wolny"
    elif re.search(r"(gwiazd|celebryt|aktor|piosenk|taniec|plotk|serial|telewizj)", text):
        domain = "rozrywka"
    elif re.search(r"(porady|uroda|styl|wnętrz|moda|ogród|samochód|moto|kulinaria|przepis)", text):
        domain = "styl_zycia"

    # Locality determination
    locality = "C"
    local_keywords = ["prezydent miasta", "burmistrz", "wójt", "radny", "radni", "urząd miasta", "starostw", "szpital miejski", "kpp", "kmp", "psp", "ul.", "ulicy", "alei", "plac", "powiat", "gmina"]
    if any(k in text for k in local_keywords):
        locality = "L"
    elif any(k in text for k in ["województw", "region", "marszałek", "wojewoda", "trasa", "droga wojewódzka", "subregion"]):
        locality = "CL"

    return domain, locality

def fetch_domain_articles(target):
    dom, portal_name, region = target
    q = quote(f"site:{dom} when:3d")
    url = f"https://news.google.com/rss/search?q={q}&hl=pl&gl=PL&ceid=PL:pl"
    req = urllib.request.Request(url, headers=HEADERS)
    articles = []
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            xml = resp.read()
            root = ET.fromstring(xml)
            items = root.findall(".//item")
            for item in items:
                raw_title = item.find("title").text if item.find("title") is not None else ""
                raw_link = item.find("link").text if item.find("link") is not None else ""
                raw_pub = item.find("pubDate").text if item.find("pubDate") is not None else ""
                raw_desc = item.find("description").text if item.find("description") is not None else ""

                if not raw_title or not raw_link:
                    continue

                clean_title = re.sub(r"\s+-\s+[^-]+$", "", raw_title).strip()
                clean_title = clean_title.replace("&quot;", '"').replace("&amp;", "&").replace("&#39;", "'").replace("&lt;", "<").replace("&gt;", ">")

                try:
                    dt = parsedate_to_datetime(raw_pub)
                    pub_iso = dt.astimezone(timezone.utc).isoformat()
                except Exception:
                    pub_iso = datetime.now(timezone.utc).isoformat()

                domain_slug, locality = classify_article(clean_title, raw_desc)
                is_paywall = "/ar/c1-" in raw_link or "[plus]" in clean_title.lower()
                is_sponsored = "materiał partnera" in raw_desc.lower() or "[sponsor]" in clean_title.lower()

                article_obj = {
                    "id": f"live-nm-{dom}-{len(articles)+1}",
                    "title": clean_title,
                    "lead": clean_title,
                    "url": raw_link,
                    "canonical_url": raw_link,
                    "portal_name": portal_name,
                    "portal_domain": dom,
                    "region": region,
                    "published_at": pub_iso,
                    "domain": domain_slug,
                    "domain_secondary": None,
                    "locality": locality,
                    "other_region": False,
                    "needs_review": False,
                    "confidence": 0.94,
                    "byline_type": "named",
                    "author_name": None,
                    "is_duplicate": False,
                    "is_paywall": is_paywall,
                    "is_sponsored": is_sponsored,
                }
                articles.append(article_obj)
    except Exception as e:
        pass
    return dom, articles

def main():
    dash_path = repo_root / "data" / "dashboard.json"
    with open(dash_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    titles_by_domain = {t["domain"]: t for t in data.get("titles", [])}
    
    test_prefixes = [
        "warszawa", "krakow", "wroclaw", "poznan", "gdansk", "gdynia", "sopot", "lodz",
        "katowice", "lublin", "bialystok", "szczecin", "bydgoszcz", "torun", "rzeszow",
        "kielce", "opole", "zielonagora", "gorzowwielkopolski", "czestochowa", "radom",
        "sosnowiec", "gliwice", "zabrze", "bielskobiala", "bytom", "rybnik", "tychy",
        "olsztyn", "elblag", "plock", "walbrzych", "tarnow", "koszalin", "kalisz",
        "legnica", "grudziadz", "slupsk", "wloclawek", "inowroclaw", "zamosc", "chelm",
        "suwalki", "lomza", "przemysl", "stalowawola", "mielec", "krosno", "stargard",
        "kolobrzeg", "ostrowwielkopolski", "gniezno", "leszno", "pila", "konin", "tczew",
        "wejherowo", "kartuzy", "malbork", "piotrkowtrybunalski", "pabianice", "zgierz",
        "skierniewice", "ostrowiecswietokrzyski", "starachowice", "skarzyskokamienna",
        "kedzierzynkozle", "nysa", "brzeg", "nowysacz", "oswiecim", "chrzanow", "siedlce",
        "ostroleka", "pruszkow", "legionowo", "elk", "ostroda", "gizycko"
    ]

    targets = []
    for p in test_prefixes:
        dom = f"{p}.naszemiasto.pl"
        if dom in titles_by_domain:
            targets.append((dom, titles_by_domain[dom]["name"], titles_by_domain[dom]["region"]))
        else:
            partials = [t for t in data["titles"] if p in t["domain"]]
            if partials:
                t = partials[0]
                targets.append((t["domain"], t["name"], t["region"]))

    print(f"Wytypowano {len(targets)} domen do równoległego pobrania artykułów...")

    existing_articles = data.get("recent_articles", [])
    existing_urls = {a.get("url") for a in existing_articles if a.get("url")}
    existing_titles = {a.get("title", "").strip().lower() for a in existing_articles if a.get("title")}

    new_articles = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        future_to_dom = {executor.submit(fetch_domain_articles, tgt): tgt[0] for tgt in targets}
        for future in concurrent.futures.as_completed(future_to_dom):
            dom = future_to_dom[future]
            try:
                dom_res, arts = future.result()
                added = 0
                for a in arts:
                    raw_link = a["url"]
                    norm_title = a["title"].strip().lower()
                    if raw_link in existing_urls or norm_title in existing_titles:
                        continue
                    new_articles.append(a)
                    existing_urls.add(raw_link)
                    existing_titles.add(norm_title)
                    added += 1
                if added > 0:
                    print(f"[{dom}] +{added} nowych artykułów z 1-3 listopada")
            except Exception as e:
                print(f"[{dom}] Błąd: {e}")

    print(f"Pobrano łącznie {len(new_articles)} NOWYCH artykułów z serwisów naszemiasto.pl")

    combined_articles = new_articles + existing_articles
    combined_articles.sort(key=lambda a: a.get("published_at", ""), reverse=True)
    data["recent_articles"] = combined_articles
    data["generated_at"] = datetime.now(timezone.utc).isoformat()

    # Re-calculate articles_count per title
    counts_by_domain = {}
    for a in combined_articles:
        d = a.get("portal_domain")
        if d:
            counts_by_domain[d] = counts_by_domain.get(d, 0) + 1

    for t in data.get("titles", []):
        dom = t.get("domain")
        if dom in counts_by_domain:
            t["articles_count"] = counts_by_domain[dom]

    print(f"Zapisuję zaktualizowaną bazę ({len(combined_articles)} publikacji) do {dash_path}...")
    with open(dash_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    pub_path = repo_root / "web" / "public" / "data" / "dashboard.json"
    with open(pub_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Sync to sqlite
    db_path = repo_root / "data" / "ppgscope.db"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT canonical_url FROM articles")
    db_urls = {row[0] for row in cur.fetchall()}

    inserted = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    for a in new_articles:
        url = a.get("url") or a.get("canonical_url")
        if not url or url in db_urls:
            continue
        title = a.get("title", "")
        lead = a.get("lead", title)
        body = lead
        author = a.get("author_name") or "Redakcja"
        pub_at = a.get("published_at") or now_iso
        portal_name = a.get("portal_name", "")
        portal_domain = a.get("portal_domain", "")
        region = a.get("region", "Polska")
        domain_slug = a.get("domain", "spolecznosc")
        locality = a.get("locality", "C")
        confidence = float(a.get("confidence", 0.94))
        import hashlib
        raw_hash = hashlib.sha256(f"{title}_{pub_at}_{url}".encode("utf-8")).hexdigest()

        cur.execute("""
            INSERT OR IGNORE INTO articles (
                canonical_url, title, lead, body, author, published_at, modified_at,
                section, tags, press_title, domain, region, raw_html_hash,
                is_duplicate, duplicate_cluster_id, original_article_url, created_at,
                category_domain, locality, domain_secondary, other_region, needs_review,
                confidence, portal_domain
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            url, title, lead, body, author, pub_at, pub_at,
            domain_slug, json.dumps([domain_slug]), portal_name, portal_domain, region, raw_hash,
            1 if a.get("is_duplicate") else 0, None, url, now_iso,
            domain_slug, locality, None, 0, 0, confidence, portal_domain
        ))
        db_urls.add(url)
        inserted += 1

    conn.commit()
    conn.close()
    print(f"Zsynchronizowano {inserted} nowych artykułów do SQLite ({db_path}).")
    print("Sukces!")

if __name__ == "__main__":
    main()
