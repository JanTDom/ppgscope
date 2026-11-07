"""
Moduł analizy prasy drukowanej Polska Press Grupa (PPG) w PPGscope.
Obsługuje:
- Wariant 1: Monitoring okładek (jedynek) z CDN Prasa24
- Wariant 2: Konektor pod zrzuty/dostępy agencyjne (IMM, PSMM)
- Wariant 3: Wykrywanie artykułów z wydania drukowanego w serwisach WWW
- Wagi nakładu i czytelnictwa PBC (Polskie Badania Czytelnictwa)
- Wskaźnik Autonomii Redakcyjnej i Analiza Syndykacji Czołówek
"""

from .pbc_registry import PBCRegistry, NewspaperCirculation
from .frontpage_monitor import FrontpageMonitor
from .institutional_connector import InstitutionalConnector
from .print_in_web_extractor import PrintInWebExtractor
from .editorial_autonomy import (
    EditorialAutonomyAnalyzer,
    PortalAutonomyRecord,
    EditorialAutonomyReport,
)

__all__ = [
    "PBCRegistry",
    "NewspaperCirculation",
    "FrontpageMonitor",
    "InstitutionalConnector",
    "PrintInWebExtractor",
    "EditorialAutonomyAnalyzer",
    "PortalAutonomyRecord",
    "EditorialAutonomyReport",
]
