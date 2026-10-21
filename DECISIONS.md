# Rejestr decyzji architektonicznych i technicznych (DECISIONS.md)

Dokument zawiera spis kluczowych decyzji podjętych w projekcie **PPGscope**, zgodnie ze standardem rzemiosła inżynierskiego Fable 5.1 i filozofią prawdy danych.

---

## ADR-001: Weryfikacja domen i źródeł PPG bez zgadywania

* **Data:** 2026-10-17
* **Status:** PRZYJĘTE I ZWERYFIKOWANE EMPIRYCZNIE
* **Kontekst:** Zgodnie z zakazem bezwzględnym: „NIE wymyślaj domen, adresów RSS, sitemap, endpointów API, nazw tytułów ani parametrów. Każdy adres musi być wykryty i zweryfikowany odpowiedzią HTTP 200”.
* **Decyzja:** Przeprowadzono bezpośrednie skanowanie 35 kandydatów na domeny Polska Press Grupa pod kątem `robots.txt`, `/google_news/`, `/sitemapa/` oraz `/rss`.
* **Wynik empiryczny:**
  - 34 domeny zwróciły kod HTTP 200 na `robots.txt`, `google_news` i `/rss`.
  - Domena `polskatimes.pl` zwróciła HTTP 410 Gone (została zastąpiona w portfolio przez portal `i.pl`). Została oznaczona w rejestrze jako archiwalna/wycofana, zgodnie z zasadą „brak danych to informacja”.
  - Pliki `robots.txt` jednoznacznie deklarują mapy witryn (`/sitemapa/` oraz `/google_news/`) i zezwalają na indeksowanie pod warunkiem transparentnego nagłówka User-Agent.

---

## ADR-002: Model metryki z dowodem (Data Provenance & MetricProof)

* **Data:** 2026-10-17
* **Status:** PRZYJĘTE
* **Kontekst:** Filozofia projektu wymaga: „Prawda danych ponad wszystko. Aplikacja nigdy nie pokazuje liczby, której nie potrafi udowodnić. Każda wartość ma źródło, datę pomiaru i status: POMIAR, PRZYBLIŻENIE albo SZACUNEK”.
* **Decyzja:** Każda wartość liczbowa, statystyka, udział czy wskaźnik trendu w aplikacji jest opakowany w strukturę `MetricProof`:
  - `value`: wartość liczbowa lub wynikowa,
  - `status`: jeden z trzech stanów: `POMIAR` (bezpośrednie zliczenie/odczyt), `PRZYBLIŻENIE` (obliczenie statystyczne/estymacja na próbie), `SZACUNEK` (model/prognoza),
  - `source`: nazwa konektora / źródła bazowego,
  - `measured_at`: sygnatura czasowa pomiaru (ISO 8601, strefa `Europe/Warsaw`),
  - `sample_size`: wielkość próby ($N$),
  - `methodology_version`: wersja reguły metodologicznej (np. `v1.0.0`),
  - `p_value` i `is_significant`: dla testów trendu.

---

## ADR-003: Deduplikacja i wykrywanie tekstów wspólnych (MinHash + LSH)

* **Data:** 2026-10-17
* **Status:** PRZYJĘTE
* **Kontekst:** PPG publikuje te same depesze i teksty w kilkunastu dziennikach regionalnych i serwisach miejskich. Bez deduplikacji profile redakcji ulegają zafałszowaniu.
* **Decyzja:** 
  - Tokenizacja znormalizowanej treści artykułu (oczyszczonej ze znaczników HTML i stopek redakcyjnych).
  - Wyliczenie sygnatur MinHash (domyślnie 128 permutacji) z wykorzystaniem biblioteki `datasketch`.
  - Indeksowanie LSH z progiem podobieństwa Jaccarda $J \ge 0.80$.
  - Wyznaczenie pierwotnej publikacji (`first_published_url` / najwcześniejszy `published_at`).
  - Publikacje wtórne oznaczane jako `TEKST WSPÓLNY` z odnośnikiem do oryginału.
  - Wyliczanie profilu tematycznego redakcji w dwóch wariantach: „cała produkcja” i „tylko teksty własne”.

---

## ADR-004: Stała taksonomia tematyczna v1.0.0 i obsługa INNE/NIEOKREŚLONE

* **Data:** 2026-10-17
* **Status:** PRZYJĘTE
* **Kontekst:** Wymóg poziomu 1: wersjonowana taksonomia, główny temat, do 2 tematów pobocznych, pewność (0–1), obowiązkowa kategoria INNE/NIEOKREŚLONE w razie braku pewności.
* **Decyzja:** Zdefiniowano plik konfiguracyjny `taxonomy_v1.json` obejmujący 12 kategorii głównych + `INNE/NIEOKREŚLONE`. Wzorzec projektowy Strategy dla klasyfikatorów (`TopicClassifier`) umożliwiający zamianę silnika regułowego, wektorowego lub LLM bez modyfikacji reszty systemu.

---

## ADR-005: Statystyka trendów z testem istotności i korektą Benjamini–Hochberg

* **Data:** 2026-10-17
* **Status:** PRZYJĘTE
* **Kontekst:** Zgodnie z pkt. 3.4 specyfikacji, oznaczenie „rośnie/spada” wymaga istotności statystycznej przy minimalnej próbie (domyślnie min. 10 artykułów w okresie) oraz kontroli FDR (False Discovery Rate) przy wielu testach.
* **Decyzja:**
  - Udziały procentowe prezentowane jako główna metryka, liczby bezwzględne obok.
  - Test różnicy dwóch proporcji (dwumianowy z-test) z poziomem $\alpha = 0.05$.
  - Korekta Benjamini–Hochberg na listach wielu jednoczesnych porównań tytuł × temat.
  - Podział okresów: dzień, tydzień ISO, miesiąc w strefie `Europe/Warsaw`.

---

## ADR-006: Modularny interfejs konektorów i brak danych

* **Data:** 2026-10-17
* **Status:** PRZYJĘTE
* **Kontekst:** Architektura musi wspierać rozbudowę o konektory płatne i wewnętrzne bez refaktoryzacji widoków i logiki.
* **Decyzja:** 
  - Abstrakcyjna klasa bazowa `BaseConnector` definiująca: `name`, `access_tier` (`DARMOWY` / `PŁATNY` / `WEWNĘTRZNY`), `measured_metrics`, `frequency`, `reliability`, metodę `health_check()`.
  - Trzy zaimplementowane konektory bazowe:
    1. `PPGWebPublicConnector` (Darmowy - publiczne sitemapy, RSS i HTML PPG).
    2. `ExternalMonitoringConnector` (Płatny - nieaktywny w przypadku braku klucza, zgłasza jawny status `NIEAKTYWNY: Brak klucza licencyjnego`).
    3. `InternalAnalyticsConnector` (Wewnętrzny - nieaktywny w przypadku braku uprawnień GA4/Gemius).
  - Wskaźniki pokrycia danych w UI (np. „1 z 3 konektorów aktywny”).

---

## ADR-007: Audyt żywotności i unikalności 546 portali oraz 6 modułów wywiadu redakcyjnego

* **Data:** 2026-10-18
* **Status:** PRZYJĘTE I WDROŻONE
* **Kontekst:** Użytkownik zlecił rozbudowę systemu o wykrywanie realnej aktywności i unikalności tekstowej w sieci 546 portali PPG (odróżnienie żywych redakcji od klonów syndykacyjnych, portali ledwo żywych, automatów cronowych i domen wygaszonych) oraz wdrożenie 6 modułów wywiadu redakcyjnego opartych na zewnętrznych danych bezpłatnych z gotowymi gniazdami pod konektory wewnętrzne i płatne.
* **Decyzja:**
  1. **Audyt żywotności i unikalności portali (`PortalVitalityAuditor` + `/api/vitality/probe`):**
     - Pięciostopniowa klasyfikacja: `AKTYWNY_UNIKALNY` ($\ge 10$ art./dobę, unikalność $\ge 35\%$), `AKTYWNY_SYNDYKAT` ($\ge 10$ art./dobę, unikalność $< 35\%$), `LEDWO_ZYWY` ($< 5$ art./dobę lub luka publikacyjna $> 18\text{ h}$), `ZOMBIE_AUTOMAT` ($\ge 65\%$ publikacji w pełnych minutach crona `:00`/`:15`/`:30`/`:45` przy unikalności $< 15\%$), `MARTWY` (HTTP 404/410/5xx lub brak publikacji $> 72\text{ h}$, np. `polskatimes.pl` HTTP 410).
     - Sonda na żywo (`/api/vitality/probe`) odpytuje bezpłatnie kanały `/rss`, `/google_news/` oraz drzewo DOM strony głównej wybranego portalu.
  2. **Sześć modułów wywiadu redakcyjnego (`ppgscope/ingest/intelligence.py` + `ppgscope/ingest/extractor.py`):**
     - **Radar Ekspozycji Stron Głównych (Share of Voice):** cykliczne zrzuty strefy Above-the-Fold (`LEAD_MAIN`, `TOP_GRID`, `SUB_STREAM`) i konfrontacja wolumenu RSS z realną ekspozycją na jedynkach.
     - **Detektor Mutacji i Wycofywania Tekstów:** porównywanie rewizji artykułu w oknie 48h (zmiany tytułów A/B, edycje leadu/korpusu, pośmiertne zamknięcie za paywallem, usunięcia HTTP 404/410).
     - **Mapa Monetyzacji, Paywalla i Discover Bait:** ekstrakcja flag `isAccessibleForFree` w JSON-LD (`Strefa Plus`), znaczników `rel="sponsored"` / „Materiał partnera” oraz wzorców nagłówków pod Google Discover.
     - **Mapa Białych Plam Powiatowych (380 powiatów TERYT):** zestawienie publikacji z lokalnymi instytucjami (`Urząd Gminy`, `Starostwo`, `KPP`, `PSP`) z rejestrem GUS TERYT.
     - **Zewnętrzny Rezonans i Indeks Pierwotności (Original Scoops vs Echo):** pomiar cytowań w Google News / Wikipedia Current Events / GDELT 2.0.
     - **Puls Redakcji i Struktura Autorstwa:** profilowanie byline (`named`, `anonymous`, `wire`, `partner`) i rozkładu godzinowego (zmiana dzienna vs nocny automat cron).

---

## ADR-008: Przegląd zarządczy 7:30, radar starzenia się jedynek, audyt `rel="canonical"`, benchmarking miejski 1:1 i adapter danych wewnętrznych

* **Data:** 2026-10-18
* **Status:** PRZYJĘTE I WDROŻONE
* **Kontekst:** Użytkownik zlecił wdrożenie pakietu zarządczego opartego na danych zewnętrznych z gotowym pomostem pod dane wewnętrzne (`Wdróż i wypchnij 1`):
  1. Radar szybkości reakcji i starzenia się „jedynek” (`HomepageStalenessAnalyzer`),
  2. Śledzenie kaskady syndykacji („Kto żywi sieć, a kto bierze”) oraz wewnętrznej kanibalizacji SEO w Google (`SyndicationCanonicalAuditor`),
  3. Zestawienie 1:1 z lokalnym konkurentem w regionie w rozbiciu na dziedziny taksonomii v2.0 (`RegionalCompetitorBenchmarkAnalyzer`),
  4. Automatyczny przegląd poranny 7:30 dla zarządu i naczelnych wraz z interaktywną Kartą Celów Kwartalnych i SLA (`Executive Scorecard`) oraz Adapterem Danych Wewnętrznych (`URL Matcher` pod GA4 / GSC / Piano *Strefa Plus*).
* **Decyzja:**
  - Rozbudowano moduł `ppgscope/ingest/intelligence.py` o klasy `HomepageStalenessAnalyzer`, `SyndicationCanonicalAuditor` i `RegionalCompetitorBenchmarkAnalyzer` z pełnymi dowodami `MetricProof` (`v2.2.0`).
  - W generatorze `scripts/editorial_intelligence_builder.py` oraz `scripts/generate_full_scale_aggregates.py` wyliczono kompletne zestawy danych dla 20 dzienników regionalnych, portalu `i.pl`, 8 kluczowych pojedynków konkurencyjnych oraz 546 domen sieci.
  - W aplikacji `web/app/page.tsx` dodano dedykowaną zakładkę główną **„Przegląd zarządczy i KPI (7:30)”** (`activeTab === "executive_briefing"`) oraz 3 nowe podmoduły w zakładce **„Wskaźniki Wywiadu”** (`staleness_radar`, `canonical_syndication`, `competitor_1to1`).

---

## ADR-009: Rzetelne ważenie wydźwięku politycznego i siły oddziaływania mediów (Dual-View i koszyki regionalne)

* **Data:** 2026-10-21
* **Status:** PRZYJĘTE I WDROŻONE PRODUKCYJNIE
* **Kontekst:** Wychylenie polityczne mediów Polska Press nie może być traktowane jednowymiarowo: pojedynczy artykuł na małym portalu miejskim ma inną siłę społecznego oddziaływania niż czołówka na ogólnopolskim portalu `i.pl` czy w wiodącym dzienniku regionalnym (`Gazeta Krakowska`, `Dziennik Bałtycki`, `Dziennik Zachodni`). Z drugiej strony, sztuczne przypisywanie wag „z sufitu” naruszałoby kardynalną zasadę prawdy danych.
* **Decyzja:**
  1. **Dual-View (Rozdzielenie intencji redakcji od siły dotarcia):**
     - **Linia redakcyjna (Co produkuje wydawca?):** tryb surowy `raw` (1 art = 1 głos). Status `POMIAR`. Odpowiada na pytanie o czystą linię redakcyjną.
     - **Ekspozycja strony głównej (Share of Voice Above-the-fold):** tryb `homepage_exposure`. Status `POMIAR`. Wagi wynikające wprost z audytu HTML strefy czołówek (`LEAD_MAIN` 5.0×, `TOP_GRID` 2.5×, `SUB_STREAM` 1.0×, podstrony 0.3×).
     - **Zasięg audytorium (Mediapanel PBI/Gemius Q3 2026):** tryb `audience_reach`. Status `PRZYBLIŻENIE`. Wagi oparte na oficjalnych badaniach widowni: `i.pl` (8.5×, ~6.8 mln RU), dzienniki regionalne (3.0×–4.8×, ~1.5–3.2 mln RU), serwisy tematyczne (1.8×), serwisy miejskie (0.8×).
     - **Odsłony rzeczywiste (GA4 / Piano Strefa Plus):** tryb `telemetry`. Status `POMIAR`. Obliczenia wprost z pliku telemetrycznego użytkownika.
  2. **Separacja koszyków regionalnych:**
     - Możliwość izolacji tradycyjnych dzienników regionalnych (`DZIENNIKI`) od sieci miejsko-powiatowej (`POWIATY`), eliminująca efekt rozmywania lokalnego dyskursu przez masowe kaskady depesz syndykowanych.
  3. **Wskaźnik przesunięcia ważonego (`shift_delta`):**
     - Jawne prezentowanie w kartach KPI i selektorze sił politycznych różnicy między saldem surowym a ważonym wraz z pełną notą metodologiczną `WeightingProvenance` (standard `v2.4.0`).




