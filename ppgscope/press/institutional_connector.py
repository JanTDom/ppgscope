"""
Wariant 2: Konektor pod zrzuty i integracje agencyjne (IMM, PSMM Monitoring, Press-Service, PAP).
Obsługuje import pakietów agencyjnych (pliki ZIP, PDF, JSON, XML) oraz ustrukturyzowany interfejs API.
"""

import os
import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from .pbc_registry import PBCRegistry

logger = logging.getLogger(__name__)


class AgencyClipping(BaseModel):
    id: str
    agency_source: str  # np. 'IMM', 'PSMM', 'PRESS_SERVICE', 'PAP'
    paper_code: str
    paper_title: str
    date_str: str
    page_number: int
    article_title: str
    author: Optional[str] = None
    surface_cm2: Optional[float] = None
    ave_pln: Optional[float] = None  # Advertising Value Equivalency
    sentiment: Optional[str] = None  # 'pozytywny', 'neutralny', 'negatywny'
    raw_text: Optional[str] = None
    pdf_attachment_path: Optional[str] = None


class InstitutionalConnector:
    """Interfejs łączący PPGscope z profesjonalnymi systemami monitoringu mediów."""

    def __init__(self, storage_dir: str = "data/agency_imports"):
        self.storage_dir = storage_dir
        self.registry = PBCRegistry()
        os.makedirs(self.storage_dir, exist_ok=True)

    def import_from_agency_json(self, json_file_path: str, agency_source: str = "PSMM") -> List[AgencyClipping]:
        """
        Importuje ustrukturyzowany zrzut wycinków prasowych z pliku JSON wygenerowanego w panelu agencji.
        Format standardowy: lista obiektów zawierających tytuł, publikację, stronę, tekst, metryki.
        """
        if not os.path.exists(json_file_path):
            logger.error(f"Plik importu nie istnieje: {json_file_path}")
            return []

        try:
            with open(json_file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Błąd odczytu pliku JSON {json_file_path}: {e}")
            return []

        clippings: List[AgencyClipping] = []
        items = data if isinstance(data, list) else data.get("items", [])

        for idx, item in enumerate(items):
            raw_title = item.get("newspaper") or item.get("source_name") or item.get("media_title") or ""
            # Dopasowanie do rejestru PBC
            matched_paper = None
            for p in self.registry.get_all():
                if p.title.lower() in raw_title.lower() or raw_title.lower() in p.title.lower():
                    matched_paper = p
                    break

            paper_code = matched_paper.code if matched_paper else "inne-ppg"
            paper_title = matched_paper.title if matched_paper else raw_title

            clip = AgencyClipping(
                id=str(item.get("id") or f"{agency_source}_{idx}_{datetime.now().strftime('%Y%m%d%H%M%S')}"),
                agency_source=agency_source,
                paper_code=paper_code,
                paper_title=paper_title,
                date_str=str(item.get("date") or datetime.now().strftime("%Y-%m-%d")),
                page_number=int(item.get("page") or item.get("page_number") or 1),
                article_title=str(item.get("title") or item.get("headline") or "Brak tytułu"),
                author=item.get("author"),
                surface_cm2=float(item.get("surface") or 0.0) if item.get("surface") else None,
                ave_pln=float(item.get("ave") or 0.0) if item.get("ave") else None,
                sentiment=item.get("sentiment"),
                raw_text=item.get("content") or item.get("lead"),
                pdf_attachment_path=item.get("pdf_path"),
            )
            clippings.append(clip)

        # Zapisz do zunifikowanego indeksu importu
        out_name = f"import_{agency_source.lower()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        out_path = os.path.join(self.storage_dir, out_name)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump([c.dict() for c in clippings], f, indent=2, ensure_ascii=False)

        logger.info(f"Pomyślnie zaimportowano {len(clippings)} wycinków z {json_file_path}")
        return clippings

    def register_incoming_pdf_package(self, zip_or_dir_path: str, date_str: str) -> Dict[str, str]:
        """
        Rejestruje paczkę plików PDF z agencji (np. codzienna paczka wydań pełnych z FTP).
        Kataloguje pliki według kodów dzienników z rejestru PBC.
        """
        indexed_files = {}
        if not os.path.exists(zip_or_dir_path):
            logger.warning(f"Ścieżka paczki nie istnieje: {zip_or_dir_path}")
            return indexed_files

        if os.path.isdir(zip_or_dir_path):
            for fname in os.listdir(zip_or_dir_path):
                if fname.lower().endswith(".pdf"):
                    # Dopasowanie do tytułu
                    for paper in self.registry.get_all():
                        if paper.code in fname.lower() or paper.prasa24_slug in fname.lower():
                            full_p = os.path.abspath(os.path.join(zip_or_dir_path, fname))
                            indexed_files[paper.code] = full_p
                            break

        return indexed_files
