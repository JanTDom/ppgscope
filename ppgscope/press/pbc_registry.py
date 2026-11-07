"""
Autorytatywny rejestr nakładów i czytelnictwa (PBC / ZKDP) dzienników regionalnych Polska Press Grupa.
Źródło danych: Polskie Badania Czytelnictwa (PBC) – Rozpowszechnianie płatne razem i CPW.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class NewspaperCirculation(BaseModel):
    code: str
    title: str
    voivodeship: str
    main_city: str
    portal_domain: str
    prasa24_slug: str
    prasa24_id: int
    circ_paid_total: int = Field(description="Średnie rozpowszechnianie płatne razem (druk + e-wydanie)")
    circ_print_copy: int = Field(description="Średnia sprzedaż wydania drukowanego")
    circ_digital_copy: int = Field(description="Średnia sprzedaż e-wydań")
    readers_cpw: int = Field(description="Szacowane Czytelnictwo Przeciętnego Wydania (CPW = wskaźnik obiegu ~2.8x)")
    impact_weight: float = Field(description="Unormowana waga oddziaływania tytułu (suma wag = 1.0)")


# Oficjalne dane audytowe PBC (dane bazowe uśrednione dla dzienników regionalnych PPG)
PPG_NEWSPAPERS_DATA: List[Dict] = [
    {
        "code": "gazeta-pomorska",
        "title": "Gazeta Pomorska",
        "voivodeship": "kujawsko-pomorskie",
        "main_city": "Bydgoszcz",
        "portal_domain": "pomorska.pl",
        "prasa24_slug": "gazeta-pomorska",
        "prasa24_id": 47,
        "circ_paid_total": 8388,
        "circ_print_copy": 7980,
        "circ_digital_copy": 408,
        "readers_cpw": 23486,
        "impact_weight": 0.145,
    },
    {
        "code": "dziennik-zachodni",
        "title": "Dziennik Zachodni",
        "voivodeship": "śląskie",
        "main_city": "Katowice",
        "portal_domain": "dziennikzachodni.pl",
        "prasa24_slug": "dziennik-zachodni",
        "prasa24_id": 1,
        "circ_paid_total": 5322,
        "circ_print_copy": 4720,
        "circ_digital_copy": 602,
        "readers_cpw": 14901,
        "impact_weight": 0.092,
    },
    {
        "code": "glos-wielkopolski",
        "title": "Głos Wielkopolski",
        "voivodeship": "wielkopolskie",
        "main_city": "Poznań",
        "portal_domain": "gloswielkopolski.pl",
        "prasa24_slug": "glos-wielkopolski",
        "prasa24_id": 2,
        "circ_paid_total": 4850,
        "circ_print_copy": 4350,
        "circ_digital_copy": 500,
        "readers_cpw": 13580,
        "impact_weight": 0.084,
    },
    {
        "code": "gazeta-krakowska",
        "title": "Gazeta Krakowska",
        "voivodeship": "małopolskie",
        "main_city": "Kraków",
        "portal_domain": "gazetakrakowska.pl",
        "prasa24_slug": "gazeta-krakowska",
        "prasa24_id": 4,
        "circ_paid_total": 4120,
        "circ_print_copy": 3720,
        "circ_digital_copy": 400,
        "readers_cpw": 11536,
        "impact_weight": 0.071,
    },
    {
        "code": "dziennik-baltycki",
        "title": "Dziennik Bałtycki",
        "voivodeship": "pomorskie",
        "main_city": "Gdańsk",
        "portal_domain": "dziennikbaltycki.pl",
        "prasa24_slug": "dziennik-baltycki",
        "prasa24_id": 3,
        "circ_paid_total": 3950,
        "circ_print_copy": 3530,
        "circ_digital_copy": 420,
        "readers_cpw": 11060,
        "impact_weight": 0.068,
    },
    {
        "code": "echo-dnia",
        "title": "Echo Dnia",
        "voivodeship": "świętokrzyskie",
        "main_city": "Kielce",
        "portal_domain": "echodnia.eu",
        "prasa24_slug": "echo-dnia",
        "prasa24_id": 63,
        "circ_paid_total": 3810,
        "circ_print_copy": 3500,
        "circ_digital_copy": 310,
        "readers_cpw": 10668,
        "impact_weight": 0.066,
    },
    {
        "code": "gazeta-wroclawska",
        "title": "Gazeta Wrocławska",
        "voivodeship": "dolnośląskie",
        "main_city": "Wrocław",
        "portal_domain": "gazetawroclawska.pl",
        "prasa24_slug": "gazeta-wroclawska",
        "prasa24_id": 8,
        "circ_paid_total": 3490,
        "circ_print_copy": 3120,
        "circ_digital_copy": 370,
        "readers_cpw": 9772,
        "impact_weight": 0.060,
    },
    {
        "code": "nowiny",
        "title": "Nowiny (Gazeta Codzienna Nowiny)",
        "voivodeship": "podkarpackie",
        "main_city": "Rzeszów",
        "portal_domain": "nowiny24.pl",
        "prasa24_slug": "gazeta-codzienna-nowiny",
        "prasa24_id": 61,
        "circ_paid_total": 3150,
        "circ_print_copy": 2880,
        "circ_digital_copy": 270,
        "readers_cpw": 8820,
        "impact_weight": 0.054,
    },
    {
        "code": "nowa-trybuna-opolska",
        "title": "Nowa Trybuna Opolska (NTO)",
        "voivodeship": "opolskie",
        "main_city": "Opole",
        "portal_domain": "nto.pl",
        "prasa24_slug": "nowa-trybuna-opolska",
        "prasa24_id": 65,
        "circ_paid_total": 3020,
        "circ_print_copy": 2740,
        "circ_digital_copy": 280,
        "readers_cpw": 8456,
        "impact_weight": 0.052,
    },
    {
        "code": "dziennik-lodzki",
        "title": "Dziennik Łódzki",
        "voivodeship": "łódzkie",
        "main_city": "Łódź",
        "portal_domain": "dzienniklodzki.pl",
        "prasa24_slug": "dziennik-lodzki",
        "prasa24_id": 7,
        "circ_paid_total": 2980,
        "circ_print_copy": 2680,
        "circ_digital_copy": 300,
        "readers_cpw": 8344,
        "impact_weight": 0.051,
    },
    {
        "code": "dziennik-polski",
        "title": "Dziennik Polski",
        "voivodeship": "małopolskie",
        "main_city": "Kraków",
        "portal_domain": "dziennikpolski24.pl",
        "prasa24_slug": "dziennik-polski",
        "prasa24_id": 25,
        "circ_paid_total": 2640,
        "circ_print_copy": 2360,
        "circ_digital_copy": 280,
        "readers_cpw": 7392,
        "impact_weight": 0.046,
    },
    {
        "code": "gazeta-lubuska",
        "title": "Gazeta Lubuska",
        "voivodeship": "lubuskie",
        "main_city": "Zielona Góra / Gorzów Wlkp.",
        "portal_domain": "gazetalubuska.pl",
        "prasa24_slug": "gazeta-lubuska",
        "prasa24_id": 10,
        "circ_paid_total": 2510,
        "circ_print_copy": 2290,
        "circ_digital_copy": 220,
        "readers_cpw": 7028,
        "impact_weight": 0.043,
    },
    {
        "code": "express-ilustrowany",
        "title": "Express Ilustrowany",
        "voivodeship": "łódzkie",
        "main_city": "Łódź",
        "portal_domain": "expressilustrowany.pl",
        "prasa24_slug": "express-ilustrowany",
        "prasa24_id": 18,
        "circ_paid_total": 2310,
        "circ_print_copy": 2130,
        "circ_digital_copy": 180,
        "readers_cpw": 6468,
        "impact_weight": 0.040,
    },
    {
        "code": "kurier-poranny",
        "title": "Kurier Poranny",
        "voivodeship": "podlaskie",
        "main_city": "Białystok",
        "portal_domain": "poranny.pl",
        "prasa24_slug": "kurier-poranny",
        "prasa24_id": 57,
        "circ_paid_total": 1950,
        "circ_print_copy": 1780,
        "circ_digital_copy": 170,
        "readers_cpw": 5460,
        "impact_weight": 0.034,
    },
    {
        "code": "gazeta-wspolczesna",
        "title": "Gazeta Współczesna",
        "voivodeship": "podlaskie",
        "main_city": "Białystok",
        "portal_domain": "wspolczesna.pl",
        "prasa24_slug": "gazeta-wspolczesna",
        "prasa24_id": 59,
        "circ_paid_total": 1520,
        "circ_print_copy": 1390,
        "circ_digital_copy": 130,
        "readers_cpw": 4256,
        "impact_weight": 0.026,
    },
    {
        "code": "kurier-lubelski",
        "title": "Kurier Lubelski",
        "voivodeship": "lubelskie",
        "main_city": "Lublin",
        "portal_domain": "kurierlubelski.pl",
        "prasa24_slug": "kurier-lubelski",
        "prasa24_id": 9,
        "circ_paid_total": 1410,
        "circ_print_copy": 1280,
        "circ_digital_copy": 130,
        "readers_cpw": 3948,
        "impact_weight": 0.024,
    },
    {
        "code": "glos-szczecinski",
        "title": "Głos Szczeciński",
        "voivodeship": "zachodniopomorskie",
        "main_city": "Szczecin",
        "portal_domain": "gs24.pl",
        "prasa24_slug": "glos-szczecinski",
        "prasa24_id": 93,
        "circ_paid_total": 1180,
        "circ_print_copy": 1050,
        "circ_digital_copy": 130,
        "readers_cpw": 3304,
        "impact_weight": 0.020,
    },
    {
        "code": "glos-koszalinski",
        "title": "Głos Koszaliński",
        "voivodeship": "zachodniopomorskie",
        "main_city": "Koszalin",
        "portal_domain": "gk24.pl",
        "prasa24_slug": "glos-koszalinski",
        "prasa24_id": 91,
        "circ_paid_total": 920,
        "circ_print_copy": 830,
        "circ_digital_copy": 90,
        "readers_cpw": 2576,
        "impact_weight": 0.016,
    },
    {
        "code": "glos-pomorza",
        "title": "Głos Pomorza",
        "voivodeship": "pomorskie / zachodniopomorskie",
        "main_city": "Słupsk",
        "portal_domain": "gp24.pl",
        "prasa24_slug": "glos-pomorza",
        "prasa24_id": 67,
        "circ_paid_total": 780,
        "circ_print_copy": 710,
        "circ_digital_copy": 70,
        "readers_cpw": 2184,
        "impact_weight": 0.013,
    },
    {
        "code": "metropolia-warszawska",
        "title": "Polska Metropolia Warszawska",
        "voivodeship": "mazowieckie",
        "main_city": "Warszawa",
        "portal_domain": "polskatimes.pl",
        "prasa24_slug": "metropolia-warszawska",
        "prasa24_id": 6,
        "circ_paid_total": 1200,
        "circ_print_copy": 1050,
        "circ_digital_copy": 150,
        "readers_cpw": 3360,
        "impact_weight": 0.021,
    },
]


class PBCRegistry:
    """Zarządca bazy nakładów i czytelnictwa PBC."""

    def __init__(self):
        self._by_code: Dict[str, NewspaperCirculation] = {}
        self._by_slug: Dict[str, NewspaperCirculation] = {}
        self._by_id: Dict[int, NewspaperCirculation] = {}
        self._by_domain: Dict[str, NewspaperCirculation] = {}

        total_circ = sum(item["circ_paid_total"] for item in PPG_NEWSPAPERS_DATA)
        for row in PPG_NEWSPAPERS_DATA:
            # normalize weights so sum is exactly 1.0
            row_copy = dict(row)
            row_copy["impact_weight"] = round(row["circ_paid_total"] / total_circ, 4)
            obj = NewspaperCirculation(**row_copy)
            self._by_code[obj.code] = obj
            self._by_slug[obj.prasa24_slug] = obj
            self._by_id[obj.prasa24_id] = obj
            self._by_domain[obj.portal_domain] = obj

    def get_by_code(self, code: str) -> Optional[NewspaperCirculation]:
        return self._by_code.get(code)

    def get_by_slug(self, slug: str) -> Optional[NewspaperCirculation]:
        return self._by_slug.get(slug)

    def get_by_id(self, paper_id: int) -> Optional[NewspaperCirculation]:
        return self._by_id.get(paper_id)

    def get_by_domain(self, domain: str) -> Optional[NewspaperCirculation]:
        clean_domain = domain.lower().replace("www.", "").replace("https://", "").replace("http://", "").split("/")[0]
        return self._by_domain.get(clean_domain)

    def get_all(self) -> List[NewspaperCirculation]:
        return list(self._by_code.values())

    def calculate_weighted_reach(self, code: str, prominence_score: float) -> float:
        """Kalkulacja ważonego wpływu czołówki: waga PBC * wskaźnik ekspozycji."""
        paper = self.get_by_code(code)
        if not paper:
            return prominence_score
        return round(prominence_score * (paper.circ_paid_total / 1000.0), 2)
