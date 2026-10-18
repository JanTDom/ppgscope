# PPGSCOPE: DOCELOWY SYSTEM MONITORINGU I WYWIADU REDAKCYJNEGO CZASU RZECZYWISTEGO DLA 546 MEDIÓW WYDAWNICTWA

## Kompleksowy projekt funkcjonalny, architektoniczny, metodologiczny i operacyjny (Fuzja danych zewnętrznych OSINT z wewnętrznymi systemami wydawniczymi CMS, GA4, Chartbeat, Paywall Strefa Plus oraz zewnętrznym monitoringiem rynku mediów)

| Parametr dokumentu | Szczegółowa specyfikacja |
| :--- | :--- |
| **Nazwa systemu** | **PPGscope** (Polska Press Grupa Real-Time Editorial Intelligence & Command Center) |
| **Wersja dokumentacji** | Wersja 4.0 Enterprise Real-Time (docelowa rozbudowa działającego systemu produkcyjnego v2.5) |
| **Zakres podmiotowy** | **546 portali i serwisów internetowych wydawnictwa**: 20 dzienników regionalnych, 509 miejskich i powiatowych serwisów *NaszeMiasto*, 15 serwisów tematycznych i horyzontalnych, 2 portale ogólnokrajowe oraz domeny archiwalne |
| **Zakres terytorialny** | **16 województw**, **380 powiatów** i miast na prawach powiatu, **2477 gmin** (pełne mapowanie kodów GUS TERYT) |
| **Tryb pracy docelowej** | Ciągły monitoring czasu rzeczywistego 24/7 na centralnym pulpicie zarządczym i redakcyjnym w trzech pętlach: gorącej (15–60 sekund), ciepłej (3–15 minut) oraz chłodnej (1–24 godziny) |
| **Główne filary badawcze** | 1. Taksonomia 18 dziedzin (v2.0) · 2. Lokalność trójstopniowa (`L / CL / C`) · 3. Audyt żywotności i unikalności 546 portali · 4. Audyt pluralizmu, równowagi i tendencji politycznych w regionach · 5. Radar Jedynek i mutacji nagłówków 48h · 6. Fuzja z danymi wewnętrznymi (ruch, czas czytania, Paywall *Strefa Plus*, przychody reklamowe) · 7. Porównywarka wielowymiarowa 360° (`Medium A vs Medium B`) |
| **Wdrożenie produkcyjne** | `https://ppgscope.pl` |
| **Standard jakości** | Fable 5.1 (pełna rozliczalność liczbowa, obiekt dowodowy `MetricProof` dla każdego wskaźnika, testy istotności statystycznej, brak niejawnych przybliżeń) |

---

### Spis treści opracowania

1. **Rozdział 1.** Streszczenie wykonawcze i wizja docelowa pulpitu czasu rzeczywistego (Real-Time Editorial Command Center)
2. **Rozdział 2.** Inwentarz ekosystemu 546 mediów wydawnictwa, topologia sieci i mapowanie powiatowe TERYT we wszystkich 16 województwach
3. **Rozdział 3.** Architektura pozyskiwania danych zewnętrznych (Warstwa bezpłatna OSINT: kanały RSS/Atom, Sitemapy Google News, Sonda DOM stron głównych i rejestry publiczne)
4. **Rozdział 4.** Architektura źródeł wewnętrznych i płatnych (CMS, GA4/BigQuery, Chartbeat/Marfeel, Paywall *Strefa Plus*, AdServer GAM, IMM/Press-Service, GSC/SEO) oraz procedura deterministycznej fuzji danych
5. **Rozdział 5.** Dwadzieścia widoków i macierzy decyzyjnych powstających ze zderzenia danych wewnętrznych z zewnętrznymi (Praktyczne scenariusze zarządcze i redakcyjne)
6. **Rozdział 6.** Szczegółowy opis procedur klasyfikacji 18 dziedzin (Taksonomia v2.0), lokalności (`L / CL / C`), deduplikacji MinHash oraz audytu żywotności 546 portali
7. **Rozdział 7.** Metodologia badania tendencji politycznych, pluralizmu i bezstronności redakcyjnej (Jak mierzyć ekspozycję władzy i opozycji, aby chronić niezależność gazet i unikać przechyłu w którąkolwiek stronę)
8. **Rozdział 8.** Rygor statystyczny, weryfikacja istotności trendów (testy Z, przedziały Wilsona, korekta Benjaminiego-Hochberga) oraz zasada „Dowód każdego wskaźnika" (`MetricProof`)
9. **Rozdział 9.** Docelowa architektura techniczna czasu rzeczywistego, schematy przepływu strumieniowego (Kafka / Redis Streams / ClickHouse / Supabase) i pełny kontrakt bazy danych SQL
10. **Rozdział 10.** Projekt funkcjonalny ekranów docelowego pulpitu, Karty Diagnostycznej 360° Pojedynczego Medium oraz Porównywarki Mediów (`Medium A vs Medium B`)
11. **Rozdział 11.** System wczesnego ostrzegania (Reguły alertów czasu rzeczywistego) oraz automatyczne briefingi poranne dla Zarządu i Redaktorów Naczelnych
12. **Rozdział 12.** Bezpieczeństwo, model uprawnień (RBAC), zgodność prawna oraz kaskadowa optymalizacja kosztów sztucznej inteligencji
13. **Rozdział 13.** Czteroetapowy plan wdrożenia (Mapa drogowa przejścia od wersji v2.5 do pełnego systemu v4.0) oraz zestawienie wzorów
14. **Rozdział 14.** Karty operacyjne wszystkich 18 dziedzin Taksonomii v2.0 (Słowniki sygnałów, rozróżnienie L / CL / C, reguły rozstrzygania sporów i potencjał subskrypcyjny)
15. **Rozdział 15.** Pięć praktycznych studiów przypadku (Symulacja pełnej doby pracy z pulpitem PPGscope w redakcjach regionalnych, powiatowych i branżowych)
16. **Rozdział 16.** Specyfikacja niezawodności produkcyjnej (SLA 99.9%), procedury awaryjne (Failover), testy akceptacyjne i słownik pojęć

---

# Rozdział 1. Streszczenie wykonawcze i wizja docelowa pulpitu czasu rzeczywistego (Real-Time Editorial Command Center)

## 1.1. Dlaczego wydawnictwo o skali 546 portali potrzebuje zintegrowanego pulpitu wywiadu redakcyjnego

Prowadzenie grupy wydawniczej obejmującej 20 dzienników regionalnych, ponad 500 serwisów miejskich i powiatowych *NaszeMiasto* oraz kilkanaście portali tematycznych to operacja na żywym organizmie produkującym od 10 000 do 15 000 publikacji w ciągu jednej doby. W tradycyjnym modelu zarządzania wiedza o tym, co ta gigantyczna sieć faktycznie wytwarza, jest rozproszona po dziesiątkach niespójnych narzędzi.

Redaktor wydania widzi wyłącznie swój system CMS i kolejkę depesz. Analityk ruchu widzi w Google Analytics 4 albo w Gemiusie liczbę odsłon i użytkowników, ale nie ma pojęcia, czy za tymi odsłonami stoi rzetelny artykuł lokalny o budżecie miasta, czy skopiowany na trzysta portali klikbajt o nadchodzącym załamaniu pogody. Zespół odpowiedzialny za płatne subskrypcje *Strefa Plus* widzi tabelę sprzedaży w systemie bilingowym, lecz nie potrafi powiązać jej w czasie rzeczywistym z pytaniem, jaki typ dziennikarstwa, jaki stopień lokalności i które dziedziny tematyczne skłaniają mieszkańców Pomorza, Małopolski czy Wielkopolski do wyjęcia karty płatniczej. Wreszcie zarząd wydawnictwa otrzymuje raporty z opóźnieniem wielu dni, zagregowane do tak ogólnych liczb, że nie widać w nich różnicy między żywą, pracującą redakcją a portalem powiatowym, który od pół roku działa wyłącznie na autopilocie.

System **PPGscope** powstał po to, aby ten podział zlikwidować. Jego celem docelowym jest działanie jako **centralny pulpit monitoringu czasu rzeczywistego (Real-Time Editorial Command Center)**, na którym w jednej chwili można objąć wzrokiem całą grupę 546 mediów, każde województwo, każdy pojedynczy dziennik czy serwis powiatowy, a także zestawić dowolne dwa media obok siebie (`Medium A vs Medium B`).

## 1.2. Siedem fundamentalnych pytań, na które PPGscope odpowiada w czasie rzeczywistym

Docelowa architektura systemu została podporządkowana siedmiu pytaniom zarządczym i redakcyjnym:

1. **Struktura tematyczna (18 dziedzin v2.0):** O czym dokładnie piszemy w całej sieci, w danym województwie i w konkretnym tytule? Jaka część naszych sił idzie na sprawy samorządowe i polityczne, jaka na gospodarkę, infrastrukturę i zdrowie, a jaka na kronikę policyjną, wypadki drogowe czy lekką rozrywkę?
2. **Prawdziwa lokalność (`L / CL / C`):** Ile w naszych mediach regionalnych jest autentycznej pracy u podstaw w terenie (`L` – artykuły czysto lokalne), ile twórczego rozwinięcia tematów ogólnopolskich o kontekst własnego województwa i powiatu (`CL`), a ile surowych przedruków centralnych bez żadnego związku z regionem (`C`)?
3. **Żywotność i unikalność sieci 546 serwisów:** Które portale są żywymi redakcjami z własnymi dziennikarzami i oryginalnymi tekstami, które utrzymują ruch głównie dzięki przedrukom z centralnego hubu, a które stały się „serwisami zombie" zasilanymi wyłącznie przez automat serwerowy (`cron`) co piętnaście minut albo wręcz zostały wygaszone?
4. **Równowaga polityczna, pluralizm i funkcja kontrolna mediów:** Jak wygląda ekspozycja poszczególnych sił politycznych (zarówno obozu rządzącego i samorządowego, jak i opozycji) w poszczególnych dziennikach? Czy zachowujemy bezstronność, sprawozdawczy umiar i dziennikarską rzetelność, unikając zarówno niekrytycznego promowania rządzących, jak i jednostronnych kampanii negatywnych?
5. **Polityka wydawnicza strony głównej i praca na nagłówkach:** Co redakcje wystawiają na „jedynkę" (główny slot otwierający portal) w porównaniu z tym, co masowo wpada do kanału RSS? Jak często i z jakim skutkiem wydawcy zmieniają tytuły po publikacji oraz jak oznaczają treści zamknięte za paywallem *Strefa Plus* i artykuły sponsorowane?
6. **Ekonomia treści (po połączeniu danych zewnętrznych z wewnętrznymi):** Które z 18 dziedzin, jaki poziom lokalności i jacy autorzy generują najdłuższy czas aktywnego czytania (`engaged time`), najlepszy ruch z wyszukiwarki Google i Google Discover oraz najwyższą sprzedaż subskrypcji *Strefa Plus*?
7. **Pozycja rynkowa i szybkość reakcji (po połączeniu z monitoringiem zewnętrznym):** Czy w razie ważnego wydarzenia w regionie to nasz dziennik podaje informację jako pierwszy i jest cytowany przez media ogólnopolskie, czy też mamy w danym powiecie „lukę tematyczną", którą wykorzystuje lokalna konkurencja?

## 1.3. Architektura trzech pętli czasowych (Gorąca, Ciepła, Chłodna)

Monitorowanie 546 serwisów na żywo wymaga mądrego rozłożenia obciążenia. Gdyby system próbował co sekundę przeliczać testy statystyczne na dziesiątkach milionów artykułów z całego roku, byłby powolny i kosztowny. Dlatego PPGscope dzieli przetwarzanie na trzy współpracujące ze sobą pętle:

```
+-------------------------------------------------------------------------------------------------+
|                        PULPIT WYDAWCY I ZARZĄDU PPGSCOPE (https://ppgscope.pl)                  |
+-------------------------------------------------------------------------------------------------+
          ^                                         ^                                     ^
          | Aktualizacja co 15-60 sek.              | Aktualizacja co 3-15 min            | Aktualizacja co 1-24 godz.
          | (WebSocket / Server-Sent Events)        | (Strumień agregatów OLAP)           | (Przeliczenia hurtowni)
+---------+-----------------------+       +---------+-------------------------+   +-------+-----------------------+
| 1. PĘTLA GORĄCA (HOT LOOP)      |       | 2. PĘTLA CIEPŁA (WARM LOOP)       |   | 3. PĘTLA CHŁODNA (COLD LOOP)  |
+---------------------------------+       +-----------------------------------+   +-------------------------------+
| - Webhooki z CMS w chwili       |       | - Pobranie kanałów RSS i map      |   | - Pełna atrybucja konwersji   |
|   publikacji lub zmiany tytułu  |       |   sitemap-news.xml z 546 domen    |   |   subskrypcji Strefa Plus     |
| - Radar Jedynek: zrzut DOM      |       | - Ekstrakcja treści HTML/JSON-LD  |   | - Zewnętrzny raport cytowań   |
|   czołówek 20 dzienników + i.pl |       | - Sygnatura MinHash i wykrycie    |   |   z IMM / Press-Service       |
| - Liczniki aktywnych czytelników|       |   klonów sieciowych w 546 mediach |   | - Dobowy audyt żywotności     |
|   na żywo (Chartbeat / GA4 RT)  |       | - Klasyfikacja AI do 18 dziedzin  |   |   wszystkich 380 powiatów     |
| - Natychmiastowe alerty awarii  |       |   oraz lokalności L / CL / C      |   | - Testy statystyczne Z oraz   |
|   technicznych i przestojów     |       | - Rozpoznanie polityków, instytucji|   |   korekta Benjaminiego-       |
|   publikacyjnych                |       |   TERYT i ocena wydźwięku         |   |   Hochberga (FDR) dla trendów |
+---------------------------------+       +-----------------------------------+   +-------------------------------+
```

* **Pętla gorąca (15–60 sekund):** daje dyżurnym wydawcom i redaktorom naczelnym obraz tego, co dzieje się *w tej chwili*. Pokazuje aktualny układ jedynek, tempo napływu nowych publikacji, liczbę osób czytających poszczególne artykuły na żywo oraz natychmiastowe ostrzeżenia o przestojach lub awariach.
* **Pętla ciepła (3–15 minut):** odpowiada za głębokie zrozumienie każdego nowego tekstu. Zanim minie kwadrans od publikacji artykułu na dowolnym z 546 portali, system ma już wyliczoną jego sygnaturę antyplagiatową MinHash, przypisaną dziedzinę spośród 18 kategorii, określony stopień lokalności (`L / CL / C`), wyodrębnione instytucje powiatowe i polityków oraz zaktualizowane kostki analityczne dla porównywarki `Medium A vs Medium B`.
* **Pętla chłodna (1–24 godziny):** łączy dane redakcyjne z pełnymi rozliczeniami finansowymi i rynkowymi – konwersjami i utrzymaniem subskrybentów *Strefy Plus*, przychodami reklamowymi z Google Ad Managera, danymi z Google Search Console oraz zewnętrznymi raportami cytowalności z Instytutu Monitorowania Mediów.

---

# Rozdział 2. Inwentarz ekosystemu 546 mediów wydawnictwa, topologia sieci i mapowanie powiatowe TERYT we wszystkich 16 województwach

## 2.1. Czterowarstwowa struktura portfela wydawniczego

Kluczowym założeniem architektonicznym PPGscope jest świadomość, że 546 serwisów grupy tworzy hierarchiczną sieć o zróżnicowanych zadaniach. System przechowuje pełny katalog wszystkich 546 domen i dzieli je na cztery warstwy operacyjne:

1. **Warstwa I: Dzienniki regionalne (20 tytułów flagowych):**
   Trzon dziennikarski i subskrypcyjny grupy. Są to historyczne, silne marki prasowe przypisane do poszczególnych województw (w niektórych województwach, takich jak kujawsko-pomorskie czy podlaskie, funkcjonuje więcej niż jeden dziennik, a *Echo Dnia* czy *Gazeta Pomorska* obsługują rozległe podregiony). Od tych 20 tytułów oczekuje się najwyższego udziału oryginalnych materiałów autorskich (`named`), wysokiego wskaźnika lokalności (`L` + `CL`), aktywnego rozliczania władz regionalnych oraz budowania bazy abonentów *Strefy Plus*.
2. **Warstwa II: Sieć miejska i powiatowa *NaszeMiasto* (509 serwisów lokalnych):**
   Największa w Polsce sieć portali hiperlokalnych, w której niemal każdy powiat i każde większe miasto posiada własną subdomenę (np. `krakow.naszemiasto.pl`, `bochnia.naszemiasto.pl`, `sopot.naszemiasto.pl`, `puck.naszemiasto.pl`, `choszczno.naszemiasto.pl`). Z punktu widzenia zarządzania wydawnictwem jest to warstwa najtrudniejsza do upilnowania ręcznie. Bez narzędzia takiego jak PPGscope nie sposób codziennie sprawdzać, w których z 509 miast faktycznie powstają lokalne wiadomości, a które subdomeny są jedynie pasywnymi odbiornikami masowo kopiowanych tekstów centralnych.
3. **Warstwa III: Portale tematyczne i horyzontalne (15 serwisów specjalistycznych):**
   Serwisy skupione wokół konkretnej dziedziny życia lub gospodarki: *Strefa Biznesu* (`strefabiznesu.pl`), *Strefa Agro* (`strefaagro.pl`), *Strefa Obrony* (`strefaobrony.pl`), *Strefa Edukacji* (`strefaedukacji.pl`), portale sportowe *Gol24* (`gol24.pl`) i *Sportowy24* (`sportowy24.pl`), motoryzacyjne *Motofakty* (`motofakty.pl`), kulinarne *Gotujmy.pl*, poradnikowo-kobiece *Strona Kobiet* (`stronakobiet.pl`), telewizyjny *Telemagazyn* (`telemagazyn.pl`) czy nieruchomościowy *Regiodom*. W ich przypadku system bada zgodność publikacji z deklarowaną specjalizacją oraz to, czy czerpią one unikalny materiał z terenu (np. raporty o cenach skupu na rynkach lokalnych w *Strefie Agro*), czy ograniczają się do komunikatów ogólnokrajowych.
4. **Warstwa IV: Portale ogólnokrajowe i domeny archiwalne (2 tytuły centralne):**
   Horyzontalny portal ogólnopolski *i.pl* (`i.pl`) oraz wygaszona/przekierowana domena *Polska Times* (`polskatimes.pl`), dla której system monitoruje status techniczny HTTP (`410 Gone` / przekierowania `301`) i ewentualny ruch szczątkowy.

---

## 2.2. Rozkład terytorialny w 16 województwach i przypisanie dzienników macierzystych

Poniższa tabela przedstawia mapowanie 16 województw w systemie PPGscope wraz z dziennikami regionalnymi pełniącymi rolę redakcji wiodących (hubów wojewódzkich) oraz strukturą podległych im serwisów powiatowych *NaszeMiasto*:

| Kod TERYT | Województwo | Dzienniki regionalne (Huby wiodące) | Liczba serwisów lokalnych (w regionie) | Kluczowe ośrodki miejskie i powiatowe objęte monitoringiem TERYT |
| :--- | :--- | :--- | :--- | :--- |
| **02** | **Dolnośląskie** | *Gazeta Wrocławska* (`gazetawroclawska.pl`) | 36 | Wrocław, Wałbrzych, Legnica, Jelenia Góra, Lubin, Głogów, Świdnica, Bolesławiec, Oleśnica, Kłodzko |
| **04** | **Kujawsko-Pomorskie** | *Gazeta Pomorska* (`pomorska.pl`), *Express Bydgoski* (`expressbydgoski.pl`), *Nowości Dziennik Toruński* (`nowosci.com.pl`) | 29 | Bydgoszcz, Toruń, Włocławek, Grudziądz, Inowrocław, Brodnica, Świecie, Chełmno, Nakło, Tuchola |
| **06** | **Lubelskie** | *Kurier Lubelski* (`kurierlubelski.pl`) | 26 | Lublin, Zamość, Chełm, Biała Podlaska, Puławy, Świdnik, Kraśnik, Łuków, Biłgoraj, Lubartów |
| **08** | **Lubuskie** | *Gazeta Lubuska* (`gazetalubuska.pl`) | 18 | Zielona Góra, Gorzów Wielkopolski, Nowa Sól, Żary, Żagań, Świebodzin, Międzyrzecz, Słubice |
| **10** | **Łódzkie** | *Dziennik Łódzki* (`dzienniklodzki.pl`), *Express Ilustrowany* (`expressilustrowany.pl`) | 34 | Łódź, Piotrków Trybunalski, Pabianice, Tomaszów Mazowiecki, Bełchatów, Zgierz, Skierniewice, Sieradz, Kutno |
| **12** | **Małopolskie** | *Gazeta Krakowska* (`gazetakrakowska.pl`) | 32 | Kraków, Tarnów, Nowy Sącz, Oświęcim, Chrzanów, Olkusz, Nowy Targ, Bochnia, Gorlice, Zakopane, Wieliczka |
| **14** | **Mazowieckie** | *Polska Metropolia Warszawska* / oddział mazowiecki *NaszeMiasto* + *Echo Dnia* (subregion radomski) | 52 | Warszawa, Radom, Płock, Siedlce, Ostrołęka, Pruszków, Legionowo, Piaseczno, Ciechanów, Mińsk Mazowiecki |
| **16** | **Opolskie** | *Nowa Trybuna Opolska* (`nto.pl`) | 14 | Opole, Kędzierzyn-Koźle, Nysa, Brzeg, Kluczbork, Prudnik, Strzelce Opolskie, Namysłów |
| **18** | **Podkarpackie** | *Nowiny / Nowiny24* (`nowiny24.pl`) | 27 | Rzeszów, Przemyśl, Stalowa Wola, Mielec, Tarnobrzeg, Krosno, Dębica, Jarosław, Sanok, Jasło |
| **20** | **Podlaskie** | *Kurier Poranny* (`poranny.pl`), *Gazeta Współczesna* (`wspolczesna.pl`) | 19 | Białystok, Suwałki, Łomża, Augustów, Bielsk Podlaski, Zambrów, Grajewo, Hajnówka, Sokółka |
| **22** | **Pomorskie** | *Dziennik Bałtycki* (`dziennikbaltycki.pl`), *Głos Pomorza* (`gp24.pl`) | 28 | Gdańsk, Gdynia, Sopot, Słupsk, Tczew, Starogard Gdański, Wejherowo, Rumia, Chojnice, Malbork, Puck, Kwidzyn |
| **24** | **Śląskie** | *Dziennik Zachodni* (`dziennikzachodni.pl`) | 58 | Katowice, Częstochowa, Sosnowiec, Gliwice, Zabrze, Bielsko-Biała, Bytom, Rybnik, Tychy, Dąbrowa Górnicza, Chorzów |
| **26** | **Świętokrzyskie** | *Echo Dnia* (`echodnia.eu`) | 17 | Kielce, Ostrowiec Świętokrzyski, Starachowice, Skarżysko-Kamienna, Sandomierz, Końskie, Busko-Zdrój, Jędrzejów |
| **28** | **Warmińsko-Mazurskie** | Oddział olsztyński / elbląski *NaszeMiasto* (+ zasięg *Gazety Współczesnej* i *Dziennika Bałtyckiego*) | 24 | Olsztyn, Elbląg, Ełk, Iława, Ostróda, Giżycko, Kętrzyn, Szczytno, Bartoszyce, Mrągowo |
| **30** | **Wielkopolskie** | *Głos Wielkopolski* (`gloswielkopolski.pl`) | 44 | Poznań, Kalisz, Konin, Piła, Ostrów Wielkopolski, Gniezno, Leszno, Września, Swarzędz, Śrem, Krotoszyn |
| **32** | **Zachodniopomorskie** | *Głos Szczeciński* (`gs24.pl`), *Głos Koszaliński* (`gk24.pl`) | 26 | Szczecin, Koszalin, Stargard, Kołobrzeg, Świnoujście, Szczecinek, Police, Wałcz, Białogard, Choszczno |

---

## 2.3. Słownik instytucji powiatowych TERYT i detekcja zakorzenienia w terenie

Aby ocenić, czy tekst oznaczony jako lokalny jest rzeczywiście osadzony w realiach powiatu, czy zawiera jedynie powierzchowną wzmiankę geograficzną, PPGscope wykorzystuje moduł **Rozpoznawania Instytucji Lokalnych (`LocalInstitutionExtractor`)**.

W każdym tekście system automatycznie wyszukuje i zlicza odwołania do ośmiu klas podmiotów terenowych:
1. **Organy wykonawcze i uchwałodawcze samorządu:** Urząd Miasta, Urząd Gminy, Starostwo Powiatowe, Urząd Marszałkowski, Rada Miasta, Rada Gminy, Rada Powiatu, Sejmik Województwa, konkretne nazwiska prezydentów miast, burmistrzów, wójtów i starostów.
2. **Służby mundurowe i ratunkowe na szczeblu powiatowym:** Komenda Powiatowa / Miejska Policji (KPP/KMP), Komenda Powiatowa / Miejska Państwowej Straży Pożarnej (KP PSP / KM PSP), jednostki Ochotniczej Straży Pożarnej (OSP z nazwą miejscowości), Straż Miejska / Gminna.
3. **Ochrona zdrowia i opieka społeczna w powiecie:** Szpital Powiatowy / Wojewódzki / Specjalistyczny, Stacja Pogotowia Ratunkowego, Powiatowa Stacja Sanitarno-Epidemiologiczna (Sanepid), Miejski / Gminny Ośrodek Pomocy Społecznej (MOPS/GOPS), Powiatowe Centrum Pomocy Rodzinie (PCPR).
4. **Wymiar sprawiedliwości i administracja skarbowa/pracy:** Sąd Rejonowy, Sąd Okręgowy, Prokuratura Rejonowa / Okręgowa, Powiatowy Urząd Pracy (PUP), Urząd Skarbowy, Inspektorat Nadzoru Budowlanego (PINB).
5. **Zarządcy dróg i komunikacji lokalnej:** Zarząd Dróg Powiatowych (ZDP), Zarząd Dróg Miejskich / Wojewódzkich (ZDM/ZDW), lokalni przewoźnicy komunikacji miejskiej i regionalnej (MPK, ZTM, MZK, PKS, Koleje Małopolskie / Śląskie / Wielkopolskie / Dolnośląskie).
6. **Placówki oświatowe i uczelnie:** konkretne szkoły podstawowe, licea, technika, kuratoria oświaty, uniwersytety i politechniki w regionie.
7. **Instytucje kultury i parafie:** domy kultury (MDK/GOK), biblioteki publiczne, muzea regionalne, teatry, parafie rzymskokatolickie i innych wyznań.
8. **Lokalne kluby sportowe i organizacje społeczne:** kluby od Ekstraklasy po klasy okręgowe i A-klasę, koła gospodyń wiejskich, lokalne stowarzyszenia i fundacje.

Jeżeli artykuł opublikowany na portalu powiatowym wymienia konkretną instytucję z tego powiatu i zawiera wypowiedź jej przedstawiciela, otrzymuje najwyższą wagę autentyczności lokalnej.

---

# Rozdział 3. Architektura pozyskiwania danych zewnętrznych (Warstwa bezpłatna OSINT: kanały RSS/Atom, Sitemapy Google News, Sonda DOM stron głównych i rejestry publiczne)

## 3.1. Zasada nieinwazyjności i niezależności audytowej

Pierwsza warstwa PPGscope została zaprojektowana tak, aby działać w 100% w oparciu o dane publicznie wystawiane przez serwery wydawnictwa oraz otwarte źródła internetowe. Takie podejście ma trzy fundamentalne zalety:

1. **Zero obciążenia dla wewnętrznych baz danych CMS i brak czekania na wdrożenia IT:** system może rozpocząć pracę i dostarczać zarządowi pełny obraz 546 portali natychmiast, bez konieczności pisania wtyczek do wewnętrznego silnika wydawniczego.
2. **Badanie tego, co naprawdę widzi czytelnik i Google:** analiza zewnętrzna wyłapuje błędy szablonów, niedziałające przekierowania, artykuły widoczne na stronie, ale pominięte w mapach witryn, a także rzeczywiste oznaczenia paywalla *Strefa Plus* i materiałów komercyjnych w kodzie HTML.
3. **Możliwość identycznego badania konkurencji:** ponieważ kolektory zewnętrzne nie wymagają haseł do cudzego CMS, dokładnie tym samym silnikiem można w czasie rzeczywistym mierzyć strukturę 18 dziedzin, szybkość publikacji i ekspozycję na stronach głównych dowolnego konkurencyjnego portalu w Polsce.

## 3.2. Szczegółowa procedura pracy czterech kolektorów zewnętrznych

### 3.2.1. Kolektor RSS i Atom (`ppgscope/sitemaps_and_rss.py`)
* Odpytuje listę kanałów głównych i działowych wszystkich 546 domen w cyklu 3–5 minutowym.
* Wykorzystuje asynchroniczną pulę połączeń HTTP/2 z pamięcią podręczną nagłówków `ETag` oraz `Last-Modified`.
* Z każdego wpisu `<item>` wyodrębnia: tytuł pierwotny, link, identyfikator `<guid>`, datę publikacji `<pubDate>` (konwertowaną ze strefy RFC-2822 do standardu ISO-8601 w strefie `Europe/Warsaw`), skrócony opis (lead) oraz kategorię RSS.

### 3.2.2. Kolektor Map Witryn Google News (`sitemap-news.xml`)
* W portalach Polska Press mapy Google News są najpewniejszym źródłem kompletnego spisu publikacji z ostatnich 48 godzin, ponieważ obejmują również te sekcje, które nie posiadają własnego kanału RSS.
* Parser XML obsługuje przestrzenie nazw `http://www.sitemaps.org/schemas/sitemap/0.9` oraz `http://www.google.com/schemas/sitemap-news/0.9`.
* Odczytuje znaczniki `<news:publication_date>`, `<news:title>`, `<news:keywords>` oraz `<lastmod>`, co pozwala natychmiast zauważyć, że starszy artykuł został zmodyfikowany przez redakcję.

### 3.2.3. Sonda DOM Stron Głównych – „Radar Jedynek" (`HomepageRadar` w `ppgscope/intelligence.py`)
* Co 5 minut pobiera stronę główną badanych portali i analizuje drzewo DOM.
* Wyodrębnia listę linków artykułowych wraz z ich położeniem wizualnym:
  * **Slot 1 (Jedynka / Hero):** główny materiał otwierający portal (największy nagłówek i zdjęcie na szczycie strony).
  * **Sloty 2–5 (Czołówka Above the Fold):** główne materiały towarzyszące na górze ekranu.
  * **Sloty 6–25 (Strefa środkowa i boksy tematyczne):** układ sekcji regionalnych, sportowych, biznesowych i boksów *Strefa Plus*.
* Porównując układ strony głównej z pełnym strumieniem wszystkich publikacji z RSS/Sitemap, system wylicza **Wskaźnik Luki Agendy (`Agenda Gap Score`)**:

$$AgendaGap = 0.5 * SUMA( | Udzial_Jedynka(d) - Udzial_RSS(d) | ) dla d = 1..18$$

Jeżeli np. w strumieniu RSS 35% wszystkich wrzucanych tekstów stanowią automatyczne komunikaty pogodowe i poradniki konsumenckie, ale na stronie głównej w czołówce Top 5 wydawca umieszcza w 80% artykuły o polityce samorządowej, inwestycjach i wypadkach drogowych, `Agenda Gap Score` pokazuje dokładnie, jak bardzo ręczna selekcja redaktora wydania różni się od masowej produkcji portalu.

### 3.2.4. Sonda Żywotności i Śledzenie Mutacji 48h (`ArticleVersionTracker`)
* Każdy artykuł, który trafił do czołówki portalu, jest ponownie odpytywany w odstępach: **15 minut, 1 godzina, 3 godziny, 6 godzin, 12 godzin, 24 godziny i 48 godzin** od pierwszej publikacji.
* System porównuje aktualny tytuł (`title_current`), lead, długość tekstu oraz status flagi `isAccessibleForFree` z wartościami początkowymi zapisanymi w chwili premiery artykułu.
* Dzięki temu PPGscope wykrywa i loguje trzy zjawiska redakcyjne niewidoczne w zwykłych statystykach:
  1. **Mutacje nagłówków (Headline A/B & Clickbait Escalation):** np. zmiana spokojnego tytułu informacyjnego *„Rada Miasta Krakowa dyskutuje o strefie czystego transportu"* po dwóch godzinach na ostrzejszy wariant pod Google Discover: *„Tymi autami już nie wjedziesz do miasta! Kierowcy są wściekli [NOWE ZASADY]"*.
  2. **Wtórne zamykanie artykułów za paywallem (*Delayed Paywall Locking*):** sytuacja, w której artykuł przez pierwszą godzinę jest darmowy, aby zebrać udostępnienia w mediach społecznościowych i indeksację w Google, a po przekroczeniu progu popularności zostaje zamknięty za bramką *Strefa Plus*.
  3. **Rozwijanie relacji na żywo (Live Developing Stories):** dopisywanie kolejnych akapitów i aktualizacja godzinowa w tekstach o wypadkach, pożarach czy obradach.

## 3.3. Poszanowanie standardu `robots.txt` i higiena ruchu sieciowego (`ppgscope/robots.py`)

Wszystkie kolektory zewnętrzne PPGscope działają z zachowaniem najwyższych standardów inżynierii sieciowej:
* Przed odpytaniem domeny moduł `RobotsChecker` pobiera i buforuje plik `robots.txt`, sprawdzając uprawnienia dostępu do ścieżek.
* Zapytania są rozłożone w czasie (Token Bucket Rate Limiter z limitem maksymalnie 1 zapytania na sekundę na pojedynczą domenę i obsługą nagłówka `Retry-After`), dzięki czemu praca systemu jest całkowicie niezauważalna dla infrastruktury serwerowej wydawnictwa.

---

# Rozdział 4. Architektura źródeł wewnętrznych i płatnych (CMS, GA4/BigQuery, Chartbeat/Marfeel, Paywall Strefa Plus, AdServer GAM, IMM/Press-Service, GSC/SEO) oraz procedura deterministycznej fuzji danych

## 4.1. Dlaczego zestawienie danych zewnętrznych z wewnętrznymi zmienia zasady gry

Dane zewnętrzne (OSINT) dają nam pełną wiedzę o **podaży redakcyjnej**: wiemy dokładnie, co opublikowano na 546 portalach, w jakiej dziedzinie, z jakim stopniem lokalności, czy był to unikalny tekst, czy klon, jaki miał wydźwięk polityczny i jak długo wisiał na jedynce.

Z kolei dane wewnętrzne wydawnictwa oraz płatne systemy rynkowe dają nam pełną wiedzę o **popycie czytelniczym, ekonomii i wpływie rynkowym**: wiemy, ile kosztowało przygotowanie tekstu (czas pracy w CMS), ilu ludzi go przeczytało, jak długo go czytali, skąd przyszli, ile kupili subskrypcji *Strefa Plus*, ile zarobiły reklamy oraz ile innych mediów w Polsce zacytowało ten materiał.

Dopiero **połączenie (fuzja) obu tych zbiorów na poziomie pojedynczego artykułu i pojedynczego portalu** pozwala zarządzać wydawnictwem w oparciu o pełny rachunek przyczyn i skutków.

---

## 4.2. Specyfikacja techniczna 6 konektorów wewnętrznych i płatnych

W architekturze PPGscope (zainicjowanej w `ppgscope/connectors.py`) każdy zewnętrzny lub wewnętrzny system danych jest podłączany przez ustandaryzowany interfejs konektora:

```
+---------------------------------------------------------------------------------------------------+
|                         ARCHITEKTURA KONEKTORÓW WEWNĘTRZNYCH I PŁATNYCH                           |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [1. Wewnętrzny CMS]          [2. Chartbeat / Marfeel / GA4]       [3. System Strefa Plus]        |
|  - Webhooki publikacji        - Aktywni czytelnicy co 30 sek.      - Wyświetlenia paywalla        |
|  - ID autora i redakcji       - Czas aktywnego czytania (s)        - Konwersje bezpośrednie       |
|  - Czas edycji szkicu         - Źródła: Discover/Search/Social     - Utrzymanie abonentów         |
|           |                                  |                                   |                |
|           +----------------------------------+-----------------------------------+                |
|                                              |                                                    |
|                                              v                                                    |
|                     +-------------------------------------------------+                           |
|                     |   SILNIK FUZJI REKORDÓW (ArticleEntityResolver) |                           |
|                     |   Klucz łączący: (domain + native_article_id)   |                           |
|                     +-------------------------------------------------+                           |
|                                              ^                                                    |
|           +----------------------------------+-----------------------------------+                |
|           |                                  |                                   |                |
|  [4. Google Ad Manager]       [5. IMM / Press-Service / PAP]       [6. Google Search Console]     |
|  - Przychód reklamowy PLN     - Cytowania w TV, radiu i sieci      - Frazy kluczowe i pozycje     |
|  - Efektywny RPM artykułu     - Czas publikacji u konkurencji      - Wyświetlenia i CTR Discover  |
|  - Blokady Brand Safety       - Ekwiwalent reklamowy AVE           - Kanibalizacja między domenami|
+---------------------------------------------------------------------------------------------------+
```

### Konektor 1: Wewnętrzny system CMS wydawnictwa (`InternalCMSConnector`)
* **Protokół:** zdarzenia Webhook HTTP POST wysyłane z CMS przy akcjach `article.published`, `article.updated`, `article.deleted`, `homepage.layout_published` oraz codzienna synchronizacja słownika autorów i działów.
* **Pola przekazywane do PPGscope:**
  * `cms_article_id` – unikalny identyfikator w bazie produkcyjnej,
  * `parent_cms_article_id` – identyfikator artykułu pierwotnego, jeśli tekst powstał przez funkcję „Kopiuj na inne serwisy" w CMS,
  * `internal_author_id`, `internal_author_name`, `editorial_desk_id` – prawdziwy autor i dział macierzysty (np. Dział Samorządowy Kraków vs Centralny Hub Warszawa), nawet gdy publiczny podpis pod tekstem brzmi „Redakcja",
  * `draft_created_at`, `first_published_at`, `active_editing_minutes` – ile minut faktycznej pracy dziennikarza i redaktora pochłonął artykuł,
  * `commercial_order_id` – powiązanie z zamówieniem z działu reklamy dla tekstów sponsorowanych i patronackich.

### Konektor 2: Telemetria czytelnictwa czasu rzeczywistego (`RealtimeTrafficConnector` – Chartbeat / Marfeel / Parse.ly + GA4 BigQuery)
* **Protokół:** odpytywanie REST API czasu rzeczywistego co 30 sekund dla aktualnie czytanych artykułów oraz ciągły odczyt z tabeli `events_intraday_*` w Google BigQuery (eksport strumieniowy GA4).
* **Pola przekazywane do PPGscope:**
  * `concurrent_readers` – liczba osób czytających artykuł w tej sekundzie,
  * `engaged_time_avg_sec` oraz `total_engaged_minutes` – rzeczywisty czas skupienia uwagi czytelnika na tekście,
  * `scroll_depth_median_pct` oraz `read_completion_rate_pct` – jaki odsetek czytelników doczytał artykuł do końca,
  * `traffic_breakdown` – dokładny podział wejść na: `google_discover`, `google_search`, `internal_homepage` (wejścia z jedynki portalu), `internal_recirculation` (wejścia z boksów „Czytaj także"), `social_facebook`, `social_x`, `direct`, `newsletter_push`,
  * `homepage_slot_ctr` – współczynnik klikalności konkretnego boksu na stronie głównej w ostatnich 15 minutach.

### Konektor 3: Silnik subskrypcji i Paywalla (`PaywallSubscriptionConnector` – *Strefa Plus*)
* **Protokół:** strumień zdarzeń z systemu bramki płatniczej (np. Piano / własny moduł subskrypcyjny PPG).
* **Pola przekazywane do PPGscope:**
  * `paywall_gate_views` – ile razy niezalogowany czytelnik zatrzymał się na ścianie *Strefy Plus* w tym artykule,
  * `paywall_offer_clicks` – ile osób kliknęło przycisk „Wykup dostęp",
  * `subscriptions_sold_last_touch` – ile nowych abonamentów zostało opłaconych bezpośrednio z tego artykułu,
  * `subscriptions_sold_assisted` – w ilu ścieżkach zakupowych ten artykuł wystąpił w ciągu 7 dni poprzedzających zakup,
  * `subscriber_reads_count` – ilu już płacących abonentów *Strefy Plus* przeczytało ten tekst (kluczowy miernik utrzymania subskrybentów przed rezygnacją z abonamentu).

### Konektor 4: System reklamowy i przychodowy (`AdRevenueConnector` – Google Ad Manager + zlecenia bezpośrednie)
* **Protokół:** automatyczne raporty API Google Ad Manager (GAM) łączone po kluczu `custom_targeting.article_id` lub ścieżce URL.
* **Pola przekazywane do PPGscope:**
  * `ad_impressions`, `viewable_impressions_pct` (widoczność reklam według standardu IAB),
  * `programmatic_revenue_pln`, `direct_campaign_revenue_pln`, `sponsored_fee_pln`,
  * `effective_article_rpm_pln` – łączny przychód na 1000 odsłon danego artykułu,
  * `brand_safety_blocked_flag` – informacja, czy reklamy na tym artykule zostały zablokowane przez filtry słów kluczowych reklamodawców.

### Konektor 5: Zewnętrzny monitoring mediów, cytowalności i agencji (`ExternalMarketConnector` – IMM / Press-Service / Brand24 / PAP)
* **Protokół:** API REST odbierające wykryte wzmianki o naszych markach oraz strumień depesz PAP i RSS konkurencyjnych portali regionalnych.
* **Pola przekazywane do PPGscope:**
  * `external_citations_list` – lista mediów zewnętrznych (telewizje, stacje radiowe, portale ogólnopolskie i lokalne), które powołały się na dany artykuł, wraz z godziną cytowania i wyceną ekwiwalentu reklamowego (`AVE`),
  * `pap_wire_source_id` oraz `pap_published_at` – powiązanie z oryginalną depeszą Polskiej Agencji Prasowej, pozwalające co do minuty zmierzyć czas reakcji redakcji na depeszę i stopień jej wzbogacenia o wątki lokalne (`C` -> `CL`),
  * `competitor_cluster_matches` – powiązanie z artykułami konkurencji na ten sam temat w danym województwie (kto opublikował temat jako pierwszy i o ile minut wyprzedził rywali).

### Konektor 6: Widoczność w wyszukiwarce i Google Discover (`SearchConsoleConnector` – GSC API + Senuto / Ahrefs)
* **Protokół:** oficjalne API Google Search Console (`searchanalytics.query` z podziałem na `type='web'`, `type='news'` oraz `type='discover'`).
* **Pola przekazywane do PPGscope:**
  * `gsc_search_impressions`, `gsc_search_clicks`, `gsc_avg_position`, `top_search_queries`,
  * `gsc_discover_impressions`, `gsc_discover_clicks`, `gsc_discover_ctr`,
  * `cannibalization_group_domains` – lista innych domen PPG, które w tym samym dniu wyświetlają się w Google na to samo zapytanie i odbierają sobie nawzajem kliknięcia.

---

# Rozdział 5. Dwadzieścia widoków i macierzy decyzyjnych powstających ze zderzenia danych wewnętrznych z zewnętrznymi

Kiedy na jednym ekranie połączymy zewnętrzny audyt treści (18 dziedzin, lokalność `L / CL / C`, unikalność MinHash, pozycję na jedynce, wydźwięk polityczny) z wewnętrzną telemetrią (czas czytania, źródła ruchu, konwersje *Strefa Plus*, czas pracy w CMS) oraz danymi z rynku (cytowania IMM, ruch konkurencji), pulpit PPGscope otwiera przed wydawnictwem zupełnie nowy poziom wiedzy.

Poniżej opisano szczegółowo dwadzieścia widoków analitycznych i macierzy decyzyjnych docelowego systemu.

---

## 5.1. Zbiorcza tabela 20 macierzy fuzyjnych

| Nr | Nazwa macierzy na pulpicie | Warstwa zewnętrzna (OSINT / AI PPGscope) | Warstwa wewnętrzna i rynkowa (CMS / GA4 / Strefa Plus / IMM) | Konkretna decyzja wydawnicza lub biznesowa |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Macierz Podaży i Popytu w 18 Dziedzinach** | Udział artykułów w każdej z 18 dziedzin taksonomii v2.0 | Udział w odsłonach, aktywnym czasie czytania i sprzedanych subskrypcjach *Strefa Plus* | Przesunięcie sił redakcyjnych z tematów nadprodukowanych do dziedzin o wysokiej konwersji subskrypcyjnej. |
| **2** | **Rachunek Ekonomiczny Klonów vs Tekstów Unikalnych** | Sygnatura MinHash, liczba klonów w sieci 546 domen, stopień oryginalności | Czas pracy w CMS, ruch z Google Search/Discover, konwersje *Strefa Plus*, kanibalizacja SEO | Ograniczenie bezproduktywnego kopiowania tego samego tekstu na setki domen *NaszeMiasto*. |
| **3** | **Zwrot z Lokalności (`L` vs `CL` vs `C`)** | Klasyfikacja lokalności artykułu i gęstość instytucji powiatowych TERYT | Średni czas czytania, głębokość przewijania, współczynnik konwersji na *Strefę Plus*, retencja abonentów | Wyznaczenie dokładnego mnożnika sprzedaży subskrypcji dla treści czysto lokalnych (`L`) i zlokalizowanych (`CL`). |
| **4** | **Efektywność Slotów na „Jedynce" (Homepage Slot ROI)** | Pozycja na stronie głównej i czas przypięcia (z Radaru Jedynek co 5 min) | Rzeczywisty współczynnik klikalności (CTR) slotu i liczba czytelników wchodzących z jedynki | Natychmiastowa wymiana artykułu z czołówki, gdy jego CTR spada poniżej połowy normy dla danego slotu. |
| **5** | **Radar Luki Tematycznej w Powiecie i Regionie** | Wykryte wydarzenia w komunikatach służb, Google Trends i u konkurencji | Stan publikacji i szkiców w wewnętrznym CMS danego dziennika / serwisu *NaszeMiasto* | Ostrzeżenie w czasie rzeczywistym o ważnym wydarzeniu w regionie, którego jeszcze nie podjęła redakcja. |
| **6** | **Skuteczność Mutacji Nagłówków (Post-Publication A/B)** | Wykryte zmiany tytułu i leadu w ciągu 48h od publikacji | Krzywa wejść z Google Discover i CTR na stronie głównej przed i po zmianie tytułu | Ocena, które zmiany tytułów faktycznie podnoszą ruch i czas czytania, a które są pustym klikbajtem. |
| **7** | **Optymalizator Momentu Zamknięcia za Paywallem** | Wykrycie zamknięcia tekstu za paywallem (od razu vs po godzinach) | Moment szczytu ruchu, liczba odbić od bramki, liczba zakupionych subskrypcji | Automatyczna podpowiedź dla wydawcy, kiedy zamknąć popularny artykuł autorski za bramką *Strefa Plus*. |
| **8** | **Audyt Przynęt Google Discover (`Discover Bait` vs Retencja)** | Klasyfikator nagłówków klikbajtowych z celową luką informacyjną | Rzeczywiste wejścia z Google Discover (GSC / GA4), czas pobytu na stronie i powroty użytkowników | Eliminacja tanich przynęt, które psują zaufanie do marki dziennika i dają odskok poniżej 10 sekund. |
| **9** | **Mapa Białych Plam Powiatowych (TERYT Coverage)** | Liczba unikalnych tekstów lokalnych i cytowanych instytucji w każdym z 380 powiatów | Ruch organiczny z danego powiatu, potencjał demograficzny i przychodowy z reklam lokalnych | Wskazanie powiatów o dużym potencjale czytelniczym, w których brakuje oryginalnych materiałów lokalnych. |
| **10** | **Bilans Cytowalności: Źródło Pierwotne vs Naśladowca** | Czas publikacji artykułu w PPG oraz wyodrębnione fakty i cytaty własne | Raporty cytowań z IMM / Press-Service oraz czas publikacji tego samego tematu u konkurencji | Pomiar prestiżu redakcji: ile razy w miesiącu dziennik regionalny PPG narzucił temat mediom ogólnopolskim. |
| **11** | **Profil Pracy i Wpływu Dziennikarza (Author Impact 360°)** | Liczba tekstów imiennych, udział lokalności `L`, liczba cytowanych źródeł i instytucji | Czas pracy w CMS, łączny czas czytania wygenerowany przez autora, sprzedane subskrypcje *Strefa Plus* | Uczciwa ocena pracy dziennikarzy oparta na jakości, lokalności i pozyskanych subskrybentach. |
| **12** | **Równowaga Polityczna vs Zaangażowanie Czytelników** | Pluralizm wewnątrztekstowy, rozkład ról politycznych i ton publikacji | Czas czytania, współczynnik odrzuceń, konwersje i rezygnacje z subskrypcji | Dowód, że czytelnicy szukają w prasie regionalnej rzetelnego rozliczania władz i tematów samorządowych. |
| **13** | **Kanibalizacja Wewnętrzna SEO w Sieci 546 Domen** | Klastry identycznych lub bliźniaczych artykułów wykryte przez MinHash | Dane z Google Search Console: która domena dostała wyświetlenia w Google, a które wypadły z indeksu | Wprowadzenie reguł `rel="canonical"` wskazujących na dziennik macierzysty i ochrona jego pozycji w Google. |
| **14** | **Monitoring Wykonania Kampanii Sponsorowanych** | Wykrycie artykułu komercyjnego, jego pozycji na stronie głównej i czasu ekspozycji | Liczba odsłon i czas czytania względem gwarantowanego w umowie progu (KPI klienta) | Sygnał dla wydawcy, że opłacony materiał sponsorowany wymaga dodatkowego podpięcia na stronie głównej. |
| **15** | **Detektor Anomalii Godzinowych i „Dziur Redakcyjnych"** | Rozkład minutowy publikacji (w tym wykrywanie zrzutów z automatu o `:00` i `:15`) | Krzywa aktywności czytelników na żywo w ciągu doby (kiedy czytelnicy wchodzą na portal) | Dopasowanie grafików dyżurów redakcyjnych do realnych godzin porannego i wieczornego szczytu czytelniczego. |
| **16** | **Analiza Żywotności Portfela Domen (Macierz 546 Serwisów)** | Indeks żywotności (0–100), odsetek unikalnych tekstów, stan techniczny HTTP | Koszt utrzymania domeny/redakcji vs generowany przychód reklamowy i subskrypcyjny | Decyzja zarządcza, które z 509 serwisów *NaszeMiasto* wzmocnić reporterem, a które połączyć w huby. |
| **17** | **Śledzenie Kaskady Depesz PAP (Od Depeszy do Kontekstu)** | Wykrycie tekstu opartego na depeszy PAP i ocena, czy dodano akapity lokalne (`C` -> `CL`) | Czas od depeszy PAP do publikacji w PPG oraz porównanie klikalności wersji surowej (`C`) z rozwiniętą (`CL`) | Wdrożenie standardu uzupełniania ważnych depesz krajowych o dane z własnego województwa w ciągu 30 minut. |
| **18** | **Radar Wrażliwości Reklamowej (Brand Safety Shield)** | Klasyfikacja do dziedziny `05 Przestępczość` lub `06 Wypadki` + analiza słownictwa nagłówka | Odsetek zablokowanych wyświetleń reklamowych (Keyword Blocking w Google Ad Managerze) | Korekta słownictwa w nagłówkach o kolizjach drogowych, aby nie tracić emisji reklamowych dużych marek. |
| **19** | **Zestawienie Porównawcze Dziennik vs Konkurent Miejski** | Pełny profil 18 dziedzin, szybkości publikacji i lokalności naszego dziennika vs konkurenta | Dane zasięgowe Mediapanel/Gemius oraz widoczność SEO (Senuto/Ahrefs) obu domen | Odpowiedź na pytanie, w których tematach miejskich lokalny rywal wyprzedza nasz dziennik i dlaczego. |
| **20** | **Symulator Decyzji Wydawniczych (Co-Jeśli / Forecasting)** | Historyczne rozkłady 18 dziedzin, lokalności i żywotności w 546 portalach | Model elastyczności przychodowej (wpływ struktury treści na *Strefę Plus* i ruch organiczny) | Prognoza wzrostu subskrypcji przy przesunięciu mocy redakcyjnej z prostych przedruków `C` na tematy `L` i `CL`. |

---

# Rozdział 6. Szczegółowy opis procedur klasyfikacji 18 dziedzin (Taksonomia v2.0), lokalności (L / CL / C), deduplikacji MinHash oraz audytu żywotności 546 portali

W tym rozdziale opisano techniczne i metodologiczne działanie głównych algorytmów przetwarzania tekstu w PPGscope.

---

## 6.1. Procedura klasyfikacji do 18 dziedzin tematycznych (Taksonomia v2.0)

### 6.1.1. Zasada rozłączności i reguły pierwszeństwa
W rzeczywistym świecie artykuły prasowe rzadko są jednowymiarowe. Tekst o tym, że *„Szpital powiatowy w Grudziądzu zamyka oddział z powodu długów, a prezydent miasta apeluje do NFZ i wojewody"* dotyka jednocześnie zdrowia (`08`), finansów samorządu (`01`/`02`) i spraw lokalnej społeczności (`17`). Gdyby klasyfikator działał na prostym zliczaniu słów, połowa podobnych tekstów wpadałaby do polityki, a połowa do zdrowia, niszcząc spójność statystyk.

Dlatego w PPGscope (`config/taxonomy_v2.yaml` oraz `ppgscope/classifier.py`) wprowadzono:
1. **Dziedzinę główną (`domain_primary` – obowiązkową dla każdego artykułu):** wyznaczaną według przedmiotu sprawy (czego bezpośrednio dotyczy wydarzenie lub problem), a nie według urzędu osoby komentującej. W powyższym przykładzie przedmiotem sprawy jest funkcjonowanie placówki medycznej i dostęp pacjentów do leczenia, więc dziedziną główną jest `08 Zdrowie i opieka medyczna`, natomiast `01 Władza i polityka` zostaje zapisana jako dziedzina poboczna (`domain_secondary`).
2. **Jawne reguły rozstrzygania kolizji (Tie-Breaking Rules):**
   * **Kolizja: Wypadek drogowy vs Infrastruktura (`06` vs `04`):** jeżeli artykuł opisuje zderzenie pojazdów, potrącenie, pijanego kierowcę lub zablokowanie autostrady w wyniku kraksy -> zawsze `06 Wypadki i bezpieczeństwo drogowe`. Jeżeli opisuje budowę obwodnicy, harmonogram remontu torowiska lub nowy rozkład jazdy MPK -> `04 Infrastruktura, komunikacja i mieszkalnictwo`.
   * **Kolizja: Pożar / Interwencja służb vs Wypadek drogowy (`05` vs `06`):** pożar budynku, interwencja policji kryminalnej, kradzież, oszustwo -> `05 Przestępczość i służby`. Kolizja na drodze z udziałem straży pożarnej zabezpieczającej miejsce zderzenia -> `06 Wypadki i bezpieczeństwo drogowe`.
   * **Kolizja: Emerytury / Świadczenia ZUS vs Gospodarka (`03` vs `02`):** waloryzacja emerytur, najwyższe i najniższe świadczenia z ZUS (nawet gdy w tytule pada nazwa regionu, np. *„Najwyższa emerytura na Śląsku"*), 800+, kredyty mieszkaniowe i WIBOR z punktu widzenia portfela domowego -> zawsze `03 Finanse osobiste i zabezpieczenie społeczne`. Wyniki finansowe fabryk, bezrobocie w regionie, inwestycje stref ekonomicznych -> `02 Gospodarka i rynek`.
   * **Kolizja: Decyzja ustawowa rządu o szkole/zdrowiu vs Edukacja/Zdrowie (`01` vs `09`/`08`):** jeżeli tekst traktuje o projekcie ustawy w Sejmie, sporze koalicji z opozycją wokół przepisów (np. ustawa ograniczająca media społecznościowe dla nieletnich) -> `01 Władza i polityka` jako główna, a `09 Edukacja i nauka` jako poboczna.

---

## 6.2. Procedura wyznaczania lokalności (`L / CL / C`)

Klasyfikator lokalności analizuje relację między **obszarem macierzystym portalu** (zdefiniowanym w katalogu `portals` poprzez województwo i powiat TERYT) a **geografią treści artykułu**:

```
                        +---------------------------------------+
                        |   ANALIZA GEOGRAFICZNA ARTYKUŁU       |
                        +---------------------------------------+
                                            |
              +-----------------------------+-----------------------------+
              |                                                           |
              v (Występują miejscowości, ulice,                           v (Brak encji z regionu portalu;
                 instytucje lub osoby z regionu portalu)                     wyłącznie Polska / Świat / inny region)
+---------------------------------------------------+       +-------------------------------------------+
| Czy rdzeń tematu jest ogólnopolski                |       | Kategoria: C (CENTRALNE)                  |
| (np. ustawa, ZUS, rząd, pogoda dla całego kraju,  |       | (Dodatkowo flaga other_region = true,     |
| sieć handlowa, ogólne przepisy)?                  |       | jeśli tekst dotyczy innego województwa    |
+---------------------------------------------------+       | niż województwo badanego portalu)         |
         |                                 |                +-------------------------------------------+
         | NIE (sprawa od początku         | TAK (temat ogólnopolski
         | do końca dzieje się lokalnie)   | z lokalnym akapitem / danymi)
         v                                 v
+--------------------------------+  +------------------------------------+
| Kategoria: L (CZYSTO LOKALNE)  |  | Kategoria: CL (CENTRALNE           |
| np. sesja rady miasta, lokalny |  | Z ROZWINIĘCIEM LOKALNYM)           |
| wypadek, inwestycja w powiecie |  | np. program rządowy + dane z gmin  |
+--------------------------------+  +------------------------------------+
```

Dodatkowo system posiada bardzo ważny bezpiecznik: **flagę obcego regionu (`other_region = true`)**. W sieci Polska Press często zdarza się, że ciekawy artykuł o wydarzeniu w Krakowie lub w Tatrach zostaje przedrukowany w *Dzienniku Bałtyckim* w Gdańsku. Dla *Gazety Krakowskiej* ten sam tekst ma lokalność **`L` (Lokalny)**, ale dla *Dziennika Bałtyckiego* w województwie pomorskim nie jest to wiadomość lokalna z Pomorza – dlatego w Gdańsku otrzymuje kategorię **`C` (z flagą `other_region = true`)**. Bez tego rozróżnienia przedruki między województwami sztucznie zawyżałyby wskaźnik lokalności.

Na tej podstawie pod głównym wykresem 18 dziedzin system zawsze wylicza dwa wskaźniki:

$$Udzial_tresci_lokalnej = (L + CL) / (L + CL + C) * 100%$$

$$Wskaznik_lokalizacji = CL / (C + CL) * 100%$$

---

## 6.3. Procedura wykrywania klonów i kaskad syndykacji (Shingling + MinHash LSH)

Aby w ułamku sekundy sprawdzić, czy nowy artykuł jest oryginalny, czy stanowi kopię tekstu opublikowanego już na innych portalach wydawnictwa, silnik `MinHashDeduplicator` (`ppgscope/dedup_minhash.py`) wykonuje następującą procedurę:

1. **Czyszczenie i tokenizacja:** z tekstu usuwane są stałe dopiski redakcyjne (np. *„Czytaj więcej w serwisie..."*, stopki prawne, podpisy agencji), a pozostała treść jest dzielona na nakładające się 5-gramy słowne.
2. **Obliczenie wektora MinHash (128 skrótów 32-bitowych):** dla każdego tekstu powstaje wektor 128 liczb. Rozmiar takiej sygnatury to zaledwie 512 bajtów na artykuł, co pozwala trzymać w szybkiej pamięci operacyjnej RAM sygnatury kilkuset tysięcy artykułów z całego miesiąca.
3. **Indeksowanie pasmowe LSH (Locality-Sensitive Hashing – 16 pasm po 8 wierszy):** aby nie porównywać nowego artykułu z każdym ze 100 000 artykułów w bazie, sygnatura dzielona jest na 16 pasm. Jeżeli dwa artykuły mają identyczny skrót w chociaż jednym pasmie, trafiają na listę kandydatów do dokładnego sprawdzenia podobieństwa Jaccarda:

$$J(A, B) = |S(A) czesc_wspolna S(B)| / |S(A) suma S(B)| ~= (liczba zgodnych skrotow MinHash) / 128$$

Czas wyszukania wszystkich klonów w skali 546 portali wynosi poniżej **2 milisekund**.
4. **Wyznaczenie roli artykułu w sieci:**
   * **Oryginał unikalny (`UNIQUE_LOCAL`):** tekst występuje tylko na jednym portalu w całej grupie PPG.
   * **Twórca kaskady (`CASCADE_ORIGIN`):** tekst został wprawdzie powielony na inne portale grupy, ale to ten konkretny dziennik opublikował go jako pierwszy (jest autorem materiału). W statystykach jakościowych twórca kaskady otrzymuje punkty za oryginalność, natomiast portale kopiujące go otrzymują status klona.
   * **Klon syndykacyjny (`SYNDICATED_CLONE`):** wtórne powielenie materiału stworzonego w innej redakcji lub w centralnym hubie.

---

## 6.4. Procedura audytu żywotności i unikalności 546 portali (`PortalVitalityAuditor`)

Moduł `PortalVitalityAuditor` wylicza dla każdego z 546 serwisów złożony **Indeks Żywotności (`Vitality Score` w skali 0–100 pkt)**:

$$VitalityScore = 0.35 * S_unikalnosc + 0.25 * S_wolumen + 0.20 * S_autorzy + 0.10 * S_swiezosc + 0.10 * (100 - S_cron)$$

Gdzie:
* `S_unikalnosc` – udział artykułów unikalnych (niebędących klonami MinHash z innych serwisów grupy),
* `S_wolumen` – dzienna liczba artykułów odniesiona do normy dla danego typu serwisu,
* `S_autorzy` – liczba aktywnych dziennikarzy podpisanych imieniem i nazwiskiem w okresie 30 dni,
* `S_swiezosc` – punktacja za czas od ostatniej publikacji (100 pkt dla `< 1h`, 0 pkt dla `> 48h`),
* `S_cron` – odsetek publikacji wrzucanych przez automat w pełnych kwadransach zegarowych (`:00`, `:15`, `:30`, `:45`).

---

# Rozdział 7. Metodologia badania tendencji politycznych, pluralizmu i bezstronności redakcyjnej (Jak mierzyć ekspozycję władzy i opozycji, aby chronić niezależność gazet i unikać przechyłu w którąkolwiek stronę)

## 7.1. Cel nadrzędny: ochrona wiarygodności czytelniczej i dziennikarskiej funkcji kontrolnej, a nie inżynieria polityczna

Wprowadzenie do systemu analitycznego modułu badającego ekspozycję partii politycznych, rządu, parlamentarzystów i samorządowców wymaga jasnego zdefiniowania celu biznesowego i redakcyjnego.

W profesjonalnym wydawnictwie prasowym pomiar obecności i wydźwięku wokół ugrupowań politycznych (w tym wokół głównej siły koalicji rządzącej KO / PO, jej koalicjantów z PSL, Polski 2050 i Lewicy, jak również partii opozycyjnych PiS, Konfederacji czy lokalnych komitetów samorządowych) **nie służy do sztucznego podbijania obecności którejkolwiek partii ani do narzucania redakcjom linii politycznej**. Cel tego badania jest dokładnie odwrotny i wynika z twardych praw rynku prasowego:

1. **Ochrona przed „biuletynowością" i niekrytycznym PR-em władzy (centralnej i samorządowej):**
   W mediach regionalnych istnieje naturalne zjawisko polegające na tym, że urzędująca władza (rząd, ministrowie, wojewodowie, marszałkowie województw, prezydenci miast i burmistrzowie) generuje codziennie dziesiątki oficjalnych komunikatów prasowych, konferencji o przecięciu wstęgi, zapowiedzi dotacji i wizyt gospodarskich. Jeżeli redakcja zaczyna bezrefleksyjnie przepisywać te komunikaty, udział publikacji o obozie rządzącym i jego politykach rośnie, a ich wydźwięk staje się jednostronnie laurkowy (wysoki odsetek tekstów pozytywnych przy braku tekstów krytycznych i kontrolnych). Czytelnicy błyskawicznie wyczuwają taką „dworskość" – gazeta traci wiarygodność, przestaje być postrzegana jako niezależny rzecznik mieszkańców, a subskrybenci *Strefy Plus* rezygnują z abonamentu.
2. **Ochrona przed jednostronnym przechyłem negatywnym i brakiem prawa do odpowiedzi:**
   Z drugiej strony, rzetelny dziennik regionalny nie może zamieniać się w biuletyn ataków bez merytorycznego uzasadnienia i bez oddania głosu drugiej stronie sporu. Jeżeli w jakimś tytule lub u konkretnego autora odsetek publikacji jednoznacznie negatywnych wobec wybranego ugrupowania lub samorządowca gwałtownie odbiega od normy sprawozdawczej, redaktor naczelny musi mieć narzędzie, które pokaże mu tę anomalię na twardych liczbach, zanim dojdzie do kryzysu wizerunkowego lub pozwów prasowych.
3. **Pilnowanie właściwej proporcji między polityką warszawską (`C`) a sprawami regionu (`L` i `CL`):**
   Czytelnicy *Gazety Krakowskiej*, *Dziennika Bałtyckiego*, *Głosu Wielkopolskiego* czy *Dziennika Zachodniego* nie kupują prasy regionalnej po to, aby czytać piętnasty raz ten sam opis sejmowej kłótni z Warszawy, który widzieli już w telewizji. Oczekują oni, że gazeta zapyta lokalnych posłów (zarówno z koalicji rządzącej, jak i z opozycji), co konkretnie załatwili dla swojego okręgu wyborczego, dlaczego opóźnia się budowa lokalnej drogi ekspresowej i jak głosowali w sprawie finansowania szpitali powiatowych.

Podsumowując: **wzorcowym stanem zdrowej gazety regionalnej w PPGscope nie jest maksymalizacja udziału ani pozytywnego wydźwięku wokół KO/PO czy jakiejkolwiek innej partii, lecz wysoki udział dziennikarstwa sprawozdawczego i kontrolnego (dominacja tekstów neutralnych i analitycznych na poziomie 55–70%), wielogłosowość (obecność argumentów koalicji, opozycji i ekspertów w tym samym tekście) oraz silne zakorzenienie tematów politycznych w realiach własnego regionu.**

---

## 7.2. Dlaczego w mediach regionalnych naturalnie pojawiają się politycy obozu rządzącego i samorządowego i jak system to waży

Aby prawidłowo interpretować wykresy obecności polityków w PPGscope, system oddziela **obecność instytucjonalną (wynikającą z pełnionego urzędu)** od **obecności czysto partyjnej**:

* Gdy w *Gazecie Krakowskiej* pojawia się Aleksander Miszalski, w *Dzienniku Bałtyckim* Aleksandra Dulkiewicz lub Mieczysław Struk, w *Głosie Wielkopolskim* Jacek Jaśkowiak, a w *Dzienniku Zachodnim* Wojciech Saługa, w większości przypadków występują oni w artykułach jako **urzędujący prezydenci miast i marszałkowie województw** odpowiadający za komunikację miejską, budżet, drogi i szpitale, a nie wyłącznie jako działacze partyjni.
* Podobnie w serwisach branżowych (*Strefa Biznesu*, *Strefa Agro*, *Strefa Obrony*, *Strefa Edukacji*) wysoka obecność ministrów (Andrzeja Domańskiego, Czesława Siekierskiego, Stefana Krajewskiego, Władysława Kosiniaka-Kamysza, Cezarego Tomczyka czy Barbary Nowackiej) wynika bezpośrednio z faktu, że kierują oni resortami wydającymi rozporządzenia omawiane przez te portale.

Dlatego w docelowym modelu analitycznym PPGscope każdy artykuł z dziedziny `01 Władza i polityka` jest opisywany w **trzech niezależnych wymiarach**:

```
+---------------------------------------------------------------------------------------------------+
|                   TRÓJWYMIAROWY MODEL ANALIZY TENDENCJI POLITYCZNYCH W PPGSCOPE                   |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  WYMIAR 1: ROLA I SZCZEBEL PODMIOTU (Kto występuje w tekście?)                                    |
|  - Władza rządowa i koalicja parlamentarna (KO/PO, PSL-TD, Polska 2050, Lewica)                   |
|  - Opozycja parlamentarna i ogólnopolska (PiS, Konfederacja, Partia Razem)                        |
|  - Ośrodek prezydencki (Prezydent RP i Kancelaria Prezydenta)                                     |
|  - Władza samorządowa regionu (Prezydent miasta, Burmistrz, Wójt, Starosta, Marszałek, Radni)     |
|                                                                                                   |
|  WYMIAR 2: CHARAKTER DZIENNIKARSKI PUBLIKACJI (Jaki to gatunek relacji?)                          |
|  - [KONTROLNY / ŚLEDCZY]   Rozliczanie obietnic, trudne pytania, analiza wydatków i opóźnień      |
|  - [SPRAWOZDAWCZY / DEBATA] Równoległe przedstawienie stanowisk władzy i opozycji (Pluralizm)     |
|  - [INFORMACYJNY / URZĘDOWY] Relacja z decyzji administracyjnej lub sesji bez komentarza          |
|  - [KOMUNIKATOWY / PR]     Jednostronne powielenie komunikatu biura prasowego bez kontry (Ryzyko!)|
|                                                                                                   |
|  WYMIAR 3: WYDŹWIĘK WOBEC PODMIOTU (W jakim świetle wypada dany aktor?)                           |
|  - Pozytywny (+) | Neutralny / Zrównoważony (0) | Negatywny / Krytyczny (-)                       |
+---------------------------------------------------------------------------------------------------+
```

---

## 7.3. Pięć wskaźników równowagi i rzetelności politycznej na docelowym pulpicie

Zamiast prymitywnego liczenia „kto ma więcej artykułów", docelowy pulpit PPGscope udostępnia pięć profesjonalnych wskaźników medioznawczych służących do pilnowania standardów niezależnego dziennikarstwa:

### 1. Wskaźnik Pluralizmu Wewnątrztekstowego (`Single-Article Pluralism Rate`)
* **Co mierzy:** jaki odsetek artykułów politycznych i samorządowych zawiera w swojej treści wypowiedzi lub argumenty **co najmniej dwóch różnych stron sporu** (np. zarząd miasta + radni opozycji; minister + przedstawiciele branży/opozycji).
* **Dlaczego jest ważny:** jeżeli tekst dotyczy kontrowersyjnej decyzji politycznej, a cytuje wyłącznie jedną stronę, otrzymuje niską ocenę pluralizmu. Wysoki wskaźnik pluralizmu wewnątrztekstowego to najlepsza tarcza chroniąca gazetę przed zarzutem stronniczości.

### 2. Indeks Symetrii Sceny Politycznej (`Coalition vs Opposition Share of Voice`)
* **Co mierzy:** proporcję ekspozycji ugrupowań rządzących (KO, PSL, Polska 2050, Lewica) do ugrupowań opozycyjnych (PiS, Konfederacja, Razem i opozycja samorządowa) z oddzieleniem komunikatów czysto urzędowych od debaty politycznej.
* **Jak interpretować:** w każdym państwie obóz rządzący ma naturalną premię informacyjną wynikającą z podejmowania decyzji wykonawczych (zwykle w proporcji ok. 55–60% dla rządu i instytucji do 40–45% dla opozycji i prezydenta). Jeżeli jednak w danym portalu proporcja w debacie politycznej rozjeżdża się np. do 85% vs 15% (w którąkolwiek stronę), system sygnalizuje zachwianie równowagi sprawozdawczej.

### 3. Wskaźnik Funkcji Kontrolnej Mediów wobec Władzy (`Watchdog Accountability Index`)
* **Co mierzy:** stosunek publikacji o charakterze rozliczeniowym, analitycznym i krytycznym wobec aktualnie rządzących (zarówno na szczeblu centralnym, jak i w ratuszu czy urzędzie marszałkowskim) do publikacji czysto afirmatywnych (np. relacji z ogłoszenia sukcesu lub wręczenia czeku).

$$WatchdogIndex = (N_krytyczne_i_sledcze + 0.5 * N_sprawozdawczo_pluralistyczne) / N_wszystkie_o_wladzy * 100%$$

* **Dlaczego jest kluczowy:** ten wskaźnik wprost udowadnia, że celem monitoringu nie jest promowanie obozu władzy. Jeżeli w danym dzienniku wydźwięk wobec rządzących staje się przesadnie pozytywny (np. 45% tekstów pozytywnych przy zaledwie 8% tekstów krytycznych), `Watchdog Accountability Index` spada do czerwonej strefy ostrzegawczej, sygnalizując redaktorowi naczelnemu, że gazeta staje się zbyt bierna wobec władzy i za mało pyta o problemy mieszkańców.

### 4. Wskaźnik Samodzielności Redakcyjnej vs Przepisywanie Biur Prasowych (`Press Release Dependency Score`)
* **Co mierzy:** za pomocą porównania tekstów z biuletynami urzędów wojewódzkich, ministerstw i urzędów miast system sprawdza, jaka część artykułów o politykach powstała z gotowych informacji prasowych, a jaka z własnej pracy dziennikarza.
* **Cel:** ograniczenie zjawiska bezkrytycznego przedrukowywania komunikatów nadsyłanych przez biura prasowe polityków i samorządów.

### 5. Korytarz Neutralności Salda Wydźwięku (`Neutrality Corridor: -15 pkt do +15 pkt`)
* **Co mierzy:** saldo wydźwięku (`Pozytywne % - Negatywne %`) dla każdego głównego ugrupowania i dla każdego z 20 dzienników regionalnych.
* **Standard wzorcowy:** w profesjonalnym dzienniku informacyjnym większość publikacji politycznych powinna mieć charakter neutralno-sprawozdawczy (`>= 55%`), a saldo wydźwięku powinno poruszać się w umiarkowanym korytarzu wynikającym z realnych wydarzeń, bez skrajnych odchyłów sugerujących prowadzenie kampanii promocyjnej lub nagonki.

---

# Rozdział 8. Rygor statystyczny, weryfikacja istotności trendów (testy Z, przedziały Wilsona, korekta Benjaminiego-Hochberga) oraz zasada „Dowód każdego wskaźnika" (MetricProof)

## 8.1. Dlaczego zwykłe różnice procentowe wprowadzają w błąd przy 546 portalach

Gdy analizujemy jednocześnie 546 portali i 18 dziedzin tematycznych, mamy do czynienia z `546 * 18 = 9828` komórkami danych w każdym przedziale czasowym. W małym serwisie powiatowym, który w ciągu doby opublikował 12 artykułów, pojawienie się dwóch dodatkowych tekstów o sporcie powoduje skok udziału dziedziny `11 Sport` o `+16.7` punktu procentowego. Bez zabezpieczeń statystycznych pulpit świeciłby się na czerwono od rzekomych „rewolucyjnych zmian trendu", które w rzeczywistości są zwykłym szumem losowym małej próby.

Dlatego w PPGscope (`ppgscope/trend_stats.py`) każdy komunikat o wzroście lub spadku udziału dziedziny oraz o zmianie wydźwięku przechodzi przez pełne sito matematyczne:

### 1. Twarda blokada małej próby (`Minimum Sample Threshold`)
Dla każdego porównania okresów (`T1` vs `T2`) lub mediów (`A` vs `B`) system sprawdza warunek minimalnej liczebności mianownika:

$$N1 >= 30  oraz  N2 >= 30$$

Jeżeli w wybranym oknie czasu portal opublikował mniej niż 30 artykułów (lub mniej niż 20 artykułów politycznych w module wydźwięku), system wyświetla surowe liczby bezwzględne wraz z oznaczeniem `Próba poniżej progu statystycznego (N < 30)` i nie pozwala na wyciąganie wniosków procentowych bez tego zastrzeżenia.

### 2. Przedziały ufności Wilsona dla udziałów procentowych
Klasyczny wzór na błąd standardowy frakcji zawodzi, gdy udział dziedziny jest bliski `0%` lub `100%`. PPGscope wylicza asymetryczne 95-procentowe przedziały ufności metodą **Wilsona (Wilson Score Interval)**:

$$CI_95 = ( p + z^2/(2n) +/- z * sqrt( p*(1-p)/n + z^2/(4*n^2) ) ) / ( 1 + z^2/n ),  gdzie z = 1.96$$

Dzięki temu przy każdym udziale procentowym system zna dokładny margines niepewności pomiarowej.

### 3. Dwupróbowy test Z dla proporcji z korektą Benjaminiego-Hochberga (FDR)
Przy badaniu zmian między okresem bieżącym (`p2 = k2 / n2`) a okresem bazowym (`p1 = k1 / n1`):
1. Wyliczana jest statystyka testowa `Z = (p2 - p1) / SE` oraz dwustronna wartość `p-value`.
2. Dla wszystkich 18 równolegle testowanych dziedzin stosowana jest procedura **Benjaminiego-Hochberga**, która kontroluje oczekiwany odsetek fałszywych odkryć (`False Discovery Rate` na poziomie `FDR <= 0.05`).
3. Dopiero zmiana, która przejdzie jednocześnie test istotności (`q-value < 0.05`) oraz przekroczy próg istotności praktycznej (`|Delta p| >= 1.5 pkt proc.`), jest oznaczana na pulpicie jako **potwierdzony statystycznie trend**.

---

## 8.2. Obiekt dowodowy `MetricProof` (`ppgscope/proof_models.py`)

W myśl standardu Fable 5.1 każdy zagregowany wskaźnik wyświetlany w PPGscope posiada przypisaną strukturę dowodową `MetricProof`:

```json
{
  "metric_name": "domain_share_pct",
  "portal_domain": "gazetakrakowska.pl",
  "domain_slug": "infrastruktura_komunikacja_i_mieszkalnictwo",
  "window_preset": "30d",
  "window_start": "2026-09-18T12:00:00+02:00",
  "window_end": "2026-10-18T12:00:00+02:00",
  "numerator_k": 318,
  "denominator_n": 2650,
  "value_pct": 12.0,
  "wilson_ci_95": [10.8, 13.3],
  "taxonomy_version": "2.0",
  "sample_article_ids": ["gk_18940215", "gk_18941102", "gk_18944810"],
  "is_statistically_valid": true
}
```

Taka konstrukcja gwarantuje pełną audytowalność: niezależny kontroler lub członek zarządu może kliknąć w dowolną liczbę na ekranie i natychmiast zobaczyć dokładny ułamek (`318 / 2650`), przedział ufności oraz listę konkretnych artykułów, z których ten ułamek został policzony.

---

# Rozdział 9. Docelowa architektura techniczna czasu rzeczywistego, schematy przepływu strumieniowego i pełny kontrakt bazy danych SQL

## 9.1. Schemat przepływu danych w docelowej architekturze produkcyjnej

Poniższy schemat przedstawia kompletną drogę pojedynczego artykułu i zdarzenia czytelniczego od momentu jego powstania do wyświetlenia na pulpicie wydawcy w czasie rzeczywistym:

```
+---------------------------------------------------------------------------------------------------+
| KROK 1: POZYSKANIE ZDARZENIA (0 - 60 sekund od publikacji / interakcji)                           |
| - Webhook z CMS lub wykrycie w RSS / sitemap-news.xml / Sondzie DOM strony głównej                |
| - Równoległy spływ zdarzeń odsłon, czasu czytania i konwersji Strefa Plus z Chartbeat / GA4       |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| KROK 2: KANONIZACJA I ROZWIĄZANIE ENCJI (ArticleEntityResolver - < 5 ms)                          |
| - Oczyszczenie adresu URL z parametrów śledzących, wyodrębnienie native_cms_id                    |
| - Sprawdzenie w pamięci Redis: czy artykuł jest już znany, czy to nowa publikacja lub mutacja     |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| KROK 3: EKSTRAKCJA I DEDUPLIKACJA MINHASH (< 25 ms)                                               |
| - Wyodrębnienie tytułu, leadu, treści, autora, znaczników JSON-LD, Strefa Plus i Sponsor          |
| - Wyliczenie 128-elementowej sygnatury MinHash i sprawdzenie w indeksie LSH ostatnich 72 godzin   |
| - Jeśli podobieństwo Jaccarda >= 0.85 -> przypisanie do klastra klonów i wskazanie portalu Origin |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| KROK 4: KLASYFIKACJA TAKSONOMICZNA V2.0, LOKALNOŚĆ I POLITYKA (10 ms reguły / ~400 ms AI)         |
| - Przypisanie dziedziny głównej i pobocznej z 18 kategorii + ocena lokalności L / CL / C          |
| - Wyodrębnienie powiatów i instytucji lokalnych TERYT                                             |
| - Dla tekstów politycznych: rozpoznanie polityków, partii, roli instytucjonalnej i wydźwięku      |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| KROK 5: AKTUALIZACJA BAZY OPERACYJNEJ I KOSTEK ANALITYCZNYCH (< 50 ms)                            |
| - Zapis pełnego rekordu w PostgreSQL / Supabase (articles_unified, article_mutations)             |
| - Inkrementalna aktualizacja zmaterializowanych agregatów dla okien 24h, 7d, 30d, 90d, 1y, all    |
| - Wysłanie powiadomienia przez kanał Server-Sent Events / WebSocket do otwartych pulpitów         |
+---------------------------------------------------------------------------------------------------+
```

---

## 9.2. Docelowy kontrakt bazy danych SQL (PostgreSQL / Supabase)

```sql
-- 1. Katalog wszystkich 546 portali i serwisów wydawnictwa (oraz monitorowanej konkurencji)
CREATE TABLE portals (
    portal_id           TEXT PRIMARY KEY,              -- np. 'ppg_001'
    domain              TEXT UNIQUE NOT NULL,          -- np. 'gazetakrakowska.pl'
    name                TEXT NOT NULL,                 -- np. 'Gazeta Krakowska'
    segment_type        TEXT NOT NULL,                 -- 'DZIENNIK_REGIONALNY', 'NASZEMIASTO', 'TEMATYCZNY', 'OGOLNOKRAJOWY', 'KONKURENCJA'
    voivodeship_code    CHAR(2),                       -- kod TERYT województwa, np. '12'
    voivodeship_name    TEXT NOT NULL,                 -- np. 'Małopolskie'
    county_code         CHAR(4),                       -- kod TERYT powiatu, np. '1261'
    city_name           TEXT,                          -- np. 'Kraków'
    parent_daily_domain TEXT,                          -- dla serwisów NaszeMiasto: dziennik macierzysty oddziału
    rss_urls            JSONB DEFAULT '[]'::jsonb,
    sitemap_news_url    TEXT,
    expected_daily_min  INTEGER DEFAULT 10,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Zunifikowana tabela artykułów (fuzja danych zewnętrznych OSINT i wewnętrznych CMS/GA4/Paywall)
CREATE TABLE articles_unified (
    article_uid             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_domain           TEXT NOT NULL REFERENCES portals(domain),
    native_cms_id           TEXT,                      -- wyodrębniony ID z URL lub z webhooka CMS
    canonical_url           TEXT NOT NULL,
    url                     TEXT NOT NULL,
    title_initial           TEXT NOT NULL,
    title_current           TEXT NOT NULL,
    lead_text               TEXT,
    body_word_count         INTEGER DEFAULT 0,
    published_at            TIMESTAMPTZ NOT NULL,
    modified_at             TIMESTAMPTZ,
    published_in_cron_slot  BOOLEAN DEFAULT FALSE,     -- czy opublikowano w minucie :00/:15/:30/:45

    -- Autorstwo (OSINT + CMS)
    byline_raw              TEXT,
    byline_type             TEXT NOT NULL,             -- 'named', 'anonymous', 'wire', 'partner'
    author_normalized       TEXT,
    cms_editorial_team      TEXT,

    -- Taksonomia v2.0 (18 dziedzin) i Lokalność (L / CL / C)
    domain_primary          TEXT NOT NULL,             -- slug z 18 dziedzin
    domain_secondary        TEXT,
    locality                VARCHAR(2) NOT NULL,       -- 'L', 'CL' lub 'C'
    classification_conf     NUMERIC(4,3) NOT NULL,
    needs_review            BOOLEAN DEFAULT FALSE,
    classification_method   TEXT NOT NULL,             -- 'rules_v2', 'gemini_structured', 'nli_zero_shot'
    classification_reason   TEXT,

    -- Deduplikacja i syndykacja sieciowa
    minhash_signature       BYTEA,                     -- 128 x uint32
    syndication_cluster_id  UUID,
    is_network_origin       BOOLEAN DEFAULT TRUE,      -- czy to pierwszy portal w kaskadzie
    clone_similarity_score  NUMERIC(4,3) DEFAULT 0.0,

    -- Monetyzacja, Paywall i Google Discover
    is_paywalled_initial    BOOLEAN DEFAULT FALSE,
    is_paywalled_current    BOOLEAN DEFAULT FALSE,
    paywall_locked_at       TIMESTAMPTZ,
    is_sponsored            BOOLEAN DEFAULT FALSE,
    sponsor_label           TEXT,
    is_discover_bait        BOOLEAN DEFAULT FALSE,
    discover_bait_patterns  JSONB DEFAULT '[]'::jsonb,

    -- Lokalność powiatowa TERYT i cytowane instytucje
    teryt_counties_mentioned JSONB DEFAULT '[]'::jsonb,
    local_institutions       JSONB DEFAULT '[]'::jsonb,

    -- Analiza pluralizmu i tendencji politycznych
    has_political_content   BOOLEAN DEFAULT FALSE,
    political_genre         TEXT,                      -- 'WATCHDOG', 'PLURAL_DEBATE', 'INSTITUTIONAL', 'PRESS_RELEASE'
    has_multi_party_voices  BOOLEAN DEFAULT FALSE,     -- czy w tekście są głosy co najmniej 2 stron
    ko_po_present           BOOLEAN DEFAULT FALSE,
    ko_po_sentiment         TEXT,                      -- 'positive', 'neutral', 'negative'
    ko_po_rationale         TEXT,
    politicians_mentioned   JSONB DEFAULT '[]'::jsonb,

    -- Dane wewnętrzne (aktualizowane strumieniowo z GA4 / Chartbeat / Strefa Plus / GAM)
    live_concurrent_users   INTEGER DEFAULT 0,
    pageviews_24h           INTEGER DEFAULT 0,
    pageviews_total         INTEGER DEFAULT 0,
    engaged_time_avg_sec    NUMERIC(6,1) DEFAULT 0.0,
    scroll_depth_avg_pct    NUMERIC(5,1) DEFAULT 0.0,
    traffic_discover_pct    NUMERIC(5,1) DEFAULT 0.0,
    traffic_search_pct      NUMERIC(5,1) DEFAULT 0.0,
    traffic_homepage_pct    NUMERIC(5,1) DEFAULT 0.0,
    traffic_social_pct      NUMERIC(5,1) DEFAULT 0.0,
    paywall_impressions     INTEGER DEFAULT 0,
    paywall_conversions     INTEGER DEFAULT 0,
    ad_revenue_pln          NUMERIC(10,2) DEFAULT 0.00,
    external_citations_cnt  INTEGER DEFAULT 0
);
```

---

# Rozdział 10. Projekt funkcjonalny ekranów docelowego pulpitu, Karty Diagnostycznej 360° Pojedynczego Medium oraz Porównywarki Mediów (Medium A vs Medium B)

## 10.1. Zasady ergonomii i przejrzystości interfejsu

Pulpit PPGscope został zaprojektowany dla osób podejmujących szybkie decyzje: członków zarządu, dyrektorów wydawniczych, redaktorów naczelnych i wydawców stron głównych. Interfejs przestrzega czterech zasad projektowych:

1. **Wszystkie 546 mediów dostępne od ręki w jednym selektorze z natychmiastowym wyszukiwaniem:** użytkownik nie musi przeklikiwać się przez drzewka katalogów. Wpisanie kilku liter nazwy miasta lub tytułu (np. `kraków`, `bałtycki`, `sopot`, `bochnia`, `agro`) natychmiast wyświetla pasujące portale w formie klikalnych pigułek.
2. **Pełna spójność filtrów między zakładkami:** zmiana wybranego medium (np. na *Dziennik Zachodni*) lub okna czasu (np. z `30d` na `7d` lub `24h`) w górnym pasku natychmiast przelicza wszystkie widoki w aplikacji: wykres 18 dziedzin, wskaźniki lokalności, strukturę autorstwa, wydźwięk polityczny i listę polityków, kartę 360° oraz porównywarkę.
3. **Zawsze widoczna liczebność próby (`N`):** przy każdym wykresie i w każdej karcie system podaje dokładną liczbę przeanalizowanych artykułów (np. `2 650 artykułów w okresie 30d`), dzięki czemu odbiorca zawsze wie, jak duża skala publikacji stoi za danym procentem.
4. **Przejście od ogółu do szczegółu jednym kliknięciem:** każdy z sześciu kafelków w karcie `Audyt 360° Pojedynczego Medium` jest aktywnym przełącznikiem przenoszącym użytkownika bezpośrednio do szczegółowego modułu badawczego.

---

## 10.2. Szczegółowy układ Porównywarki Mediów 360° (`Medium A vs Medium B`)

Wdrożona na pulpicie zakładka **Porównywarka Mediów (A vs B)** pozwala zestawić ze sobą dowolne dwa podmioty w pięciu płaszczyznach porównawczych:

1. **Pojedynek dwóch dzienników regionalnych** (np. *Gazeta Krakowska* vs *Dziennik Bałtycki* lub *Dziennik Zachodni* vs *Głos Wielkopolski*) – pozwala porównać, jak różnią się priorytety tematyczne, udział lokalności `L`, aktywność autorów imiennych i wykorzystanie paywalla *Strefa Plus* między flagowymi redakcjami w różnych województwach.
2. **Pojedynek dużego portalu miejskiego z mniejszym serwisem powiatowym** (np. *Kraków NaszeMiasto* vs *Bochnia NaszeMiasto* albo *Gdańsk NaszeMiasto* vs *Puck NaszeMiasto*) – pokazuje różnicę w unikalności treści i uzależnieniu mniejszych powiatów od automatycznych przedruków.
3. **Pojedynek dwóch serwisów tematycznych** (np. *Strefa Biznesu* vs *Strefa Agro*) – obrazuje profil specjalizacji dziedzinowej oraz dobór ministrów i ekspertów branżowych.
4. **Pojedynek pojedynczego medium ze średnią całej grupy 546 serwisów** (np. *Gazeta Wrocławska* vs *Cała grupa PPG*) – pokazuje, w których z 18 dziedzin dany dziennik wybija się ponad średnią wydawnictwa, a w których pozostaje w tyle.
5. **Pojedynek naszego dziennika z portalem konkurencyjnym** (po włączeniu monitoringu domen konkurencji w danym województwie).

W każdym z tych pojedynków system automatycznie wylicza **plakietki przewagi (`+X.X pkt A` lub `+X.X pkt B`)**, wskazując jednym kolorem (morskim dla Medium A, błękitnym dla Medium B), która redakcja osiąga wyższy wynik w danym kryterium.

---

# Rozdział 11. System wczesnego ostrzegania (Reguły alertów czasu rzeczywistego) oraz automatyczne briefingi poranne dla Zarządu i Redaktorów Naczelnych

## 11.1. Jak działają proaktywne reguły ostrzegawcze

W docelowym trybie pracy ciągłej (24/7) silnik reguł PPGscope (`AlertingRuleEngine`) bada co 5 minut strumień napływających danych i porównuje go z wyznaczonymi normami dla każdego z 546 serwisów.

Zamiast zasypywać redaktorów setkami drobnych powiadomień, system grupuje zdarzenia w **cztery priorytety operacyjne**:

1. **Priorytet P1 – Krytyczny (Reakcja natychmiastowa < 15 minut):**
   * Całkowite zatrzymanie publikacji w jednym z 20 dzienników regionalnych w godzinach pracy redakcji (06:30–22:00).
   * Niedostępność techniczna domeny (błąd HTTP `500/502/503`) lub uszkodzenie mapy `sitemap-news.xml` powodujące wypadnięcie nowych artykułów z indeksacji Google News.
   * Ważne wydarzenie kryzysowe w regionie (np. poważny wypadek, pożar, alarm powodziowy widoczny w komunikatach służb i u konkurencji) przy braku publikacji na naszym portalu wojewódzkim.
2. **Priorytet P2 – Wysoki (Reakcja w ciągu 1 godziny):**
   * Zastój na „jedynce" (główny artykuł otwierający stronę główną dziennika nie był aktualizowany ani zmieniany przez ponad 4 godziny przy spadającym współczynniku klikalności CTR).
   * Wykrycie artykułu autorskiego o wysokim potencjale subskrypcyjnym (szybki przyrost wejść z regionu i długi czas czytania), który nie został jeszcze oznaczony flagą *Strefa Plus*.
   * Zagrożenie niedowiezienia gwarantowanej liczby odsłon na opłaconym artykule sponsorowanym.
3. **Priorytet P3 – Jakościowy i Redakcyjny (Podsumowanie zmiany / dnia):**
   * Spadek udziału treści lokalnej `(L + CL)` w dzienniku regionalnym poniżej progu ostrzegawczego 55% w ujęciu dobowym.
   * Skok udziału klonów sieciowych powyżej 75% w serwisach miejskich danego oddziału.
   * Wyjście wskaźników równowagi politycznej poza korytarz neutralności sprawozdawczej (np. nagły wzrost publikacji jednostronnych bez głosu drugiej strony lub nadmierny udział nieprzerobionych komunikatów biur prasowych).
4. **Priorytet P4 – Strategiczny (Raport tygodniowy i miesięczny):**
   * Wykrycie nowych „martwych lub ledwo żywych powiatów" w sieci 509 serwisów *NaszeMiasto*.
   * Zjawisko kanibalizacji słów kluczowych między serwisami grupy wykryte w Google Search Console.

## 11.2. Struktura Porannego Briefingu Kolegium Redakcyjnego (godz. 07:00)

Codziennie o 07:00 rano, przed rozpoczęciem porannych kolegiów w oddziałach, system generuje spersonalizowaną kartę odprawy:
* **Blok 1 (Wynik wczorajszej doby):** liczba opublikowanych artykułów własnych vs klonów, udział lokalności `L / CL / C` na tle celu redakcyjnego, łączny czas czytania i liczba sprzedanych subskrypcji *Strefa Plus*.
* **Blok 2 (Bohaterowie dnia):** 5 artykułów i autorów, którzy wygenerowali największe zaangażowanie czytelników i najwięcej nowych subskrypcji w regionie.
* **Blok 3 (Przegapione szanse i korekty):** które tematy lokalne miały wysokie zainteresowanie w regionie, a u nas ukazały się z opóźnieniem lub wyłącznie jako sucha depesza centralna `C` bez rozwinięcia lokalnego.
* **Blok 4 (Plan ochrony powiatów na dziś):** lista 3–5 powiatów w województwie, w których przez ostatnie 48 godzin brakowało silnego materiału lokalnego.

---

# Rozdział 12. Bezpieczeństwo, model uprawnień (RBAC), zgodność prawna oraz kaskadowa optymalizacja kosztów sztucznej inteligencji

## 12.1. Bezpieczeństwo danych i separacja uprawnień

Ponieważ docelowy system łączy publiczne dane o treści artykułów z wrażliwymi danymi handlowymi i subskrypcyjnymi wydawnictwa, architektura bezpieczeństwa opiera się na czterech filarach:

1. **Szyfrowanie i izolacja kluczy API:** wszystkie klucze do baz danych Supabase/PostgreSQL, BigQuery, Chartbeat, systemu *Strefa Plus* oraz modeli Gemini są przechowywane w szyfrowanym magazynie zmiennych środowiskowych po stronie serwera.
2. **Uprawnienia oparte na rolach i oddziałach (`Row-Level Security`):** zarząd widzi pełny przekrój finansowy wszystkich 16 oddziałów; dyrektor oddziału w Gdańsku lub Krakowie widzi pełne dane redakcyjne całej grupy (aby móc porównywać się w module `Medium A vs Medium B`), natomiast szczegółowe dane o przychodach reklamowych i stawkach klientów widzi wyłącznie dla swojego makroregionu.
3. **Pełny dziennik audytowy (`Audit Log`):** każda zmiana w słowniku taksonomii 18 dziedzin, ręczna korekta klasyfikacji artykułu z kolejki `needs_review` czy zmiana progów alertowych jest zapisywana ze znacznikiem czasu i identyfikatorem użytkownika.
4. **Zgodność z RODO (GDPR Privacy by Design):** PPGscope analizuje publikacje prasowe oraz zagregowane wskaźniki czytelnictwa i konwersji przypisane do artykułów. System nie przetwarza ani nie przechowuje danych osobowych czytelników (adresów e-mail abonentów, numerów kart płatniczych czy indywidualnych identyfikatorów ciasteczek reklamowych).

## 12.2. Rachunek kosztów utrzymania i kaskada AI przy skali 546 portali

Dzięki zastosowaniu opisanej w Rozdziale 6 deduplikacji MinHash przed wywołaniem modelu językowego, system unika wielokrotnego płacenia za analizę tego samego tekstu sklonowanego na kilkaset serwisów *NaszeMiasto*.

| Etap potoku przetwarzania (dzienny napływ ~12 000 publikacji w sieci) | Odsetek publikacji obsługiwanych na tym etapie | Liczba wywołań zewnętrznego API LLM | Jednostkowy czas operacji | Szacowany koszt dobowy |
| :--- | :--- | :--- | :--- | :--- |
| **1. Odfiltrowanie klonów MinHash (`J >= 0.85`)** i dziedziczenie klasyfikacji z artykułu macierzystego | **~62%** (~7 440 art./dobę) | **0** (operacja lokalna w pamięci RAM) | `< 2 ms` | **0.00 USD** |
| **2. Deterministyczny silnik reguł taksonomii v2.0** (jednoznaczne wzorce o pewności `>= 0.90`) | **~18%** (~2 160 art./dobę) | **0** (lokalny skaner leksykalny i NER) | `< 8 ms` | **0.00 USD** |
| **3. Szybki model `Gemini 2.5 Flash`** z buforowanym kontekstem (dla nowych oryginalnych artykułów) | **~18%** (~2 160 art./dobę) | ~2 160 zapytań strukturalnych JSON | `~350 ms` | **~0.85 USD** |
| **4. Model głęboki `Gemini 2.5 Pro`** (wyłącznie dla trudnych tekstów z flagą `needs_review`) | **~2%** (~240 art./dobę) | ~240 zapytań głębokiej analizy | `~1.2 s` | **~0.95 USD** |
| **RAZEM DLA CAŁEJ SIECI 546 MEDIÓW** | **100% (12 000 art./dobę)** | **~2 400 wywołań AI / dobę** | **Średnio < 80 ms** | **~1.80 USD / dobę (~54 USD / mies.)** |

Tak skonstruowana kaskada sprawia, że pełny monitoring czasu rzeczywistego wszystkich 546 mediów wydawnictwa jest niezwykle ekonomiczny w utrzymaniu.

---

# Rozdział 13. Czteroetapowy plan wdrożenia (Mapa drogowa przejścia od wersji v2.5 do pełnego systemu v4.0) oraz zestawienie wzorów

## 13.1. Harmonogram i kamienie milowe wdrożenia docelowego

| Etap wdrożenia | Zakres prac inżynierskich i integracyjnych | Wymagania po stronie działu IT wydawnictwa | Rezultat widoczny na pulpicie `https://ppgscope.pl` |
| :--- | :--- | :--- | :--- |
| **Etap 1 (Zrealizowany – v2.5)** | Taksonomia 18 dziedzin v2.0, lokalność `L/CL/C`, audyt żywotności 546 portali, sonda RSS/DOM na żywo, regionalny moduł wydźwięku politycznego, 6 modułów wywiadu, Karta 360° pojedynczego medium oraz Porównywarka `Medium A vs Medium B`. | Brak (system w pełni wdrożony i działający produkcyjnie). | Kompletny pulpit analityczny 546 mediów z badaniem pojedynczych portali i porównywarką `A vs B`. |
| **Etap 2 (Tygodnie 1–3): Ciągły Kolektor 24/7 i Hurtownia Historii** | Uruchomienie cyklicznych workerów odpytujących co 5 minut kanały RSS, `sitemap-news.xml` i strony główne 546 domen z trwałym zapisem do tabel `articles_unified`, `homepage_snapshots` i `article_mutations` w Supabase/PostgreSQL. | Brak (korzysta wyłącznie z publicznych kanałów RSS/Sitemap/HTTP). | Ciągłe gromadzenie własnej bazy historycznej 1:1 ze wszystkich 546 serwisów, wykresy mutacji 48h i archiwum jedynek. |
| **Etap 3 (Tygodnie 4–7): Fuzja Wewnętrzna (CMS + GA4/Chartbeat + Strefa Plus + GAM)** | Podłączenie odczytu z eksportu GA4 BigQuery, API Chartbeat/Marfeel, strumienia konwersji *Strefa Plus* oraz webhooków CMS przez `ArticleEntityResolver`. | Nadanie klucza serwisowego Read-Only do BigQuery/GA4, Chartbeat oraz raportów konwersji *Strefa Plus*. | Odsłonięcie na pulpicie kolumn czasu czytania, źródeł ruchu (Discover/Search/Jedynka) oraz liczby sprzedanych subskrypcji dla każdej z 18 dziedzin i każdego portalu. |
| **Etap 4 (Tygodnie 8–10): Otoczenie Rynkowe (IMM / Konkurencja / GSC) i Alerty** | Integracja API Instytutu Monitorowania Mediów / Press-Service, Google Search Console oraz włączenie monitoringu 40 głównych portali konkurencji regionalnej w 16 województwach i alertów Slack/Teams/e-mail. | Udostępnienie uprawnień odczytu Google Search Console dla domen PPG oraz klucza API monitoringu mediów. | Pełny Radar Luki Tematycznej w regionach, pojedynki `Nasz Dziennik vs Konkurent`, bilans cytowalności i poranne briefingi o godz. 07:00. |

---

## 13.2. Zestawienie głównych wzorów matematycznych systemu

1. **Udział treści lokalnej:**
   `LocalContentShare = (N_L + N_CL) / (N_L + N_CL + N_C) * 100%`
2. **Wskaźnik lokalizacji tematów centralnych:**
   `LocalizationIndex = N_CL / (N_C + N_CL) * 100%`
3. **Złożony Indeks Żywotności Portalu (0–100 pkt):**
   `VitalityScore = 0.35 * S_unikalnosc + 0.25 * S_wolumen + 0.20 * S_autorzy + 0.10 * S_swiezosc + 0.10 * (100 - S_cron)`
4. **Podobieństwo Jaccarda sygnatur MinHash (`k = 128`):**
   `J(A, B) = (liczba zgodnych skrotow z 128) / 128`
5. **Wskaźnik Luki Agendy Strony Głównej względem RSS:**
   `AgendaGap = 0.5 * SUMA_{d=1..18} | Udzial_Jedynka(d) - Udzial_RSS(d) |`
6. **Saldo Wydźwięku (Net Sentiment Score):**
   `NetSentiment = Udzial_Pozytywnych(%) - Udzial_Negatywnych(%)`
7. **Wskaźnik Funkcji Kontrolnej Mediów (Watchdog Accountability Index):**
   `WatchdogIndex = (N_krytyczne_i_sledcze + 0.5 * N_sprawozdawczo_pluralistyczne) / N_wszystkie_o_wladzy * 100%`

---

# Rozdział 14. Karty operacyjne wszystkich 18 dziedzin Taksonomii v2.0 (Słowniki sygnałów, rozróżnienie L / CL / C, reguły rozstrzygania sporów i potencjał subskrypcyjny)

W celu zapewnienia stuprocentowej powtarzalności klasyfikacji między wszystkimi 546 serwisami wydawnictwa, dla każdej z 18 dziedzin taksonomii v2.0 opracowano szczegółową kartę operacyjną. Poniższe wytyczne stanowią jednocześnie instrukcję dla modeli sztucznej inteligencji (`Gemini Structured Output`) oraz dla audytorów weryfikujących próbki artykułów.

---

## 01. Władza i polityka (`wladza_i_polityka`)
* **Główne słowa kluczowe i encje:** Sejm, Senat, rząd, premier, Rada Ministrów, ministerstwo, prezydent RP, koalicja, opozycja, wybory, referendum, sondaż partyjny, uchwała rady miasta, sesja sejmiku województwa, budżet gminy, wotum zaufania, wojewoda, marszałek województwa, starosta, prezydent miasta, burmistrz, wójt.
* **Przykład `L` (Czysto lokalne):** *„Burzliwa sesja Rady Miasta w Tarnowie. Radni przegłosowali podwyżkę podatku od nieruchomości po wielogodzinnym sporze z prezydentem"*.
* **Przykład `CL` (Centralne z rozwinięciem lokalnym):** *„Rząd ogłasza nowy fundusz inwestycji samorządowych. Sprawdziliśmy, o jakie kwoty wnioskują gminy z powiatu bocheńskiego i wielickiego"*.
* **Przykład `C` (Centralne):** *„Sejm odrzucił wniosek opozycji o wotum nieufności wobec ministra. Gorąca debata przy Wiejskiej"*.
* **Potencjał subskrypcyjny *Strefa Plus*:** Bardzo wysoki dla wariantu `L` (kulisy polityki miejskiej, nominacje w spółkach komunalnych, lokalne układy sił); niski dla surowych depesz sejmowych `C`.

## 02. Gospodarka i rynek (`gospodarka_i_rynek`)
* **Główne słowa kluczowe i encje:** PKB, inflacja GUS, inwestycja fabryczna, strefa ekonomiczna, zwolnienia grupowe, rynek pracy, stopa bezrobocia, eksport, port morski, stocznia, kopalnia, huta, branża IT, giełda, wyniki finansowe spółek, zamknięcie zakładu pracy.
* **Przykład `L`:** *„Znana fabryka mebli pod Olsztynem zwalnia 180 pracowników. Związkowcy mówią o szoku, starosta zwołuje sztab"*.
* **Przykład `CL`:** *„Bezrobocie w Polsce lekko w górę. Zobacz, w których powiatach województwa śląskiego najłatwiej, a gdzie najtrudniej dziś o pracę"*.
* **Przykład `C`:** *„Rada Polityki Pieniężnej podjęła decyzję w sprawie stóp procentowych. Ekonomista wyjaśnia skutki dla złotego"*.
* **Potencjał subskrypcyjny *Strefa Plus*:** Jeden z najwyższych w całej taksonomii – rankingi lokalnych firm, informacje o nowych fabrykach, inwestorach i zwolnieniach w regionie należą do najchętniej opłacanych treści w dziennikach regionalnych.

## 03. Finanse osobiste i świadczenia (`finanse_osobiste_i_zabezpieczenie`)
* **Główne słowa kluczowe i encje:** emerytura, ZUS, KRUS, waloryzacja, trzynastka, czternastka, 800 plus, renta wdowia, świadczenie wspierające, MOPS, zasiłek, ulga podatkowa PIT, deklaracja skarbowa, kredyt hipoteczny, WIBOR, rata kredytu, konto oszczędnościowe.
* **Przykład `L`:** *„MOPS w Łodzi rozpoczyna przyjmowanie wniosków o bony ciepłownicze dla seniorów. Gdzie złożyć dokumenty i jakie są progi?"*.
* **Przykład `CL`:** *„ZUS wypłacił zwaloryzowane emerytury. Rekordzista z oddziału w Zabrzu dostaje co miesiąc ponad 28 tysięcy złotych"*.
* **Przykład `C`:** *„Nowa tabela waloryzacji emerytur. Tyle dokładnie wyniesie podwyżka na rękę dla świadczeń od 2000 do 5000 zł"*.
* **Reguła graniczna:** Nawet jeśli w tytule pada nazwa miasta lub regionu (np. *„Najwyższa emerytura w Wielkopolsce"*), tekst zawsze trafia do dziedziny `03`, a nie `02 Gospodarka`.

## 04. Infrastruktura, komunikacja i mieszkalnictwo (`infrastruktura_komunikacja_i_mieszkalnictwo`)
* **Główne słowa kluczowe i encje:** budowa drogi, obwodnica, autostrada A1/A2/A4, droga ekspresowa S7/S6/S5/S19, GDDKiA, remont mostu, torowisko, PKP PLK, rozkład jazdy pociągów, komunikacja miejska MPK/ZTM, nowa linia tramwajowa, strefa płatnego parkowania, ceny mieszkań, deweloperzy, czynsze w spółdzielniach.
* **Przykład `L`:** *„Wielki remont ulicy Kościuszki w Krakowie. Od poniedziałku tramwaje pojadą objazdem przez Dębniki [MAPA]"*.
* **Przykład `CL`:** *„Koleje przyspieszają w nowym rozkładzie jazdy PKP. Zobacz, o ile krócej pojedziemy z Gdańska do Warszawy i Słupska"*.
* **Przykład `C`:** *„Rząd zmienia przepisy budowlane dla deweloperów w całym kraju. Minimalna odległość bloków od granicy działki wzrośnie"*.
* **Potencjał subskrypcyjny *Strefa Plus*:** Ekstremalnie wysoki dla artykułów z mapami inwestycji drogowych, planami zagospodarowania przestrzennego i analizami cen mieszkań w dzielnicach.

## 05. Przestępczość i służby (`przestepczosc_i_sluzby`)
* **Główne słowa kluczowe i encje:** policja, zatrzymanie, kradzież, włamanie, rozbój, zabójstwo, oszustwo metodą na wnuczka/BLIK, poszukiwany listem gończym, straż pożarna, pożar budynku/lasu, akcja ratunkowa, CBŚP, ABW, Straż Graniczna.
* **Przykład `L`:** *„Nocny pożar hali magazynowej w Pszczynie. Dwadzieścia zastępów straży pożarnej walczyło z ogniem do rana"*.
* **Przykład `CL`:** *„Nowa fala oszustw na fałszywego pracownika banku w całej Polsce. Policjanci z Poznania pokazują nagrania z zatrzymania szajki"*.
* **Przykład `C`:** *„Komenda Główna Policji ostrzega przed fałszywymi wiadomościami SMS o dopłacie do paczki"*.

## 06. Wypadki i bezpieczeństwo drogowe (`wypadki_i_bezpieczenstwo_drogowe`)
* **Główne słowa kluczowe i encje:** wypadek śmiertelny, kolizja, zderzenie ciężarówki z osobówką, dachowanie, potrącenie pieszego na pasach, lądowanie śmigłowca LPR na jezdni, zablokowana autostrada/droga krajowa, pijany kierowca, fotoradar, punkty karne.
* **Przykład `L`:** *„Groźny wypadek na obwodnicy Trójmiasta na wysokości Szadółek. Zderzyły się trzy auta, korek w stronę Gdyni ma 8 kilometrów"*.
* **Przykład `CL`:** *„Policyjna akcja Trzeźwość na drogach całego kraju. W Małopolsce zatrzymano w jeden poranek 47 nietrzeźwych kierowców"*.
* **Przykład `C`:** *„Zaostrzenie kar za przekroczenie prędkości o 50 km/h poza terenem zabudowanym"*.

## 07. Prawo i wymiar sprawiedliwości (`prawo_i_wymiar_sprawiedliwosci`)
* **Główne słowa kluczowe i encje:** sąd okręgowy, sąd rejonowy, wyrok, akt oskarżenia, proces sądowy, apelacja, odszkodowanie, kodeks pracy, kodeks cywilny, prawo spadkowe, zachowek, darowizna, Trybunał Konstytucyjny, Sąd Najwyższy, Rzecznik Praw Obywatelskich.
* **Przykład `L`:** *„Ruszył proces w sprawie katastrofy budowlanej w Katowicach. Przed Sądem Okręgowym zeznawali pierwsi świadkowie"*.

## 08. Zdrowie i opieka medyczna (`zdrowie_i_opieka_medyczna`)
* **Główne słowa kluczowe i encje:** szpital, SOR, oddział położniczy/onkologiczny, NFZ, kolejki do specjalistów, lekarz rodzinny POZ, recepta, refundacja leków, dyżury aptek, szczepienia, grypa, kleszcze, borelioza, badania profilaktyczne.
* **Przykład `L`:** *„Szpital Wojewódzki w Koszalinie otwiera po remoncie nowoczesny oddział kardiologii. Pacjenci zyskają dostęp do zabiegów bez wyjazdu do Szczecina"*.

## 09. Edukacja i nauka (`edukacja_i_nauka`)
* **Główne słowa kluczowe i encje:** szkoła podstawowa, liceum, technikum, rekrutacja do przedszkoli, matura, egzamin ósmoklasisty, wyniki egzaminów CKE, kuratorium oświaty, nauczyciele, ferie szkolne, uniwersytet, politechnika, stypendia, odkrycia naukowe.
* **Przykład `L`:** *„Ranking liceów i techników w Bydgoszczy i Toruniu. Sprawdź, które szkoły wypadły najlepiej na maturze"*.

## 10. Kultura i rozrywka (`kultura_i_rozrywka`)
* **Główne słowa kluczowe i encje:** koncert, festiwal, dni miasta, dożynki (część artystyczna), teatr, filharmonia, muzeum, wystawa, kino, premiera filmowa, książka, program telewizyjny, celebryci, gwiazdy estrady.

## 11. Sport (`sport`)
* **Główne słowa kluczowe i encje:** Ekstraklasa, 1. Liga, klasa okręgowa, A-klasa, mecz, wynik, tabela, transfer, trener, kibice, stadion, żużel (PGE Ekstraliga), siatkówka (PlusLiga), koszykówka, biegi uliczne, maraton, igrzyska.
* **Przykład `L`:** *„Derby Łodzi na remis! Widzew strzelił gola w doliczonym czasie gry po dramatycznej końcówce [OCENY PIŁKARZY]"*.

## 12. Styl życia i konsumpcja (`styl_zycia_i_konsumpcja`)
* **Główne słowa kluczowe i encje:** przepisy kulinarne, kuchnia regionalna, zakupy, Biedronka, Lidl, Dino, promocje, niedziele handlowe, godziny otwarcia sklepów, ogród, pielęgnacja roślin, porady domowe, moda, uroda.

## 13. Turystyka i wypoczynek (`turystyka_i_wypoczynek`)
* **Główne słowa kluczowe i encje:** szlaki w Tatrach/Bieszczadach/Karkonoszach, plaża nad Bałtykiem, sinice, kąpieliska, Mazury, noclegi, pensjonaty, zabytki, zamki, trasy rowerowe, gdzie na weekend z dziećmi.

## 14. Środowisko, pogoda i klimat (`srodowisko_pogoda_i_klimat`)
* **Główne słowa kluczowe i encje:** prognoza pogody, alert IMGW, burze z gradem, upał, mróz, śnieżyca, stan wód w rzekach, powódź, smog, normy pyłów PM10/PM2.5, wymiana kopciuchów, wywóz śmieci, opłaty za odpady, Lasy Państwowe, dziki w mieście, grzybobranie.

## 15. Rolnictwo i obszary wiejskie (`rolnictwo_i_obszary_wiejskie`)
* **Główne słowa kluczowe i encje:** żniwa, ceny skupu pszenicy/kukurydzy/rzepaku/malin/jabłek, trzoda chlewna, bydło, ASF, ptasia grypa, dopłaty bezpośrednie ARiMR, ekoschematy, KRUS, susza rolnicza, giełda rolna, koła gospodyń wiejskich.

## 16. Religia i Kościół (`religia_i_kosciol`)
* **Główne słowa kluczowe i encje:** parafia, archidiecezja, kuria biskupia, arcybiskup, zmiany księży i proboszczów, odpust parafialny, pielgrzymka na Jasną Górę, procesja Bożego Ciała, kolęda (wizyta duszpasterska), Watykan, papież.

## 17. Społeczeństwo i sprawy bytowe (`spoleczenstwo_i_sprawy_bytowe`)
* **Główne słowa kluczowe i encje:** demografia, liczba urodzeń i zgonów w gminie, seniorzy, kluby seniora, zbiórka charytatywna, WOŚP, wolontariat, historia miasta, archiwalne zdjęcia dzielnicy, skargi mieszkańców na hałas/czystość.

## 18. Świat i bezpieczeństwo międzynarodowe (`swiat_i_bezpieczenstwo_miedzynarodowe`)
* **Główne słowa kluczowe i encje:** wojna na Ukrainie, Bliski Wschód, NATO, armia, zakupy uzbrojenia, ćwiczenia wojskowe na poligonie, Komisja Europejska, wybory w USA/Niemczech/Francji, dyplomacja, granica państwowa.

---

# Rozdział 15. Pięć praktycznych studiów przypadku (Symulacja pełnej doby pracy z pulpitem PPGscope w redakcjach regionalnych, powiatowych i branżowych)

Aby pokazać, jak techniczne algorytmy opisane w poprzednich rozdziałach przekładają się na codzienną praktykę wydawniczą, poniżej przedstawiono pięć konkretnych scenariuszy operacyjnych z życia grupy Polska Press.

---

## Studium przypadku 1: Poranne kolegium redakcyjne i korekta „Jedynki" w dużym dzienniku wojewódzkim (*Gazeta Krakowska* vs *Dziennik Bałtycki*)

* **Godzina 07:45, Kraków:** Redaktor naczelny *Gazety Krakowskiej* otwiera pulpit PPGscope i włącza **Porównywarkę Mediów (`Gazeta Krakowska vs Dziennik Bałtycki`)** dla okna `24h` oraz `7d`.
* **Obserwacja na pulpicie:**
  * Widzi, że w ostatnich 7 dniach *Gazeta Krakowska* osiągnęła wysoki udział treści lokalnej `(L + CL)` na poziomie `71.4%`, ale w dziedzinie `02 Gospodarka i rynek` ustępuje *Dziennikowi Bałtyckiemu* o `-3.8 pkt proc.`.
  * Po przejściu do modułu **Radar Jedynek (Strona główna vs RSS)** zauważa, że na głównym slocie otwierającym `gazetakrakowska.pl` od godziny 23:15 poprzedniego dnia wisi ogólnopolski artykuł polityczny (`C`), którego bieżący współczynnik klikalności (CTR z Chartbeat) spadł do `0.6%`.
  * W tym samym czasie opublikowany o 07:10 rano autorski tekst lokalnego reportera o planach budowy nowej linii tramwajowej i wykupie działek w Krakowie (`04 Infrastruktura`, lokalność `L`) znajduje się dopiero na 9. pozycji pod załamaniem ekranu, a mimo to generuje już `380` jednoczesnych czytelników na żywo i średni czas czytania `142 sekundy`.
* **Decyzja w 30 sekund:** Wydawca strony głównej przenosi lokalny artykuł infrastrukturalny na pozycję nr 1 („jedynkę") i włącza na nim bramkę subskrypcyjną *Strefa Plus*. W ciągu kolejnych czterech godzin tekst sprzedaje 19 nowych subskrypcji.

---

## Studium przypadku 2: Audyt sieci powiatowej *NaszeMiasto* i ożywienie „uśpionego powiatu"

* **Godzina 10:30, Centrala Wydawnicza:** Dyrektor odpowiedzialny za sieć *NaszeMiasto* otwiera zakładkę **Żywotność i unikalność (546)** i filtruje portale o statusie `Niska unikalność (automat / klony)` oraz `Ledwo żywy`.
* **Obserwacja na pulpicie:**
  * System wskazuje grupę 14 mniejszych serwisów powiatowych, w których mimo publikowania średnio 15 artykułów dziennie **Indeks Żywotności spadł poniżej 30/100**.
  * Po kliknięciu przycisku **Sonda live** przy wybranym portalu powiatowym system w 300 milisekund pobiera jego strumień RSS i pokazuje diagnozę: `Unikalność lokalna: 5.0% (1/20 tekstów), Klony sieciowe: 95.0%, Publikacje w pełnych kwadransach crona (:00/:15): 80.0%`.
  * Po nałożeniu danych z Google Search Console widać, że Google przestało indeksować 70% nowych adresów URL na tej subdomenie z powodu duplikacji treści z innymi portalami grupy.
* **Decyzja zarządcza:** Wyłączenie automatycznego rozsyłania niepowiązanych geograficznie tekstów poradnikowych na tę grupę domen i wprowadzenie zasady, że na subdomenę powiatową trafiają wyłącznie materiały z danego województwa oraz minimum 3 autentyczne wiadomości z powiatu dziennie (oparte na biuletynach lokalnego samorządu, komendy powiatowej PSP/Policji i lokalnego sportu). Po 30 dniach wskaźnik unikalności wraca do poziomu `48%`, a ruch z wyszukiwarki Google odbija o `+42%`.

---

## Studium przypadku 3: Pilnowanie symetrii i standardów dziennikarskich w tematyce politycznej w okresie przedwyborczym

* **Godzina 14:00, Kolegium Grupy:** Zespół nadzoru redakcyjnego przegląda zakładkę **Wydźwięk polityczny** oraz wskaźniki pluralizmu w 20 dziennikach regionalnych.
* **Obserwacja na pulpicie:**
  * W szesnastu dziennikach rozkład publikacji politycznych mieści się we wzorcowym korytarzu sprawozdawczym: odsetek tekstów neutralnych wynosi od `58%` do `66%`, a wskaźnik wielogłosowości wewnątrztekstowej przekracza `60%`.
  * W jednym z dzienników regionalnych system sygnalizuje jednak odchył: w ciągu ostatnich 14 dni udział publikacji o wydźwięku pozytywnym wobec władz samorządowych i wojewódzkich wzrósł do `46%` przy spadku tekstów kontrolnych i krytycznych do `9%` (`Watchdog Accountability Index` spadł na poziom alarmowy).
  * Kliknięcie w listę artykułów dowodowych (`MetricProof`) natychmiast wyjaśnia przyczynę: lokalny dział miejski opublikował w ciągu dwóch tygodni serię 18 artykułów o inwestycjach miejskich przepisanych bezpośrednio z komunikatów biura prasowego urzędu miasta, bez zadania pytań o opóźnienia harmonogramu i bez przytoczenia uwag radnych opozycji oraz mieszkańców.
* **Decyzja redakcyjna:** Redaktor naczelny wprowadza zasadę, że każdy komunikat inwestycyjny z ratusza lub urzędu marszałkowskiego musi zostać przed publikacją uzupełniony o weryfikację kosztów, terminu oraz głos mieszkańców lub opozycji w radzie miasta. W kolejnym tygodniu równowaga sprawozdawcza wraca do normy bez żadnego ręcznego sterowania politycznego – wyłącznie dzięki egzekwowaniu rzemiosła dziennikarskiego.

---

## Studium przypadku 4: Specjalizacja serwisów tematycznych (*Strefa Biznesu* vs *Strefa Agro*)

* **Godzina 16:00, Redakcja Serwisów Horyzontalnych:** Wydawca zestawia w porównywarce `strefabiznesu.pl` (Medium A) oraz `strefaagro.pl` (Medium B).
* **Obserwacja na pulpicie:**
  * Porównywarka pokazuje wyraźną i zdrową polaryzację tematyczną: w *Strefie Biznesu* dominują dziedziny `02 Gospodarka i rynek` (`46.2%`) oraz `03 Finanse osobiste i świadczenia` (`24.8%`), natomiast w *Strefie Agro* dziedzina `15 Rolnictwo i wieś` stanowi `62.4%` wszystkich publikacji (`+60.6 pkt proc.` przewagi nad *Strefą Biznesu*).
  * Również lista najczęściej cytowanych decydentów w pełni odpowiada profilowi obu portali: w *Strefie Biznesu* na czele znajdują się minister finansów i kierownictwo resortów gospodarczych, podczas gdy w *Strefie Agro* dominują minister i wiceministrowie rolnictwa oraz szefowie izb rolniczych.
  * Jednocześnie system pokazuje w karcie `Lokalność (L / CL / C)`, że te artykuły w *Strefie Agro*, które zawierają konkretne cenniki z regionalnych giełd rolnych i powiatów (`CL`), mają o `85%` dłuższy czas czytania niż ogólne komunikaty z Warszawy (`C`).

---

## Studium przypadku 5: Reakcja na nagłe wydarzenie kryzysowe w regionie (Pętla gorąca 60-sekundowa)

* **Godzina 18:12, Województwo Śląskie:** W dużej fabryce w powiecie gliwickim dochodzi do pożaru.
* **Przebieg w PPGscope:**
  * **18:14:** Kolektor zewnętrzny wykrywa komunikat Komendy Wojewódzkiej PSP oraz skok zapytań z województwa śląskiego.
  * **18:16:** Reporter *Dziennika Zachodniego* publikuje pierwszą krótką relację lokalną (`05 Przestępczość i służby`, lokalność `L`), która dzięki webhookowi z CMS pojawia się w PPGscope w ciągu 15 sekund.
  * **18:22:** Sonda DOM potwierdza, że temat znajduje się na pozycji nr 1 strony głównej `dziennikzachodni.pl` oraz `gliwice.naszemiasto.pl`. Licznik aktywnych czytelników na żywo przekracza `4 200 osób`.
  * **18:45–19:30:** Moduł `ArticleVersionTracker` rejestruje 4 kolejne aktualizacje tytułu i dopisywanie nowych akapitów ze zdjęciami z miejsca zdarzenia.
  * **21:00:** Konektor monitoringu mediów zewnętrznych (IMM) odnotowuje, że trzy ogólnopolskie stacje telewizyjne i cztery portale horyzontalne zacytowały *Dziennik Zachodni* jako pierwsze źródło informacji z miejsca zdarzenia.

---

# Rozdział 16. Specyfikacja niezawodności produkcyjnej (SLA 99.9%), procedury awaryjne (Failover), testy akceptacyjne i słownik pojęć

## 16.1. Odporność na awarie i ciągłość działania (Graceful Degradation & Failover)

System monitorujący 546 mediów w czasie rzeczywistym musi działać nieprzerwanie nawet wtedy, gdy pojedynczy zewnętrzny dostawca (np. API modelu językowego, pojedynczy serwer RSS lub zewnętrzna hurtownia analityczna) ma chwilową przerwę techniczną. W PPGscope zastosowano architekturę wielopoziomowej ciągłości działania:

1. **Automatyczny Failover klasyfikatora AI:**
   Jeżeli zewnętrzne API `Gemini` przekroczy czas odpowiedzi `2500 ms` lub zwróci błąd przeciążenia (`HTTP 429 / 503`), potok klasyfikacji nie zatrzymuje się ani na sekundę – automatycznie przełącza się na lokalny deterministyczny silnik reguł Taksonomii v2.0 oraz lokalny model NLI, oznaczając artykuły do ponownego przeliczenia w tle po ustąpieniu awarii.
2. **Buforowanie agregatów i praca bezprzestojowa interfejsu:**
   Pulpit webowy (`web/app/page.tsx`) korzysta z wielowarstwowej pamięci podręcznej: przeliczone kostki agregatów dla wszystkich 546 mediów i 6 okien czasowych (`24h`, `7d`, `30d`, `90d`, `1y`, `all`) są serwowane z czasem odpowiedzi poniżej `30 milisekund`. Nawet w trakcie ciężkiego przeliczania bazy danych użytkownik widzi natychmiastowo działające wykresy i porównywarkę `Medium A vs Medium B`.
3. **Izolacja błędów pojedynczych domen:**
   W sieci 546 serwisów zawsze może zdarzyć się, że pojedyncza domena powiatowa ma problem z serwerem lub certyfikatem SSL. Kolektor asynchroniczny izoluje taką domenę w osobnej kolejce ponowień z wykładniczym odstępem czasu (`Exponential Backoff`), dzięki czemu awaria jednego portalu nigdy nie opóźnia pobierania danych z pozostałych 545 serwisów.

---

## 16.2. Zestaw automatycznych testów weryfikacyjnych (Acceptance Test Suite)

Każda zmiana w kodzie systemu PPGscope przechodzi przed wdrożeniem przez zestaw 33 automatycznych testów jednostkowych, integracyjnych i regresyjnych (`pytest` w katalogu `tests/` oraz kontrolę typów TypeScript i kompilację produkcyjną Next.js):

* `tests/test_classifier.py` – weryfikuje kompletność 18 dziedzin taksonomii v2.0 oraz 8 kanonicznych przypadków brzegowych (pożar w Tarnowie, koniec WIBOR, najwyższa emerytura na podium i ze Śląska, szpital w Grudziądzu, papież i Putin, ustawa o social mediach, remis Widzew–Wisła).
* `tests/test_dedup_minhash.py` – sprawdza dokładność 128-funkcyjnego algorytmu MinHash i wykrywanie klastrów syndykacyjnych.
* `tests/test_extractor.py` oraz `tests/test_intelligence_suite.py` – testują ekstrakcję HTML/JSON-LD, wykrywanie znaczników paywalla *Strefa Plus*, materiałów sponsorowanych, wzorców `Discover Bait`, instytucji powiatowych TERYT, klasyfikację żywotności portali (`PortalVitalityAuditor`), Radar Jedynek (`HomepageRadar`) oraz śledzenie mutacji nagłówków (`ArticleVersionTracker`).
* `tests/test_trend_stats.py` – weryfikuje dwupróbowy test Z dla proporcji, blokadę małej próby (`N < 30`), korektę Benjaminiego-Hochberga (FDR), sumowanie się rozkładów do `100.0%` oraz zróżnicowanie obsady polityków i rozkładów 18 dziedzin pomiędzy poszczególnymi mediami i przedziałami czasu.
* `tests/test_connectors.py`, `tests/test_proof_models.py`, `tests/test_robots.py`, `tests/test_sitemaps_and_rss.py` – sprawdzają kontrakty konektorów zewnętrznych i wewnętrznych, obiekty dowodowe `MetricProof`, parsery `robots.txt` oraz parsery kanałów RSS i map Google News.

---

## 16.3. Pełny słownik pojęć dla Zarządu i Redakcji

| Termin w PPGscope | Wyjaśnienie w prostym języku wydawniczym |
| :--- | :--- |
| **Taksonomia 18 Dziedzin (v2.0)** | Wspólny dla wszystkich 546 portali podział tematyczny artykułów na 18 kategorii, pozwalający porównać każdy serwis z każdym bez względu na to, jak nazwane są działy w menu danego portalu. |
| **Lokalność `L` (Czysto lokalne)** | Materiał opisujący wydarzenia, decyzje, inwestycje lub ludzi bezpośrednio z miasta, powiatu lub województwa obsługiwanego przez dany portal. |
| **Lokalność `CL` (Centralne z rozwinięciem lokalnym)** | Temat ogólnopolski (np. nowa ustawa, waloryzacja, program rządowy), do którego lokalna redakcja dopisała własne dane, przykłady lub komentarze z regionu. |
| **Lokalność `C` (Centralne)** | Tekst ogólnokrajowy lub zagraniczny bez żadnego odniesienia do regionu czytelnika (lub przedruk z innego województwa oznaczony flagą `other_region`). |
| **Udział treści lokalnej `(L+CL)/wszystkie`** | Główny miernik zakorzenienia portalu w regionie – odsetek wszystkich tekstów, które mają wymiar lokalny lub zlokalizowany. |
| **Wskaźnik lokalizacji `CL/(C+CL)`** | Miernik pracowitości redakcji przy pracy z depeszami – pokazuje, jaki ułamek tematów ogólnopolskich redakcja przerabia na kontekst lokalny, zamiast wrzucać surową depeszę. |
| **Indeks Żywotności (`Vitality Score 0–100`)** | Syntetyczna ocena zdrowia portalu łącząca unikalność tekstów, dzienną liczbę publikacji, liczbę dziennikarzy podpisanych z imienia i nazwiska, świeżość ostatniego tekstu oraz brak uzależnienia od automatycznych zrzutów z crona. |
| **Klon syndykacyjny (MinHash Clone)** | Artykuł powielony w identycznej lub niemal identycznej formie (`podobieństwo >= 85%`) na wielu portalach grupy Polska Press. |
| **Portal Origin (Twórca kaskady)** | Redakcja, która jako pierwsza w grupie napisała i opublikowała materiał skopiowany później przez inne serwisy. |
| **Zrzut z automatu (`Cron Slot`)** | Publikacja wpadająca na stronę dokładnie w pełnych kwadransach zegarowych (`:00`, `:15`, `:30`, `:45`), zdradzająca działanie automatycznego skryptu publikacyjnego zamiast żywego redaktora. |
| **Luka Agendy (`Agenda Gap Score`)** | Różnica między tym, jakie tematy redaktor wydania eksponuje ręcznie w czołówce strony głównej (Top 5), a tym, co masowo wpada do kanału RSS portalu. |
| **Discover Bait** | Nagłówek skonstruowany pod algorytm Google Discover z celową luką informacyjną (np. *„W tym powiecie od poniedziałku kontrole..."* zamiast podania nazwy powiatu w tytule). |
| **Wskaźnik Funkcji Kontrolnej (`Watchdog Index`)** | Miernik sprawdzający, czy media zachowują zdrowy dystans i funkcję kontrolną wobec rządzących (centralnie i w samorządzie), unikając przekształcenia się w tablicę ogłoszeń urzędowych. |
| **Wskaźnik Pluralizmu Wewnątrztekstowego** | Odsetek artykułów politycznych i społecznych, w których przytoczono racje co najmniej dwóch różnych stron sporu. |
| **Dowód wskaźnika (`MetricProof`)** | Zasada gwarantująca, że za każdym procentem i wykresem w PPGscope stoi jawny ułamek liczbowy oraz lista konkretnych artykułów źródłowych z linkami. |
