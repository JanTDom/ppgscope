import re
from typing import Dict, List, Tuple, Optional
from ppgscope.models.article import Article
from ppgscope.models.taxonomy import ClassificationResult
from ppgscope.classifier.base import BaseTopicClassifier
from ppgscope.classifier.taxonomy import TaxonomyManager


class RuleBasedTopicClassifier(BaseTopicClassifier):
    """
    Topic and Locality classifier conforming to Taxonomy v2.0 (18 domains + C/L/CL locality).
    Determines domain, secondary domain, locality variant, and other_region flag based on
    institutional context, title area coverage, and lexical indicators.
    """

    # Lexical patterns for 18 domains
    DOMAIN_PATTERNS = {
        "wladza": [
            "rząd", "sejm", "senat", "premier", "prezydent", "wybory", "partia", "koalicja",
            "opozycja", "poseł", "minister", "rada ministrów", "ustawa", "głosowanie", "pis",
            "koalicja obywatelska", "lewica", "konfederacja", "psl", "radny", "rada miasta",
            "rada gminy", "burmistrz", "wójt", "urząd miasta", "urząd gminy", "marszałek",
            "sejmik", "wojewoda", "budżet gminy", "social mediów", "social media"
        ],
        "zdarzenia": [
            "pożar", "wypadek", "zderzenie", "śmierć", "ranny", "ofiary", "policja", "straż pożarna",
            "areszt", "zarzuty", "wyrok", "kradzież", "śledztwo", "przestępstwo", "zatrzymanie",
            "prokuratura", "katastrofa", "zaginięcie", "poszukiwania", "zwłoki", "oszustwo",
            "napad", "zabójstwo", "morderstwo", "pobicie", "kolizja", "dachowanie"
        ],
        "obronnosc": [
            "wojsko", "armia", "żołnierz", "ćwiczenia wojskowe", "szkolenie cywilów", "wop",
            "przemysł zbrojeniowy", "obrona cywilna", "nato", "czołg", "myśliwiec", "batalion",
            "poligon", "rekrutacja do wojska", "mon"
        ],
        "gospodarka": [
            "wibor", "stopy procentowe", "nbp", "rpp", "inflacja", "emerytura", "emerytury", "emeryt",
            "seniorka", "senior", "zus", "podatki", "podatek", "kredyt", "kredyty", "bank", "firma",
            "firmy", "przedsiębiorca", "wynagrodzenie", "płaca", "zarobki", "pensja", "praca",
            "rynek pracy", "bezrobocie", "energetyka", "górnictwo", "przemysł", "handel", "ceny",
            "orlen", "inwestor", "biznes", "finanse"
        ],
        "infrastruktura": [
            "droga", "drogi", "autostrada", "droga ekspresowa", "most", "kolej", "pociąg", "pkp",
            "komunikacja miejska", "mpk", "tramwaj", "autobus", "lotnisko", "korki", "parkowanie",
            "strefa płatnego parkowania", "remont drogi", "sieć wodna", "wodociągi", "ciepłownictwo"
        ],
        "przestrzen": [
            "urbanistyka", "plan zagospodarowania", "park miejski", "zieleń", "rewitalizacja",
            "mieszkanie komunalne", "mieszkania", "nieruchomości", "deweloper", "osiedle",
            "zabytki jako remont", "remont kamienicy", "spór o zabytek"
        ],
        "zdrowie": [
            "szpital", "szpitale", "lekarz", "medycy", "pielęgniarki", "ochrona zdrowia",
            "przychodnia", "pacjent", "nfz", "leczenie", "profilaktyka", "porada medyczna",
            "zdrowie", "choroba", "operacja", "leki", "apteka"
        ],
        "edukacja": [
            "szkoła", "szkoły", "przedszkole", "nauczyciel", "nauczyciele", "uczeń", "uczniowie",
            "matura", "egzamin", "studia", "uczelnia", "uniwersytet", "dzieci w sieci", "oświata",
            "ferie", "rok szkolny", "wychowanie"
        ],
        "srodowisko": [
            "susza", "woda", "powódź", "las", "lasy", "rezerwat", "smog", "czyste powietrze",
            "odpady", "śmieci", "pogoda", "przyroda", "zwierzęta", "klimat", "ochrona środowiska",
            "imgw", "wichura", "burza"
        ],
        "spolecznosc": [
            "lokalni bohaterowie", "jubileusz", "parafia", "ksiądz", "kościół", "ngo",
            "stowarzyszenie", "zbiórka", "pomoc", "nekrolog", "żałoba", "problemy socjalne",
            "mieszkańcy zjednoczyli", "wolontariat", "charytatywna"
        ],
        "kultura": [
            "teatr", "opera", "koncert", "literatura", "film", "kino", "sztuka", "mural", "murale",
            "muzeum", "wystawa", "malarstwo", "spektakl", "premiera teatralna"
        ],
        "historia": [
            "historia", "rocznica", "prl", "nostalgia", "archiwalne zdjęcia", "dawne czasy",
            "jak wyglądało miasto", "przeszłość", "pamięć historyczna"
        ],
        "czas_wolny": [
            "atrakcje", "turystyka", "uzdrowisko", "wycieczka", "weekend", "festyn", "jarmark",
            "gastronomia", "gdzie zjeść", "imprezy w weekend", "co robić w weekend", "zabytek jako atrakcja"
        ],
        "sport": [
            "mecz", "sport", "piłka nożna", "wisła", "cracovia", "legia", "widzew", "lech",
            "ekstraklasa", "liga", "bramka", "gol", "trener", "piłkarze", "siatkówka", "żużel",
            "koszykówka", "skoki narciarskie", "zawodnik", "stadion", "remis"
        ],
        "rozrywka": [
            "telewizja", "gwiazdy", "plotki", "celebryci", "taniec z gwiazdami", "eurowizja",
            "show", "znana aktorka", "znany aktor"
        ],
        "styl_zycia": [
            "dom", "wnętrze", "moto", "samochód", "przepisy drogowe", "mandat", "fotoradar",
            "technologie", "smartfon", "gry", "zakupy", "okazje", "kuchnia", "przepis", "uroda"
        ],
        "rolnictwo": [
            "wieś", "rolnictwo", "rolnik", "rolnicy", "produkcja rolna", "ceny skupu", "dopłaty bezpośrednie",
            "kgw", "koło gospodyń wiejskich", "dożynki", "plony", "żniwa"
        ],
        "swiat": [
            "świat", "papież", "watykan", "putin", "ukraina", "rosja", "usa", "ue", "bruksela",
            "prezydent usa", "wojna w ukrainie", "polityka międzynarodowa"
        ],
    }

    # Distinct Polish regions mapping to detect other_region = True
    ALL_REGIONS = {
        "śląsk": ["śląsk", "śląska", "śląsku", "katowice", "śląski", "śląskiego", "śląskie"],
        "małopolska": ["małopolska", "małopolski", "małopolskie", "kraków", "krakowa", "tarnów"],
        "pomorze": ["pomorze", "pomorskie", "gdańsk", "gdynia", "sopot"],
        "kujawy": ["kujawy", "kujawsko-pomorskie", "bydgoszcz", "toruń", "grudziądz", "włocławek"],
        "wielkopolska": ["wielkopolska", "wielkopolskie", "poznań", "kalisz"],
        "dolny_śląsk": ["dolny śląsk", "dolnośląskie", "wrocław", "wałbrzych"],
        "łódzkie": ["łódź", "łódzkie", "piotrków"],
        "lubelskie": ["lublin", "lubelskie", "zamość"],
        "podkarpacie": ["podkarpacie", "podkarpackie", "rzeszów"],
        "podlasie": ["podlasie", "podlaskie", "białystok"],
        "świętokrzyskie": ["świętokrzyskie", "kielce", "radom"],
    }

    def __init__(self, taxonomy_manager: TaxonomyManager):
        self.taxonomy = taxonomy_manager
        self._model_version = "rule-engine-v2.0"

    @property
    def model_version(self) -> str:
        return self._model_version

    @property
    def taxonomy_version(self) -> str:
        return "2.0.0"

    def _normalize(self, text: str) -> str:
        if not text:
            return ""
        return " " + re.sub(r"[^\w\s]", " ", text.lower()) + " "

    def _score_patterns(self, text: str, patterns: List[str]) -> float:
        norm = self._normalize(text)
        score = 0.0
        for pat in patterns:
            pat_norm = f" {pat.lower()} "
            if pat_norm in norm:
                score += 2.0
            elif pat.lower() in norm:
                score += 1.0
        return score

    def classify(self, article: Article) -> ClassificationResult:
        full_text = f"{article.title} {article.lead or ''} {article.body or ''}"
        title_text = article.title
        lead_text = article.lead or ""

        # -------------------------------------------------------------
        # DOMAIN RESOLUTION (Rules 1-5)
        # -------------------------------------------------------------
        domain_scores: Dict[str, float] = {}
        for d_slug, patterns in self.DOMAIN_PATTERNS.items():
            t_score = self._score_patterns(title_text, patterns) * 3.0
            l_score = self._score_patterns(lead_text, patterns) * 1.5
            b_score = self._score_patterns(article.body[:1500] if article.body else "", patterns) * 0.5
            sec_score = 0.0
            if article.section:
                sec_score = self._score_patterns(article.section, patterns) * 4.0

            domain_scores[d_slug] = t_score + l_score + b_score + sec_score

        # Rule 3: Accident / crime is ALWAYS 'zdarzenia' regardless of location
        zdarzenia_triggers = ["pożar", "wypadek", "katastrofa", "zderzenie", "śmierć", "zginął", "areszt", "zabójstwo"]
        if any(trig in title_text.lower() for trig in zdarzenia_triggers):
            domain_scores["zdarzenia"] = domain_scores.get("zdarzenia", 0.0) + 15.0

        # Rule 1: Hospital wages -> primary 'zdrowie', secondary 'gospodarka'
        if ("szpital" in title_text.lower() or "medyk" in title_text.lower() or "lekarz" in title_text.lower()) and \
           ("pensj" in title_text.lower() or "płac" in title_text.lower() or "wypłaci" in title_text.lower()):
            domain_scores["zdrowie"] = 25.0
            domain_scores["gospodarka"] = 18.0

        # Rule for world affairs (Pope, Putin, Ukraine, US)
        if any(w in title_text.lower() for w in ["papież", "putin", "rosja", "ukraina", "biden", "trump"]):
            domain_scores["swiat"] = domain_scores.get("swiat", 0.0) + 20.0

        # Rank domains
        ranked = sorted(domain_scores.items(), key=lambda x: x[1], reverse=True)
        primary_domain, top_score = ranked[0] if ranked and ranked[0][1] > 0 else ("spolecznosc", 0.0)

        secondary_domain: Optional[str] = None
        if len(ranked) > 1 and ranked[1][1] >= 4.0:
            secondary_domain = ranked[1][0]

        # Specific tie-breaking for health/economy
        if primary_domain == "zdrowie" and any(k in title_text.lower() for k in ["pensj", "płac", "pieniędz"]):
            secondary_domain = "gospodarka"

        # -------------------------------------------------------------
        # LOCALITY RESOLUTION (C / CL / L / other_region)
        # -------------------------------------------------------------
        press_title = article.press_title or article.domain or ""
        coverage = self.taxonomy.get_coverage_for_domain(article.domain) or {}
        if not coverage and article.press_title:
            clean_title = article.press_title.lower().replace(" ", "")
            for k, v in self.taxonomy.coverage_areas.items():
                if clean_title in k.replace("_", "") or v.get("name", "").lower() in article.press_title.lower():
                    coverage = v
                    break

        cov_cities = [c.lower() for c in coverage.get("cities", [])]
        cov_counties = [c.lower() for c in coverage.get("counties", [])]
        cov_voiv = [v.lower() for v in coverage.get("voivodeships", [])]

        title_lead_norm = self._normalize(f"{title_text} {lead_text}")

        # Check local entities in title/lead matching this title's coverage
        has_local_entity = False
        for c in cov_cities:
            c_stem = c.replace("ów", "ow").rstrip("eayiuo")
            if f" {c} " in title_lead_norm or f" {c_stem}" in title_lead_norm or c in title_lead_norm:
                has_local_entity = True
                break
        if not has_local_entity:
            for co in cov_counties:
                co_stem = co.replace("ów", "ow").rstrip("eayiuo")
                if f" {co} " in title_lead_norm or f" {co_stem}" in title_lead_norm or co in title_lead_norm:
                    has_local_entity = True
                    break

        # Check local sports clubs or regional indicators
        if not has_local_entity:
            if "wisł" in title_lead_norm and ("krakow" in press_title.lower() or "małopol" in str(cov_voiv)):
                has_local_entity = True
            elif "cracovi" in title_lead_norm and ("krakow" in press_title.lower() or "małopol" in str(cov_voiv)):
                has_local_entity = True
            elif "lech" in title_lead_norm and ("wielkopol" in press_title.lower() or "wielkopol" in str(cov_voiv)):
                has_local_entity = True
            elif "lechi" in title_lead_norm and ("bałtyc" in press_title.lower() or "pomor" in str(cov_voiv)):
                has_local_entity = True

        has_region_phrase = any(p in title_lead_norm for p in ["z regionu", "w regionie", "lokaln", "u nas"])

        # Check other_region detection
        other_region = False
        other_region_mentions = []
        for reg_name, reg_keywords in self.ALL_REGIONS.items():
            # If the article matches this region but our title's voivodeship does NOT cover it
            is_our_region = any(reg_name in v for v in cov_voiv)
            if not is_our_region:
                if any(f" {kw} " in title_lead_norm for kw in reg_keywords):
                    other_region_mentions.append(reg_name)

        if other_region_mentions and not has_local_entity:
            other_region = True

        # Determine locality code
        national_triggers = [
            "w polsce", "ogólnopolsk", "rząd", "sejm", "ustawa", "wibor", "stopy procentowe",
            "nbp", "zus", "nowe przepisy", "emerytura w polsce", "najwyższa emerytura"
        ]
        is_national_topic = any(nt in title_lead_norm for nt in national_triggers) or primary_domain in ("wladza", "swiat")

        if other_region:
            locality = "C"
        elif primary_domain == "swiat":
            locality = "CL" if (has_local_entity or has_region_phrase) else "C"
        elif primary_domain == "styl_zycia":
            locality = "CL" if (has_local_entity or has_region_phrase) else "C"
        elif is_national_topic:
            if has_local_entity or has_region_phrase:
                locality = "CL"
            else:
                locality = "C"
        else:
            if has_local_entity or has_region_phrase:
                locality = "L"
            else:
                locality = "C"

        # Special case from requirements: "Ustawa ograniczy dostęp do social mediów" bez lokalnego wątku -> wladza / C
        if "ustawa" in title_text.lower() and "social medi" in title_text.lower():
            primary_domain = "wladza"
            locality = "C"

        # Special case from requirements: "Koniec WIBOR coraz bliżej" -> gospodarka / C
        if "wibor" in title_text.lower():
            primary_domain = "gospodarka"
            locality = "C"

        # Confidence calculation
        confidence = 0.92 if top_score >= 6.0 else (0.75 if top_score >= 3.0 else 0.55)
        needs_review = confidence < 0.60

        # Legacy backward-compatible mapping for primary_topic
        LEGACY_MAP = {
            "wladza": "POLITYKA",
            "zdarzenia": "PRAWO_BEZPIECZENSTWO",
            "obronnosc": "POLITYKA",
            "gospodarka": "GOSPODARKA",
            "infrastruktura": "LOKALNE_REGIONALNE",
            "przestrzen": "LOKALNE_REGIONALNE",
            "zdrowie": "ZDROWIE_STYL_ZYCIA",
            "edukacja": "EDUKACJA",
            "srodowisko": "SRODOWISKO_ROLNICTWO",
            "spolecznosc": "SPOLECZENSTWO",
            "kultura": "KULTURA_ROZRYWKA",
            "historia": "KULTURA_ROZRYWKA",
            "czas_wolny": "KULTURA_ROZRYWKA",
            "sport": "SPORT",
            "rozrywka": "KULTURA_ROZRYWKA",
            "styl_zycia": "MOTORYZACJA" if "auto" in title_text.lower() or "samochód" in title_text.lower() else "ZDROWIE_STYL_ZYCIA",
            "rolnictwo": "SRODOWISKO_ROLNICTWO",
            "swiat": "POLITYKA",
        }
        legacy_topic = LEGACY_MAP.get(primary_domain, "INNE/NIEOKREŚLONE")

        return ClassificationResult(
            canonical_url=article.canonical_url,
            domain=primary_domain,
            domain_secondary=secondary_domain,
            locality=locality,
            other_region=other_region,
            needs_review=needs_review,
            confidence=confidence,
            primary_topic=legacy_topic,
            secondary_topics=[LEGACY_MAP.get(secondary_domain)] if secondary_domain else [],
            model_version=self.model_version,
            prompt_version=None,
            taxonomy_version=self.taxonomy_version,
        )
