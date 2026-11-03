#!/usr/bin/env python3
"""
Szybki, równoległy skaner RSS Google News dla portali Polska Press Grupa (PPG)
dotyczący wydarzeń w TK oraz orędzia Donalda Tuska (przełom października/listopada 2026).
"""

import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import re

PPG_DOMAINS = [
    ("i.pl", "Portal i.pl", "Ogólnopolski"),
    ("dziennikbaltycki.pl", "Dziennik Bałtycki", "Pomorskie"),
    ("gazetakrakowska.pl", "Gazeta Krakowska", "Małopolskie"),
    ("dziennikzachodni.pl", "Dziennik Zachodni", "Śląskie"),
    ("gloswielkopolski.pl", "Głos Wielkopolski", "Wielkopolskie"),
    ("gazetawroclawska.pl", "Gazeta Wrocławska", "Dolnośląskie"),
    ("dzienniklodzki.pl", "Dziennik Łódzki", "Łódzkie"),
    ("pomorska.pl", "Gazeta Pomorska", "Kujawsko-Pomorskie"),
    ("nowiny24.pl", "Nowiny", "Podkarpackie"),
    ("echodnia.eu", "Echo Dnia", "Świętokrzyskie"),
    ("dziennikpolski24.pl", "Dziennik Polski", "Małopolskie"),
    ("kurierlubelski.pl", "Kurier Lubelski", "Lubelskie"),
    ("poranny.pl", "Kurier Poranny", "Podlaskie"),
    ("nto.pl", "Nowa Trybuna Opolska", "Opolskie"),
    ("gazetalubuska.pl", "Gazeta Lubuska", "Lubuskie"),
    ("gp24.pl", "Głos Pomorza", "Pomorskie"),
    ("gk24.pl", "Głos Koszaliński", "Zachodniopomorskie"),
    ("gs24.pl", "Głos Szczeciński", "Zachodniopomorskie"),
    ("expressbydgoski.pl", "Express Bydgoski", "Kujawsko-Pomorskie"),
    ("expressilustrowany.pl", "Express Ilustrowany", "Łódzkie"),
    ("nowosci.com.pl", "Nowości Toruńskie", "Kujawsko-Pomorskie"),
    ("naszemiasto.pl", "Naszemiasto.pl", "Lokalny-Sieć")
]

QUERIES = [
    "Trybunał Konstytucyjny",
    "Święczkowski",
    "Korwin-Piotrowska",
    "Tusk orędzie",
    "Nawrocki Trybunał",
    "Tusk TK"
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*"
}

def fetch_feed(domain, name, region, query):
    full_q = f"site:{domain} {query}"
    url = f"https://news.google.com/rss/search?q={urllib.parse.quote(full_q)}&hl=pl&gl=PL&ceid=PL:pl"
    req = urllib.request.Request(url, headers=HEADERS)
    results = []
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            content = resp.read()
        root = ET.fromstring(content)
        for item in root.findall(".//item"):
            title = item.find("title").text if item.find("title") is not None else ""
            pub = item.find("pubDate").text if item.find("pubDate") is not None else ""
            link = item.find("link").text if item.find("link") is not None else ""
            desc = item.find("description").text if item.find("description") is not None else ""
            results.append({
                "domain": domain,
                "portal_name": name,
                "region": region,
                "query": query,
                "title": title,
                "pubDate": pub,
                "link": link,
                "description": desc
            })
    except Exception:
        pass
    return results

def main():
    tasks = []
    for d, name, reg in PPG_DOMAINS:
        for q in QUERIES:
            tasks.append((d, name, reg, q))
            
    print(f"Submitting {len(tasks)} queries to Google News RSS...")
    all_raw = []
    with ThreadPoolExecutor(max_workers=20) as executor:
        future_map = {executor.submit(fetch_feed, d, name, reg, q): (d, q) for d, name, reg, q in tasks}
        for future in as_completed(future_map):
            res = future.result()
            all_raw.extend(res)
            
    print(f"Raw results collected: {len(all_raw)}")
    
    # Deduplicate by (domain, title)
    unique_articles = {}
    for it in all_raw:
        key = (it["domain"], it["title"].strip())
        if key not in unique_articles:
            unique_articles[key] = it
            
    articles = list(unique_articles.values())
    print(f"Unique articles after deduplication: {len(articles)}")
    
    out_file = Path("data/tk_tusk_raw_articles.json")
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    print(f"Saved to {out_file}")

if __name__ == "__main__":
    main()
