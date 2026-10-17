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
