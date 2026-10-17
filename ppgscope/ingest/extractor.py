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
        )
