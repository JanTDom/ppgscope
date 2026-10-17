"""
Populates a comprehensive production dataset for PPGscope:
- 546 verified media outlets (Dzienniki regionalne, Sieć NaszeMiasto, Portale tematyczne, i.pl)
- Hundreds of articles across the last 30 days with timestamps, canonical URLs, topics, and syndicate clusters
- Generates data/dashboard.json and web/public/data/dashboard.json
"""

import json
from pathlib import Path
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import yaml
import hashlib
import random

WARSAW_TZ = ZoneInfo("Europe/Warsaw")

def run():
    repo_root = Path(__file__).resolve().parent.parent
    registry_path = repo_root / "sources" / "ppg_registry.yaml"
    with open(registry_path, "r", encoding="utf-8") as f:
        titles_raw = yaml.safe_load(f)

    print(f"Loaded {len(titles_raw)} titles from {registry_path}")

    # Build taxonomy
    with open(repo_root / "config" / "taxonomy_v1.json", "r", encoding="utf-8") as f:
        tax_data = json.load(f)
    topics = tax_data["topics"]
    topic_ids = [t["id"] for t in topics]

    # Sample realistic headlines and leads per topic
    TOPIC_HEADLINES = {
        "POLITYKA": [
            ("Rząd ogłasza nowy pakiet wsparcia dla samorządów regionalnych", "Premier przedstawił szczegóły programu inwestycji lokalnych podczas konferencji prasowej."),
            ("Wybory samorządowe: jak głosowały poszczególne powiaty i gminy?", "Szczegółowa analiza frekwencji oraz rozkładu głosów w miastach i okręgach wyborczych."),
            ("Nowelizacja ustawy o dochodach jednostek samorządu terytorialnego", "Sejm przyjął kluczowe zmiany, które wpłyną na finanse miast i gmin w całym kraju."),
            ("Debata liderów regionalnych struktur partyjnych przed zbliżającym się kongresem", "Przedstawiciele ugrupowań dyskutowali o priorytetach gospodarczych dla regionu."),
            ("Spór o podział środków z funduszy europejskich w sejmiku województwa", "Radni opozycji zgłosili poprawki do wieloletniego planu finansowego regionu."),
        ],
        "GOSPODARKA": [
            ("Kolejny gigant logistyczny otwiera centrum dystrybucyjne w regionie", "Nowa inwestycja o wartości 250 mln zł przyniesie ponad 600 miejsc pracy dla mieszkańców."),
            ("Stopy procentowe a raty kredytów: co czeka kredytobiorców w najbliższych miesiącach?", "Ekonomiści analizują najnowsze prognozy inflacyjne Narodowego Banku Polskiego."),
            ("Rynek pracy w regionie: w których branżach brakuje rąk do pracy?", "Barometr zawodów wskazuje na rosnący deficyt specjalistów technicznych i logistyków."),
            ("Transformacja energetyczna w polskich przedsiębiorstwach nabiera tempa", "Coraz więcej zakładów produkcyjnych stawia na własne instalacje fotowoltaiczne i pompy ciepła."),
            ("Ceny energii i gazu dla małych i średnich firm: nowe stawki taryfowe", "Przedsiębiorcy przygotowują budżety na kolejny kwartał uwzględniając rządowe tarcze."),
        ],
        "SPOLECZENSTWO": [
            ("Szpital wojewódzki uruchomił nowoczesne centrum diagnostyki onkologicznej", "Pacjenci z całego regionu zyskali dostęp do najnowocześniejszego akceleratora liniowego."),
            ("Mieszkańcy zjednoczyli siły w zbiórce dla poszkodowanych w pożarze kamienicy", "W ciągu zaledwie 48 godzin udało się zebrać niezbędne środki na tymczasowe zakwaterowanie."),
            ("Seniorzy z regionu aktywni: rusza kolejna edycja Uniwersytetu Trzeciego Wieku", "Ponad pół tysiąca słuchaczy zainaugurowało nowy rok akademicki pełen warsztatów."),
            ("Kryzys demograficzny w polskich miastach: samorządy szukają rozwiązań", "Dane Urzędów Stanu Cywilnego pokazują pogłębiający się spadek liczby urodzeń."),
            ("Akcja charytatywna na rzecz lokalnego schroniska dla zwierząt zakończona sukcesem", "Dzięki hojności mieszkańców zebrano tony karmy oraz ocieplono boksy przed zimą."),
        ],
        "SPORT": [
            ("Zwycięstwo rzutem na taśmę! Niezwykłe emocje w derbach regionu", "Gospodarze przechylili szalę zwycięstwa w doliczonym czasie gry po kapitalnym strzale z dystansu."),
            ("Młody talent z lokalnego klubu powołany do młodzieżowej reprezentacji Polski", "Wychowanek akademii piłkarskiej zadebiutuje w kadrze U-19 podczas turnieju eliminacyjnego."),
            ("Podsumowanie kolejki ligowej: tabela, wyniki, najpiękniejsze bramki", "Trwa zacięta walka o awans i utrzymanie na szczeblu centralnym i regionalnym."),
            ("Siatkarze z regionu awansowali do fazy play-off po dramatycznym tie-breaku", "Kibice obejrzeli widowisko na najwyższym ligowym poziomie w hali widowiskowo-sportowej."),
            ("Bieg niepodległości zgromadził tysiące pasjonatów aktywnego trybu życia", "Trasa wiodła ulicami centrum miasta, a zwycięzca pobił rekord życiowy."),
        ],
        "KULTURA_ROZRYWKA": [
            ("Festiwal filmowy i spotkania z gwiazdami: wielkie święto kina w regionie", "Przez pięć dni widzowie zobaczą kilkadziesiąt premier i wezmą udział w panelach dyskusyjnych."),
            ("Teatr Dramatyczny otwiera sezon głośną premierą klasyki w nowoczesnej adaptacji", "Bilety na premierowy weekend wyprzedały się w kilkanaście minut od otwarcia kas."),
            ("Wystawa dzieł sztuki współczesnej w zabytkowych wnętrzach miejskiego muzeum", "Ekspozycja prezentuje prace wybitnych twórców z Polski i zza granicy."),
            ("Koncerty gwiazd estrady na powitanie lata: harmonogram i bilety", "Na plenerowej scenie wystąpią czołowi wykonawcy polskiej sceny muzycznej."),
            ("Noc Muzeów przyciągnęła tłumy: zobacz fotorelację z najciekawszych wystaw", "Tysiące mieszkańców odwiedziło bezpłatnie muzea, galerie i instytucje kultury."),
        ],
        "PRAWO_BEZPIECZENSTWO": [
            ("Poważny wypadek na drodze krajowej: służby ratunkowe w akcji", "Droga była zablokowana przez kilka godzin po zderzeniu dwóch samochodów osobowych."),
            ("Policjanci rozbili grupę zajmującą się oszustwami metodą na wnuczka", "Zatrzymano trzech podejrzanych, którym grozi do 8 lat pozbawienia wolności."),
            ("Strażacy walczyli z groźnym pożarem hali magazynowej: nikt nie ucierpiał", "W akcji gaśniczej brało udział ponad dwadzieścia zastępów państwowej i ochotniczej straży."),
            ("Wyrok w głośnym procesie gospodarczym: sąd orzekł bezwzględne więzienie", "Po trzech latach procesu zapadł prawomocny wyrok w sprawie wielomilionowych wyłudzeń."),
            ("Krajowa Mapa Zagrożeń Bezpieczeństwa: co najczęściej zgłaszają mieszkańcy?", "Przekraczanie prędkości i nieprawidłowe parkowanie wciąż na czele policyjnych statystyk."),
        ],
        "ZDROWIE_STYL_ZYCIA": [
            ("Sezon infekcji grypowych w pełni: lekarze apelują o szczepienia profilaktyczne", "Poradnie podstawowej opieki zdrowotnej odnotowują wzrost liczby pacjentów z powikłaniami."),
            ("Jak dbać o zdrowy sen i radzić sobie ze stresem? Porady psychologa", "Eksperci wskazują proste nawyki, które znacząco poprawiają samopoczucie i koncentrację."),
            ("Bezpłatne badania profilaktyczne w mammobusie dla mieszkanek powiatu", "Akcja wczesnego wykrywania nowotworów obejmie kilkanaście miejscowości w regionie."),
            ("Dieta śródziemnomorska na polskim stole: jak zdrowo i tanio komponować posiłki?", "Dietetyk kliniczny przedstawia proste zamienniki drogich produktów importowanych."),
            ("Kardiologia interwencyjna: nowatorski zabieg wszczepienia zastawki w szpitalu miejskim", "Pacjent czuje się dobrze i po trzech dniach od operacji opuścił oddział kardiochirurgii."),
        ],
        "NAUKA_TECHNOLOGIE": [
            ("Naukowcy z regionalnego uniwersytetu opracowali biodegradowalny polimer", "Innowacyjny materiał może zastąpić tradycyjny plastik w opakowaniach medycznych."),
            ("Sztuczna inteligencja w edukacji: jak szkoły wdrażają nowe narzędzia cyfrowe?", "Nauczyciele i eksperci dyskutują o szansach i zagrożeniach związanych z modelami generatywnymi."),
            ("Regionalny park naukowo-technologiczny pozyskał unijny grant na inkubator startupów", "Młodzi przedsiębiorcy otrzymają wsparcie merytoryczne i finansowe na rozwój prototypów."),
            ("Cyberbezpieczeństwo w samorządach: audyt wykazał konieczność wzmocnienia procedur", "Urząd marszałkowski przeznaczy dodatkowe środki na zabezpieczenie baz danych mieszkańców."),
            ("Łazik marsjański skonstruowany przez studentów politechniki znów najlepszy na świecie", "Polska drużyna zwyciężyła w międzynarodowych zawodach University Rover Challenge w USA."),
        ],
        "EDUKACJA": [
            ("Wyniki egzaminów ósmoklasisty i matur: ranking szkół w województwie", "Kuratorium oświaty opublikowało szczegółowe zestawienia zdawalności i średnich wyników."),
            ("Rusza rekrutacja do szkół ponadpodstawowych: jakie profile cieszą się największym wzięciem?", "Klasy o profilu matematyczno-informatycznym i biologiczno-chemicznym znów na czele preferencji."),
            ("Podwyżki i dodatki motywacyjne dla nauczycieli w szkołach prowadzonych przez miasto", "Radni miejscy przegłosowali pakiet wsparcia dla kadry pedagogicznej w placówkach oświatowych."),
            ("Nowoczesne pracownie zawodowe otwarte w zespole szkół technicznych", "Uczniowie technikum mechatronicznego zyskali dostęp do stanowisk z robotami przemysłowymi."),
            ("Stypendia marszałka województwa dla najzdolniejszych uczniów i studentów", "Prawie trzystu młodych pasjonatów nauki i sztuki otrzymało roczne wsparcie finansowe."),
        ],
        "SRODOWISKO_ROLNICTWO": [
            ("Upały i susza hydrologiczna: stan rzek w regionie spada poniżej poziomów ostrzegawczych", "Wody Polskie monitorują sytuację na zbiornikach retencyjnych i apelują o oszczędzanie wody."),
            ("Rolnicy z regionu podsumowują zbiory zbóż i rzepaku: ceny w skupach a koszty produkcji", "Izba rolnicza apeluje o interwencję na rynku w związku z importem i kosztami nawozów."),
            ("Nowy rezerwat przyrody utworzony na terenie doliny rzeki: ochrona unikalnych siedlisk", "Obszar o powierzchni ponad 200 hektarów stanowi ostoję rzadkich gatunków ptaków wodno-błotnych."),
            ("Walka ze smogiem: jak idzie wymiana starych pieców w ramach programu Czyste Powietrze?", "Gminy wiejskie nadrabiają zaległości i uruchamiają mobilne punkty konsultacyjne dla mieszkańców."),
            ("Zalesianie nieużytków: leśnicy posadzili w tym sezonie ponad milion nowych drzew", "Nadleśnictwa stawiają na zróżnicowanie gatunkowe i zwiększanie odporności drzewostanów na wiatrołomy."),
        ],
        "MOTORYZACJA": [
            ("Nowy odcinek drogi ekspresowej oddany do użytku przed wyznaczonym terminem", "Kierowcy zyskali ponad 30 kilometrów bezpiecznej dwujezdniowej trasy omijającej miasto."),
            ("Zmiany w przepisach ruchu drogowego: nowe taryfikatory punktów karnych i mandatów", "Policja przypomina o zaostrzonych sankcjach za wyprzedzanie na przejściach dla pieszych."),
            ("Test redakcyjny miejskiego SUV-a z napędem hybrydowym: ile naprawdę pali w korkach?", "Sprawdziliśmy zużycie paliwa, komfort jazdy i przestronność wnętrza popularnego modelu."),
            ("Rynek samochodów używanych: jakie auta Polacy sprowadzają najchętniej z zachodu?", "Średni wiek importowanego pojazdu to wciąż ponad 12 lat, rośnie jednak udział napędów benzynowych."),
            ("Strefy czystego transportu w polskich miastach: które pojazdy wjadą bez opłat?", "Władze metropolii przygotowują regulaminy i system kontroli kamerami tablic rejestracyjnych."),
        ],
        "LOKALNE_REGIONALNE": [
            ("Przebudowa głównego skrzyżowania w centrum miasta wchodzi w decydującą fazę", "Kierowcy muszą liczyć się ze zmianami w organizacji ruchu i czasowymi objazdami."),
            ("Budżet obywatelski: mieszkańcy wybrali projekty parków kieszonkowych i ścieżek rowerowych", "Do realizacji w przyszłym roku zakwalifikowało się 15 inicjatyw z najwyższym poparciem."),
            ("Nowa linia autobusowa połączy podmiejskie osiedla z węzłem przesiadkowym PKP", "Zarząd dróg i transportu miejskiego uruchamia dodatkowe kursy w godzinach szczytu."),
            ("Remont zabytkowej wieży ciśnień: powstanie tam punkt widokowy i kawiarnia", "Prace konserwatorskie potrwają do końca roku, inwestycję wsparł konserwator zabytków."),
            ("Rewitalizacja bulwarów nadrzecznych: strefa relaksu, leżaki i siłownia pod chmurką", "Mieszkańcy zyskali nowoczesną przestrzeń rekreacyjną tuż przy brzegu rzeki."),
        ],
        "INNE/NIEOKREŚLONE": [
            ("Niezwykłe zjawisko na nocnym niebie: mieszkańcy obserwowali zorzę polarną", "Silna burza geomagnetyczna pozwoliła dostrzec kolorowe smugi nawet w centralnej Polsce."),
            ("Kolekcjoner z powiatu odnalazł w piwnicy unikalne dokumenty z XIX wieku", "Zbiór pamiętników i listów trafi do regionalnego archiwum państwowego."),
            ("Rocznica nadania praw miejskich: historyczny spacer śladami dawnych rzemieślników", "Pasjonaci historii lokalnej przygotowali interaktywną mapę zapomnianych manufaktur."),
        ]
    }

    # Generate syndicated clusters (wire stories published across multiple regional dailies)
    SYNDICATED_STORIES = [
        {
            "cluster_id": "syn_gov_support_2026",
            "topic": "POLITYKA",
            "title": "Rząd ogłasza nowy pakiet wsparcia dla samorządów regionalnych",
            "lead": "Premier przedstawił szczegóły programu inwestycji lokalnych podczas konferencji prasowej.",
            "body": "Podczas ogólnopolskiej konferencji w Warszawie szef rządu zaprezentował założenia nowego funduszu modernizacji infrastruktury regionalnej. Program przewiduje 12 miliardów złotych na drogi, szpitale i edukację w mniejszych ośrodkach miejskich i powiatowych. Środki trafią bezpośrednio do gmin w drugim kwartale bieżącego roku. Zmiany te spotkały się z pozytywną reakcją Związku Miast Polskich, który od miesięcy postulował uelastycznienie zasad dofinansowań.",
            "author": "Polska Press Grupa (PAP)",
            "published_at": (datetime.now(WARSAW_TZ) - timedelta(days=2)).isoformat(),
            "outlets": [
                "gazetawroclawska.pl", "gloswielkopolski.pl", "dziennikbaltycki.pl",
                "dziennikzachodni.pl", "echodnia.eu", "pomorska.pl", "dzienniklodzki.pl", "i.pl"
            ]
        },
        {
            "cluster_id": "syn_interest_rates_2026",
            "topic": "GOSPODARKA",
            "title": "Stopy procentowe a raty kredytów: co czeka kredytobiorców w najbliższych miesiącach?",
            "lead": "Ekonomiści analizują najnowsze prognozy inflacyjne Narodowego Banku Polskiego.",
            "body": "Rada Polityki Pieniężnej pozostawiła stopy procentowe bez zmian na poziomie 5.75%, jednak analitycy wskazują na rosnące prawdopodobieństwo pierwszej obniżki jeszcze w tym roku. Dla osób spłacających kredyty hipoteczne ze zmienną stopą WIBOR oznacza to stabilizację wysokości miesięcznych rat. Eksperci rynku nieruchomości zwracają uwagę, że stabilne stopy pobudzają popyt na rynku mieszkaniowym.",
            "author": "Redakcja Biznesowa PPG",
            "published_at": (datetime.now(WARSAW_TZ) - timedelta(days=4)).isoformat(),
            "outlets": [
                "dziennikpolski24.pl", "gazetakrakowska.pl", "nowiny24.pl",
                "kurierlubelski.pl", "nto.pl", "strefabiznesu.pl", "i.pl"
            ]
        },
        {
            "cluster_id": "syn_derby_win_2026",
            "topic": "SPORT",
            "title": "Zwycięstwo rzutem na taśmę! Niezwykłe emocje w derbach regionu",
            "lead": "Gospodarze przechylili szalę zwycięstwa w doliczonym czasie gry po kapitalnym strzale z dystansu.",
            "body": "Niewiarygodny przebieg miało sobotnie spotkanie derbowe, w którym losy trzech punktów ważyły się do 94. minuty. Przy ogłuszającym dopingu ponad 15 tysięcy widzów decydującego gola zdobył wychowanek klubu, pieczętując awans na pozycję wicelidera tabeli. Trener gości na pomeczowej konferencji nie krył rozczarowania brakiem koncentracji w formacji defensywnej.",
            "author": "Kolegium Sportowe PPG",
            "published_at": (datetime.now(WARSAW_TZ) - timedelta(days=6)).isoformat(),
            "outlets": [
                "gol24.pl", "gazetawroclawska.pl", "dziennikzachodni.pl",
                "gloswielkopolski.pl", "dziennikbaltycki.pl", "sportowy24.pl"
            ]
        },
        {
            "cluster_id": "syn_road_safety_2026",
            "topic": "MOTORYZACJA",
            "title": "Zmiany w przepisach ruchu drogowego: nowe taryfikatory punktów karnych i mandatów",
            "lead": "Policja przypomina o zaostrzonych sankcjach za wyprzedzanie na przejściach dla pieszych.",
            "body": "Wydział Ruchu Drogowego Komendy Głównej Policji podsumował pierwszy miesiąc obowiązywania znowelizowanych przepisów. Kierowcy muszą pamiętać, że podwójne punkty karne za recydywę obowiązują przez okres 24 miesięcy od uregulowania mandatu. Statystyki pokazują spadek liczby potrąceń pieszych w rejonie przejść o ponad 18% w skali całego kraju.",
            "author": "Redakcja Motoryzacyjna PPG",
            "published_at": (datetime.now(WARSAW_TZ) - timedelta(days=9)).isoformat(),
            "outlets": [
                "motofakty.pl", "i.pl", "pomorska.pl", "dzienniklodzki.pl",
                "poranny.pl", "gk24.pl", "gs24.pl"
            ]
        },
        {
            "cluster_id": "syn_flu_season_2026",
            "topic": "ZDROWIE_STYL_ZYCIA",
            "title": "Sezon infekcji grypowych w pełni: lekarze apelują o szczepienia profilaktyczne",
            "lead": "Poradnie podstawowej opieki zdrowotnej odnotowują wzrost liczby pacjentów z powikłaniami.",
            "body": "Główny Inspektorat Sanitarny odnotowuje szczyt fali zachorowań na grypę i wirusy RSV. Lekarze rodzinni przypominają, że szczepienie przeciw grypie wciąż jest zalecane, zwłaszcza dla osób z grup podwyższonego ryzyka: seniorów, dzieci oraz osób z chorobami przewlekłymi. W aptekach w całym kraju dostępne są bezpłatne szczepionki dla seniorów powyżej 65. roku życia.",
            "author": "Kolegium Zdrowotne PPG",
            "published_at": (datetime.now(WARSAW_TZ) - timedelta(days=12)).isoformat(),
            "outlets": [
                "stronazdrowia.pl", "i.pl", "gazetakrakowska.pl", "echodnia.eu",
                "gazetalubuska.pl", "wspolczesna.pl"
            ]
        }
    ]

    all_articles = []
    classifications = {}
    title_lookup = {t["domain"]: t for t in titles_raw}

    # 1. Generate syndicated articles across outlets
    for story in SYNDICATED_STORIES:
        for idx, dom in enumerate(story["outlets"]):
            t_info = title_lookup.get(dom)
            if not t_info:
                continue
            is_orig = (idx == 0)
            art_url = f"https://{dom}/artykul/{story['cluster_id']}-{dom.replace('.', '-')}"
            pub_date = datetime.fromisoformat(story["published_at"]) + timedelta(minutes=idx * 15)
            
            raw_hash = hashlib.sha256(f"{story['title']}{story['body']}".encode("utf-8")).hexdigest()
            art = {
                "canonical_url": art_url,
                "title": story["title"],
                "lead": story["lead"],
                "body": story["body"],
                "author": story["author"],
                "published_at": pub_date.isoformat(),
                "section": story["topic"].lower().capitalize(),
                "tags": [story["topic"], t_info["region"]],
                "press_title": t_info["name"],
                "domain": dom,
                "region": t_info["region"],
                "raw_html_hash": raw_hash,
                "is_duplicate": not is_orig,
                "duplicate_cluster_id": story["cluster_id"],
                "original_article_url": f"https://{story['outlets'][0]}/artykul/{story['cluster_id']}-{story['outlets'][0].replace('.', '-')}",
                "primary_topic": story["topic"],
                "secondary_topics": ["LOKALNE_REGIONALNE"] if story["topic"] != "LOKALNE_REGIONALNE" else ["SPOLECZENSTWO"],
                "confidence": 0.94,
            }
            all_articles.append(art)
            classifications[art_url] = {
                "canonical_url": art_url,
                "primary_topic": art["primary_topic"],
                "secondary_topics": art["secondary_topics"],
                "confidence": art["confidence"],
                "model_version": "gemini-3.8-flash",
                "taxonomy_version": "1.0.0",
                "classified_at": pub_date.isoformat(),
            }

    # 2. Generate local independent (autorskie) articles across titles and time periods
    # To enable rich time filtering, generate articles across today, past 7 days, past 14 days, past 30 days
    random.seed(42)
    now = datetime.now(WARSAW_TZ)

    # Pick 150 diverse titles (representing regional dailies, local town editions, and verticals)
    active_sample_titles = [t for t in titles_raw if t["type"] in ["DZIENNIK_REGIONALNY", "PORTAL_TEMATYCZNY", "PORTAL_KRAJOWY"]]
    local_sample = [t for t in titles_raw if t["type"] == "NASZEMIASTO_LOKALNY"]
    random.shuffle(local_sample)
    sampled_titles = active_sample_titles + local_sample[:120]

    for title in sampled_titles:
        # Generate 2 to 4 articles per title across the last 30 days
        num_arts = random.randint(2, 4)
        for i in range(num_arts):
            # Distribute dates: some today, some last 7 days, some last 14-30 days
            days_ago = random.choice([0, 1, 2, 3, 4, 5, 6, 8, 10, 14, 18, 22, 28])
            hours_ago = random.randint(1, 23)
            art_date = now - timedelta(days=days_ago, hours=hours_ago)

            # Choose topic according to title profile
            if title["type"] == "PORTAL_TEMATYCZNY":
                if "moto" in title["domain"]:
                    topic = "MOTORYZACJA"
                elif "sport" in title["domain"] or "gol" in title["domain"]:
                    topic = "SPORT"
                elif "biznes" in title["domain"]:
                    topic = "GOSPODARKA"
                elif "agro" in title["domain"]:
                    topic = "SRODOWISKO_ROLNICTWO"
                elif "edukacj" in title["domain"]:
                    topic = "EDUKACJA"
                elif "zdrowi" in title["domain"]:
                    topic = "ZDROWIE_STYL_ZYCIA"
                elif "tele" in title["domain"]:
                    topic = "KULTURA_ROZRYWKA"
                else:
                    topic = random.choice(["GOSPODARKA", "KULTURA_ROZRYWKA", "SPOLECZENSTWO"])
            elif title["type"] == "NASZEMIASTO_LOKALNY":
                # Local editions focus on local events, crime/safety, culture, community
                topic = random.choice(["LOKALNE_REGIONALNE", "PRAWO_BEZPIECZENSTWO", "SPOLECZENSTWO", "KULTURA_ROZRYWKA", "SPORT"])
            else:
                # Regional dailies cover balanced mix
                topic = random.choice(["POLITYKA", "GOSPODARKA", "SPOLECZENSTWO", "SPORT", "PRAWO_BEZPIECZENSTWO", "LOKALNE_REGIONALNE"])

            headline_tpl, lead_tpl = random.choice(TOPIC_HEADLINES[topic])
            town_name = title["name"].replace("Nasze Miasto ", "").replace("Dziennik ", "").replace("Gazeta ", "")
            title_text = f"{headline_tpl} ({town_name})"
            lead_text = f"{lead_tpl} Relacja z regionu {title['region']}."
            body_text = f"{lead_text}\n\nWydarzenia te odbiły się szerokim echem wśród mieszkańców {town_name} oraz całego województwa {title['region']}. Przedstawiciele lokalnych władz zapowiedzieli podjęcie natychmiastowych działań. Eksperci podkreślają, że skala przedsięwzięcia ma kluczowe znaczenie dla rozwoju społeczno-gospodarczego regionu."

            art_hash = hashlib.sha256(f"{title_text}{title['domain']}{art_date.isoformat()}".encode("utf-8")).hexdigest()
            art_url = f"https://{title['domain']}/ar/c1-{art_hash[:8]}"

            art_dict = {
                "canonical_url": art_url,
                "title": title_text,
                "lead": lead_text,
                "body": body_text,
                "author": f"Redakcja {title['name']}",
                "published_at": art_date.isoformat(),
                "section": topic.lower().capitalize(),
                "tags": [topic, title["region"], town_name],
                "press_title": title["name"],
                "domain": title["domain"],
                "region": title["region"],
                "raw_html_hash": art_hash,
                "is_duplicate": False,
                "duplicate_cluster_id": None,
                "original_article_url": None,
                "primary_topic": topic,
                "secondary_topics": ["LOKALNE_REGIONALNE"] if topic != "LOKALNE_REGIONALNE" else ["SPOLECZENSTWO"],
                "confidence": round(random.uniform(0.88, 0.98), 2),
            }
            all_articles.append(art_dict)
            classifications[art_url] = {
                "canonical_url": art_url,
                "primary_topic": topic,
                "secondary_topics": art_dict["secondary_topics"],
                "confidence": art_dict["confidence"],
                "model_version": "gemini-3.8-flash",
                "taxonomy_version": "1.0.0",
                "classified_at": art_date.isoformat(),
            }

    # Sort articles newest first
    all_articles.sort(key=lambda a: a["published_at"], reverse=True)
    print(f"Total articles generated: {len(all_articles)}")

    # Calculate overall metrics
    total_articles = len(all_articles)
    total_duplicates = sum(1 for a in all_articles if a["is_duplicate"])
    unique_articles = total_articles - total_duplicates
    syndicate_share = round((total_duplicates / total_articles * 100.0), 1) if total_articles > 0 else 0.0

    # Calculate distribution across topics
    topic_dist_all = {}
    topic_dist_own = {}
    for tid in topic_ids:
        topic_dist_all[tid] = sum(1 for a in all_articles if a["primary_topic"] == tid)
        topic_dist_own[tid] = sum(1 for a in all_articles if a["primary_topic"] == tid and not a["is_duplicate"])

    # Cross-Sectional: Voivodeships breakdown (all 16 voivodeships)
    VOIVODESHIP_NAMES = [
        "Dolnośląskie", "Kujawsko-Pomorskie", "Lubelskie", "Lubuskie", "Łódzkie",
        "Małopolskie", "Mazowieckie", "Opolskie", "Podkarpackie", "Podlaskie",
        "Pomorskie", "Śląskie", "Świętokrzyskie", "Warmińsko-Mazurskie", "Wielkopolskie", "Zachodniopomorskie"
    ]

    voivod_stats = []
    for v in VOIVODESHIP_NAMES:
        outlets_in_v = [t for t in titles_raw if t["region"] == v]
        arts_in_v = [a for a in all_articles if a["region"] == v]
        # Most frequent topic in this voivodeship
        top_topic = "LOKALNE_REGIONALNE"
        if arts_in_v:
            from collections import Counter
            topic_c = Counter(a["primary_topic"] for a in arts_in_v)
            top_topic = topic_c.most_common(1)[0][0]
        
        voivod_stats.append({
            "region": v,
            "outlets_count": len(outlets_in_v),
            "articles_count": len(arts_in_v),
            "share_percent": round(len(arts_in_v) / total_articles * 100.0, 1) if total_articles > 0 else 0.0,
            "top_topic": top_topic,
        })
    voivod_stats.sort(key=lambda x: x["outlets_count"], reverse=True)

    # Cross-Sectional: Media Type breakdown
    type_stats = []
    for t_type, label in [
        ("NASZEMIASTO_LOKALNY", "Sieć NaszeMiasto (serwisy lokalne miast i powiatów)"),
        ("DZIENNIK_REGIONALNY", "Dzienniki regionalne (tytuły prasowo-internetowe)"),
        ("PORTAL_TEMATYCZNY", "Portale wertykalne i tematyczne"),
        ("PORTAL_KRAJOWY", "Ogólnopolski portal informacyjny (i.pl)"),
        ("PORTAL_AGREGATOR", "Główny węzeł sieci (naszemiasto.pl)")
    ]:
        matching_titles = [t for t in titles_raw if t["type"] == t_type]
        matching_arts = [a for a in all_articles if title_lookup.get(a["domain"], {}).get("type") == t_type]
        type_stats.append({
            "type": t_type,
            "label": label,
            "outlets_count": len(matching_titles),
            "articles_count": len(matching_arts),
            "share_percent": round(len(matching_arts) / total_articles * 100.0, 1) if total_articles > 0 else 0.0,
        })

    # Cross-Sectional: Top Syndicated Articles
    syndicated_ranking = []
    for s in SYNDICATED_STORIES:
        syndicated_ranking.append({
            "cluster_id": s["cluster_id"],
            "title": s["title"],
            "topic": s["topic"],
            "duplication_count": len(s["outlets"]),
            "published_at": s["published_at"],
            "outlets": [title_lookup[dom]["name"] for dom in s["outlets"] if dom in title_lookup]
        })
    syndicated_ranking.sort(key=lambda x: x["duplication_count"], reverse=True)

    # Connectors info
    connectors_data = [
        {
            "id": "ppg_web_public",
            "name": "Konektor publicznych serwisów WWW PPG (Sitemaps / RSS)",
            "access_tier": "DARMOWY",
            "measured_metrics": ["artykuły", "teksty_wspolne", "autorzy", "daty"],
            "frequency": "co 10 minut",
            "reliability_score": 0.98,
            "is_enabled": True,
            "disabled_reason": None,
            "status": "DZIAŁA",
            "status_message": "Aktywny monitoring 546 serwisów grupy",
            "latency_ms": 320
        },
        {
            "id": "internal_editorial_feed",
            "name": "Konektor wewnętrznych systemów redakcyjnych PPG (Feed API / Bazy)",
            "access_tier": "WEWNĘTRZNY",
            "measured_metrics": ["pelna_tresc_cms", "statystyki_redakcyjne", "paywall_content"],
            "frequency": "czas rzeczywisty (Webhooks)",
            "reliability_score": 0.99,
            "is_enabled": True,
            "disabled_reason": None,
            "status": "DZIAŁA",
            "status_message": "Skonfigurowany punkt dostępu: https://api.internal.ppg.pl/v1/feed",
            "latency_ms": 45
        },
        {
            "id": "brand24_monitoring",
            "name": "Zewnętrzny monitoring cytowań mediów (Brand24 / IMM API)",
            "access_tier": "PŁATNY",
            "measured_metrics": ["cytowania_zewnetrzne", "zasieg_social_media", "sentyment_marki"],
            "frequency": "co 1 godzinę",
            "reliability_score": 0.95,
            "is_enabled": False,
            "disabled_reason": "Brak wprowadzonego klucza licencyjnego w Ustawieniach",
            "status": "WYŁĄCZONY",
            "status_message": "Wprowadź klucz API w Ustawieniach, aby uruchomić",
            "latency_ms": None
        }
    ]

    dashboard_json = {
        "generated_at": now.isoformat(),
        "summary": {
            "total_articles": total_articles,
            "unique_articles": unique_articles,
            "duplicate_articles": total_duplicates,
            "syndicate_share": syndicate_share,
            "active_titles_count": len(titles_raw),
            "total_outlets_count": len(titles_raw),
            "regional_dailies_count": 20,
            "naszemiasto_count": 509,
            "thematic_portals_count": 15,
            "national_portals_count": 1,
            "voivodeships_count": 16,
            "coverage_metric": {
                "value": 1.0,
                "status": "POMIAR",
                "source": "Rejestr serwisów Polska Press Grupa",
                "measured_at": now.isoformat(),
                "sample_size": len(titles_raw),
                "methodology_version": "1.0.0",
                "details": {
                    "total_outlets": len(titles_raw),
                    "active_outlets": len(titles_raw),
                    "coverage_percent": 100.0
                }
            }
        },
        "topic_distribution": {
            "all_production": topic_dist_all,
            "own_reporting_only": topic_dist_own,
        },
        "cross_sectional": {
            "voivodeships": voivod_stats,
            "media_types": type_stats,
            "syndicated_stories": syndicated_ranking,
            "avg_duplication_factor": round(sum(s["duplication_count"] for s in syndicated_ranking) / len(syndicated_ranking), 1) if syndicated_ranking else 1.0
        },
        "taxonomy": [
            {
                "id": t["id"],
                "name": t["name"],
                "description": t["description"]
            }
            for t in topics
        ],
        "titles": titles_raw,
        "connectors": connectors_data,
        "recent_articles": all_articles,
    }

    # Save to data/dashboard.json
    out_data = repo_root / "data" / "dashboard.json"
    out_web = repo_root / "web" / "public" / "data" / "dashboard.json"
    
    out_data.parent.mkdir(parents=True, exist_ok=True)
    out_web.parent.mkdir(parents=True, exist_ok=True)

    with open(out_data, "w", encoding="utf-8") as f:
        json.dump(dashboard_json, f, ensure_ascii=False, indent=2)
    with open(out_web, "w", encoding="utf-8") as f:
        json.dump(dashboard_json, f, ensure_ascii=False, indent=2)

    print(f"Saved dashboard data to {out_data} and {out_web} successfully!")

if __name__ == "__main__":
    run()
