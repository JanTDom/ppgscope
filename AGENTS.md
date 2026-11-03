# Reguły kardynalne projektu PPGscope (AGENTS.md)

Projekt **PPGscope** służy do śledzenia, audytu i analizy obecności oraz oddziaływania mediów Polska Press Grupa (PPG) w sieci, struktury tematycznej ich publikacji oraz wydźwięku polityczno-społecznego.

---

## 1. Stałe połączenie z folderem dodatkowym materiałów PPG

> [!IMPORTANT]
> Projekt PPGscope jest na stałe połączony z zewnętrznym folderem materiałów:
> **`/Users/macbookpro/Dropbox/POLSKAPRESS`**
> Dostęp lokalny w repozytorium przez symlink: `sources/dropbox_polskapress` oraz `external_polskapress`.

### Zasady korzystania z folderu dodatkowego:
1. **Tożsamość folderu:** To nie jest folder kodu ppgscope, lecz obszerny, zewnętrzny zasób materiałów o PPG (analizy zarządcze, ekspertyzy dla MAP, dokumentacja transformacji, umowy, statuty, wyceny, badania makroregionów, projekty systemowe m.in. AI-telier, koncepcje Polskiej Grupy Informacyjnej oraz materiały historyczne).
2. **Status w projekcie:** Traktuj go jako stały folder dodatkowy i bazę wiedzy dziedzinowej. Wszelkie analizy, raporty i weryfikacje faktograficzne w PPGscope mogą i powinny czerpać z tych materiałów źródłowych.
3. **Nienaruszalność zasobu (Read-Only by default):** Nigdy nie usuwaj, nie przenoś ani nie nadpisuj oryginalnych dokumentów w folderze Dropbox, chyba że użytkownik wyda bezpośrednie, jednoznaczne polecenie dotyczące konkretnego pliku.
4. **Higiena repozytorium:** Symlinki `sources/dropbox_polskapress` i `external_polskapress` są wykluczone z commita w `.gitignore` — repozytorium kodu nie przechowuje ciężkich binariów DOCX/PDF z Dropboxa.

---

## 2. Kanon inżynierski i prawda danych (Data Provenance)
- **Prawda danych ponad wszystko:** Każda metryka liczbowa musi posiadać status dowodowy (`MetricProof`: `POMIAR`, `PRZYBLIŻENIE`, `SZACUNEK`) oraz źródło i wielkość próby ($N$).
- **Zero halucynacji:** Zakaz zmyślania domen, parametrów, cytatów czy liczb.
- **Kanon edytorski i wizualny:** Kobalt prasowy (`#0f4c81`) jako kolor wiodący, cyfry tabelaryczne `tabular-nums`, rygorystyczna hierarchia typograficzna, brak infantylnych emoji w widokach profesjonalnych.
