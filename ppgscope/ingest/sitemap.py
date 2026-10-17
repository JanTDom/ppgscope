import xml.etree.ElementTree as ET
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel


class SitemapNewsItem(BaseModel):
    loc: str
    publication_name: Optional[str] = None
    language: Optional[str] = None
    publication_date: Optional[str] = None
    title: Optional[str] = None
    lastmod: Optional[str] = None


class SitemapParser:
    """
    Parses Google News sitemaps (sitemap-news/0.9) and standard sitemaps.org XML sitemaps.
    """

    NAMESPACES = {
        "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
        "news": "http://www.google.com/schemas/sitemap-news/0.9",
        "image": "http://www.google.com/schemas/sitemap-image/1.1",
    }

    @classmethod
    def parse_google_news(cls, xml_content: str) -> List[SitemapNewsItem]:
        """Parses Google News XML sitemap format."""
        items: List[SitemapNewsItem] = []
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            raise ValueError(f"Failed to parse XML: {e}")

        # Search for <url> elements
        for url_elem in root.findall(".//sm:url", cls.NAMESPACES) or root.findall(".//url"):
            loc_elem = url_elem.find("sm:loc", cls.NAMESPACES)
            if loc_elem is None:
                loc_elem = url_elem.find("loc")
            
            if loc_elem is None or not loc_elem.text:
                continue
            
            loc = loc_elem.text.strip()
            item = SitemapNewsItem(loc=loc)

            # Check lastmod
            lastmod_elem = url_elem.find("sm:lastmod", cls.NAMESPACES) or url_elem.find("lastmod")
            if lastmod_elem is not None and lastmod_elem.text:
                item.lastmod = lastmod_elem.text.strip()

            # Check news:news block
            news_elem = url_elem.find("news:news", cls.NAMESPACES)
            if news_elem is not None:
                pub_elem = news_elem.find("news:publication", cls.NAMESPACES)
                if pub_elem is not None:
                    name_elem = pub_elem.find("news:name", cls.NAMESPACES)
                    if name_elem is not None and name_elem.text:
                        item.publication_name = name_elem.text.strip()
                    lang_elem = pub_elem.find("news:language", cls.NAMESPACES)
                    if lang_elem is not None and lang_elem.text:
                        item.language = lang_elem.text.strip()
                
                date_elem = news_elem.find("news:publication_date", cls.NAMESPACES)
                if date_elem is not None and date_elem.text:
                    item.publication_date = date_elem.text.strip()

                title_elem = news_elem.find("news:title", cls.NAMESPACES)
                if title_elem is not None and title_elem.text:
                    item.title = title_elem.text.strip()

            items.append(item)

        return items

    @classmethod
    def parse_standard_sitemap(cls, xml_content: str) -> List[str]:
        """Parses standard XML sitemap for list of <loc> URLs."""
        urls: List[str] = []
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            raise ValueError(f"Failed to parse XML: {e}")

        for loc_elem in root.findall(".//sm:loc", cls.NAMESPACES) or root.findall(".//loc"):
            if loc_elem is not None and loc_elem.text:
                urls.append(loc_elem.text.strip())
        return urls
