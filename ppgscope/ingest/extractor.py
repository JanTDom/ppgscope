import re
import json
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from urllib.parse import urlparse
import dateparser
import trafilatura

from ppgscope.models.article import Article


class HtmlArticleExtractor:
    """
    Extracts structured article data from PPG HTML pages with high fidelity and provenance tracking.
    """

    @classmethod
    def extract(
        cls,
        html_content: str,
        fallback_url: str,
        press_title_hint: Optional[str] = None,
        region_hint: Optional[str] = None,
    ) -> Article:
        raw_hash = Article.calculate_hash(html_content)

        # 1. Canonical URL
        canonical_match = re.search(
            r'<link[^>]+rel=[\"\']canonical[\"\'][^>]+href=[\"\']([^\"\']+)[\"\']',
            html_content,
            re.IGNORECASE,
        )
        if not canonical_match:
            # Alternate attribute order
            canonical_match = re.search(
                r'<link[^>]+href=[\"\']([^\"\']+)[\"\'][^>]+rel=[\"\']canonical[\"\']',
                html_content,
                re.IGNORECASE,
            )
        canonical_url = canonical_match.group(1).strip() if canonical_match else fallback_url

        domain = urlparse(canonical_url).netloc

        # 2. Extract JSON-LD blocks
        json_ld_blocks: List[Dict[str, Any]] = []
        for match in re.finditer(
            r'<script[^>]+type=[\"\']application/ld\+json[\"\'][^>]*>(.*?)</script>',
            html_content,
            re.DOTALL | re.IGNORECASE,
        ):
            try:
                data = json.loads(match.group(1).strip())
                if isinstance(data, dict):
                    json_ld_blocks.append(data)
                elif isinstance(data, list):
                    for d in data:
                        if isinstance(d, dict):
                            json_ld_blocks.append(d)
            except Exception:
                continue

        # 3. Breadcrumbs / Section
        section = None
        for block in json_ld_blocks:
            if block.get("@type") == "BreadcrumbList":
                elements = block.get("itemListElement", [])
                if len(elements) >= 2:
                    # Item 2 is usually section (e.g. Sport, Wiadomości)
                    sec_item = elements[1]
                    if isinstance(sec_item, dict):
                        section = sec_item.get("name")
                break

        if not section:
            sec_meta = re.search(
                r'<meta[^>]+(?:property|name)=[\"\'](?:article:section|section)[\"\'][^>]+content=[\"\']([^\"\']+)[\"\']',
                html_content,
                re.IGNORECASE,
            )
            if sec_meta:
                section = sec_meta.group(1).strip()

        # 4. Title
        title = None
        h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', html_content, re.DOTALL | re.IGNORECASE)
        if h1_match:
            title = re.sub(r'<[^>]+>', '', h1_match.group(1)).strip()
        
        if not title:
            og_title = re.search(
                r'<meta[^>]+(?:property|name)=[\"\'](?:og:title|twitter:title)[\"\'][^>]+content=[\"\']([^\"\']+)[\"\']',
                html_content,
                re.IGNORECASE,
            )
            if og_title:
                title = og_title.group(1).strip()

        if not title:
            t_match = re.search(r'<title[^>]*>(.*?)</title>', html_content, re.DOTALL | re.IGNORECASE)
            title = re.sub(r'<[^>]+>', '', t_match.group(1)).strip() if t_match else "Bez tytułu"

        # 5. Lead / Summary
        lead = None
        desc_meta = re.search(
            r'<meta[^>]+(?:property|name)=[\"\'](?:description|og:description)[\"\'][^>]+content=[\"\']([^\"\']+)[\"\']',
            html_content,
            re.IGNORECASE,
        )
        if desc_meta:
            desc_val = desc_meta.group(1).strip()
            if desc_val and desc_val != "&nbsp;":
                lead = desc_val

        # 6. Author
        author = None
        author_meta = re.search(
            r'<meta[^>]+(?:property|name)=[\"\'](?:article:author|author)[\"\'][^>]+content=[\"\']([^\"\']+)[\"\']',
            html_content,
            re.IGNORECASE,
        )
        if author_meta:
            author = author_meta.group(1).strip()

        # 7. Dates
        published_at = None
        modified_at = None

        pub_meta = re.search(
            r'<meta[^>]+(?:property|name)=[\"\'](?:article:published_time|datePublished)[\"\'][^>]+content=[\"\']([^\"\']+)[\"\']',
            html_content,
            re.IGNORECASE,
        )
        if pub_meta:
            published_at = dateparser.parse(pub_meta.group(1).strip())

        mod_meta = re.search(
            r'<meta[^>]+(?:property|name)=[\"\'](?:article:modified_time|dateModified)[\"\'][^>]+content=[\"\']([^\"\']+)[\"\']',
            html_content,
            re.IGNORECASE,
        )
        if mod_meta:
            modified_at = dateparser.parse(mod_meta.group(1).strip())

        if not published_at:
            published_at = datetime.now(timezone.utc)

        # 8. Tags
        tags: List[str] = []
        for tag_match in re.finditer(
            r'<meta[^>]+property=[\"\']article:tag[\"\'][^>]+content=[\"\']([^\"\']+)[\"\']',
            html_content,
            re.IGNORECASE,
        ):
            tag_val = tag_match.group(1).strip()
            if tag_val and tag_val not in tags:
                tags.append(tag_val)

        # 9. Clean Body Text
        # Try extracting directly from article container first
        body = ""
        article_match = re.search(
            r'<main[^>]+class=[\"\'][^\"\']*layoutsContainer--article[^\"\']*[\"\'][^>]*>(.*?)</main>',
            html_content,
            re.DOTALL | re.IGNORECASE,
        )
        if article_match:
            main_html = article_match.group(1)
            ps = re.findall(r'<p\b[^>]*>(.*?)</p>', main_html, re.DOTALL | re.IGNORECASE)
            extracted_paragraphs = []
            for p in ps:
                clean_p = re.sub(r'<[^>]+>', '', p).strip()
                if clean_p and len(clean_p) > 20 and not clean_p.startswith("ZOBACZ:") and not clean_p.startswith("CZYTAJ TEŻ:"):
                    extracted_paragraphs.append(clean_p)
            body = "\n\n".join(extracted_paragraphs)

        # If body is still empty or short, invoke trafilatura
        if len(body) < 100:
            traf_text = trafilatura.extract(html_content, include_comments=False, include_tables=False)
            if traf_text:
                body = traf_text

        # 10. Press Title
        press_title = press_title_hint or domain

        # 11. Paywall ("Strefa Plus") detection from JSON-LD, meta tags & CSS markers
        is_paywalled = False
        for block in json_ld_blocks:
            acc = block.get("isAccessibleForFree")
            if acc is False or (isinstance(acc, str) and acc.strip().lower() == "false"):
                is_paywalled = True
                break
        if not is_paywalled:
            if re.search(
                r'(?:isAccessibleForFree[\"\']?\s*:\s*[\"\']?false|class=[\"\'][^\"\']*(?:atomsArticlePaywall|strefa-plus|plus-badge|paywall-box)[^\"\']*[\"\']|content=[\"\'](?:locked|metered)[\"\'])',
                html_content,
                re.IGNORECASE,
            ):
                is_paywalled = True

        # 12. Sponsored / Partner material detection
        combined_meta_text = f"{title or ''} {lead or ''} {section or ''} {' '.join(tags)} {author or ''}"
        is_sponsored = False
        if re.search(
            r'(?:materia[łl]\s+partnera|artyku[łl]\s+sponsorowany|p[łl]atna\s+wsp[óo][łl]praca|materia[łl]\s+promocyjny|reklama|rel=[\"\']sponsored[\"\'])',
            f"{combined_meta_text} {html_content}",
            re.IGNORECASE,
        ):
            is_sponsored = True

        # 13. Authorship / Byline classification (named, anonymous, wire, partner)
        byline_type = "anonymous"
        clean_author = (author or "").strip()
        if is_sponsored or re.search(r'(?:partner|promocja|reklama|komercyjny)', clean_author, re.IGNORECASE):
            byline_type = "partner"
        elif re.search(r'\b(?:PAP|Polska Agencja Prasowa|IAR|Reuters|Biuro Prasowe)\b', f"{clean_author} {body[:240]}", re.IGNORECASE):
            byline_type = "wire"
        elif (
            clean_author
            and not re.search(r'^(?:redakcja|zesp[óo][łl]|red\.?|admin|autor|wydawca|naszemiasto|polska press)', clean_author, re.IGNORECASE)
            and len(clean_author.split()) >= 2
        ):
            byline_type = "named"

        # 14. Public comment count extraction
        comments_count = 0
        for block in json_ld_blocks:
            if "commentCount" in block:
                try:
                    comments_count = max(comments_count, int(block["commentCount"]))
                except (ValueError, TypeError):
                    pass
        if comments_count == 0:
            c_match = re.search(r'(?:commentCount|liczba-komentarzy)[\"\']?\s*[:=>]\s*[\"\']?(\d+)', html_content, re.IGNORECASE)
            if c_match:
                try:
                    comments_count = int(c_match.group(1))
                except ValueError:
                    pass

        # 15. Local institutions quoted in the article (county/municipality grounding)
        local_institutions_quoted: List[str] = []
        institution_patterns = [
            ("Urząd Miasta / Gminy", r'\burz[aą]d[a-z]*\s+(?:miasta|gminy|miejski)\b'),
            ("Starostwo Powiatowe", r'\bstarostw[a-z]*\s+powiatow[a-z]*\b|\bstarost[a-z]*\b'),
            ("Rada Miasta / Gminy / Powiatu", r'\brad[a-z]*\s+(?:miejsk[a-z]*|miasta|gminy|powiatu)\b|\bradn[yi]\b'),
            ("Prezydent / Burmistrz / Wójt", r'\b(?:prezydent[a-z]*\s+miasta|burmistrz[a-z]*|w[óo]jt[a-z]*|so[łl]tys[a-z]*)\b'),
            ("Komenda Policji / Straż Miejska", r'\b(?:komend[a-z]*\s+(?:powiatow[a-z]*|miejsk[a-z]*)\s+policji|stra[żz][a-z]*\s+miejsk[a-z]*)\b'),
            ("Państwowa / Ochotnicza Straż Pożarna", r'\b(?:komend[a-z]*\s+(?:powiatow[a-z]*|miejsk[a-z]*)\s+psp|osp\b|stra[żz]acy\s+z)\b'),
            ("Szpital Powiatowy / Wojewódzki", r'\bszpital[a-z]*\s+(?:powiatow[a-z]*|wojew[óo]dzk[a-z]*|miejsk[a-z]*)\b'),
            ("Prokuratura / Sąd Rejonowy", r'\b(?:prokuratur[a-z]*\s+rejonow[a-z]*|s[aą]d[a-z]*\s+rejonow[a-z]*)\b'),
            ("Zarząd Dróg / MPK / MZK", r'\b(?:zarz[aą]d[a-z]*\s+dr[óo]g|mpk\b|mzk\b|zdit\b|zdm\b)\b'),
        ]
        full_text_for_inst = f"{title or ''} {lead or ''} {body or ''}"
        for inst_label, inst_regex in institution_patterns:
            if re.search(inst_regex, full_text_for_inst, re.IGNORECASE):
                local_institutions_quoted.append(inst_label)

        # 16. Google Discover / SEO Evergreen Bait detector
        is_discover_bait = False
        discover_headline_re = re.compile(
            r'(?:kiedy\s+wyp[łl]at|ile\s+wynosi|komu\s+przys[łl]uguje|pilny\s+komunikat|nowe\s+limity|sprawd[źz]\s+czy\s+nale[żz]|tyle\s+dostaniesz|dodatek\s+do\s+emerytury|zmiany\s+w\s+przepisach\s+dla\s+wszystkich|quiz\s+z\s+prl|ma[łl]o\s+kto\s+o\s+tym\s+wie)',
            re.IGNORECASE,
        )
        question_h2_count = len(re.findall(r'<h2[^>]*>[^<]*\?</h2>', html_content, re.IGNORECASE))
        if (discover_headline_re.search(title or "") or question_h2_count >= 2) and len(local_institutions_quoted) == 0:
            is_discover_bait = True

        return Article(
            canonical_url=canonical_url,
            title=title,
            lead=lead,
            body=body or (lead or title),
            author=author,
            published_at=published_at,
            modified_at=modified_at,
            section=section,
            tags=tags,
            press_title=press_title,
            domain=domain,
            region=region_hint,
            raw_html_hash=raw_hash,
            is_paywalled=is_paywalled,
            is_sponsored=is_sponsored,
            is_discover_bait=is_discover_bait,
            byline_type=byline_type,
            comments_count=comments_count,
            local_institutions_quoted=local_institutions_quoted,
        )

