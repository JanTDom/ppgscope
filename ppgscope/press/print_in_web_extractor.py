"""
Wariant 3: Ekstrakcja artykułów z wydania drukowanego publikowanych w portalach WWW Polska Press.
Wykrywa sygnatury pochodzenia prasowego, numery stron, sekcje Magazyn/Opinie oraz daty wydań papierowych.
"""

import re
import logging
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from .pbc_registry import PBCRegistry

logger = logging.getLogger(__name__)


class PrintArticleInWeb(BaseModel):
    url: str
    portal_domain: str
    matched_paper_code: Optional[str] = None
    matched_paper_title: Optional[str] = None
    title: str
    author: Optional[str] = None
    detected_print_signature: str
    print_date: Optional[str] = None
    print_page: Optional[str] = None
    is_magazine_section: bool = False
    is_premium_plus: bool = False
    clean_text_snippet: str


class PrintInWebExtractor:
    """Wykrywacz treści z wydań drukowanych na portalach internetowych PPG."""

    # Typowe wzorce sygnatur druku stosowane w redakcjach Polska Press
    PRINT_PATTERNS = [
        r'(?:artykuł|tekst|materiał|wywiad)\s+(?:ukazał się|pochodzi z|opublikowany został)\s+w\s+(?:papierowym|drukowanym|piątkowym|magazynowym)\s+wydaniu\s+([^\n\.,]+)(?:z\s+dnia\s+([\d\.\-]+))?',
        r'(?:ukazał się|opublikowano)\s+w\s+wydaniu\s+papierowym\s+([^\n\.,]+)?',
        r'artykuł\s+pochodzi\s+z\s+(?:dziennika|gazety|tygodnika)\s+([^\n\.,]+)',
        r'w\s+papierowym\s+wydaniu\s+(?:„|\"|\')?([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż\s]+)(?:”|\"|\')?\s+z\s+dnia\s+([\d\.\-]+)',
        r'dostępne\s+również\s+w\s+wydaniu\s+drukowanym',
        r'(?:nr\s+\d+|wydanie\s+nr\s+\d+).*?(?:str\.|strona|s\.)\s*(\d+(?:-\d+)?)',
    ]

    def __init__(self):
        self.registry = PBCRegistry()
        self._compiled_regexes = [re.compile(p, re.IGNORECASE) for p in self.PRINT_PATTERNS]

    def inspect_article(
        self,
        url: str,
        title: str,
        body_text: str,
        category: Optional[str] = None,
        author: Optional[str] = None,
    ) -> Optional[PrintArticleInWeb]:
        """
        Bada czy dany artykuł z sieci jest przeniesieniem z wydania drukowanego.
        Zwraca obiekt PrintArticleInWeb lub None.
        """
        domain = url.replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")
        matched_paper = self.registry.get_by_domain(domain)

        found_signature = None
        detected_date = None
        detected_page = None

        # 1. Przeszukiwanie tekstu artykułu pod kątem sygnatur
        for rgx in self._compiled_regexes:
            match = rgx.search(body_text)
            if match:
                found_signature = match.group(0).strip()
                groups = match.groups()
                for g in groups:
                    if g and re.search(r'\d{1,2}[\.\-]\d{1,2}[\.\-]\d{2,4}', g):
                        detected_date = g.strip()
                    elif g and re.search(r'^\d+(?:-\d+)?$', g):
                        detected_page = g.strip()
                break

        # 2. Sprawdzenie kategorii (Magazyn, Opinie, Plus)
        is_magazine = False
        if category:
            cat_lower = category.lower()
            if any(k in cat_lower for k in ["magazyn", "opinie", "felieton", "plus", "historia"]):
                is_magazine = True

        # 3. Sprawdzenie flagi Plus / Paywall
        is_plus = "/strefa-plus/" in url or "/plus/" in url or "strefa plus" in (body_text[:300].lower() if body_text else "")

        # Jeśli nie ma sygnatury druku ani silnego wskaźnika magazynu z dopiskiem redakcyjnym
        if not found_signature and not (is_magazine and "autor:" in body_text.lower() and len(body_text) > 4000):
            return None

        sig_text = found_signature if found_signature else f"Sekcja magazynowa: {category}"

        return PrintArticleInWeb(
            url=url,
            portal_domain=domain,
            matched_paper_code=matched_paper.code if matched_paper else None,
            matched_paper_title=matched_paper.title if matched_paper else None,
            title=title,
            author=author,
            detected_print_signature=sig_text,
            print_date=detected_date,
            print_page=detected_page,
            is_magazine_section=is_magazine,
            is_premium_plus=is_plus,
            clean_text_snippet=body_text[:300] if body_text else "",
        )
