# PPGscope

Aplikacja webowa do bieżącego śledzenia obecności i oddziaływania mediów Polska Press Grupa (PPG) w sieci oraz struktury tematycznej ich publikacji w rozbiciu na tytuły i w czasie.

## Układ repozytorium

| Katalog | Zawartość |
| --- | --- |
| `web/` | Panel (Next.js, React, Tailwind). Jedyna część wdrażana na Vercel. |
| `ppgscope/` | Silnik w Pythonie: konektory, ingest, deduplikacja (MinHash), klasyfikator, statystyka. |
| `tests/` | Testy Pythona (`pytest`). |
| `scripts/` | Skrypty jednorazowe i porządkowe do budowy danych. |
| `supabase/` | Migracje bazy. |
| `DECISIONS.md` | Rejestr decyzji (ADR). |

## Uruchomienie panelu

```bash
cd web
npm ci
npm run dev        # http://localhost:3000
```

Panel wymaga zmiennych środowiskowych (plik `web/.env.local`, nigdy w repozytorium):

| Zmienna | Do czego |
| --- | --- |
| `PPGSCOPE_AUTH_PASSWORD` | Hasło dostępu do panelu. |
| `PPGSCOPE_AUTH_SECRET` | Sekret podpisu sesji, minimum 32 znaki. |
| `GEMINI_API_KEY` lub `PPGSCOPE_GEMINI_API_KEY` | Klasyfikator AI (opcjonalny). |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Odczyt z bazy (opcjonalny). |
| `SUPABASE_SERVICE_ROLE_KEY` | Zapis ingestu, wyłącznie po stronie serwera. |
| `CRON_SECRET` | Zabezpiecza `/api/cron/ingest` (Vercel Cron, co 15 minut). |
| `INGEST_MAX_SOURCES` | Limit źródeł na jedno uruchomienie ingestu. |

Klucze nigdy nie trafiają do przeglądarki. Okno Ustawienia pokazuje tylko, czy konfiguracja serwerowa jest aktywna.

## Dane wewnętrzne

W oknie Ustawienia (ikona zębatki) można wczytać plik CSV albo wkleić wiersze `url,pageviews,engaged_time_sec,strefa_plus_conversions` (GA4, GSC, Piano Strefa Plus i inne zrzuty). Dane zasilają adapter w panelu analitycznym i żyją tylko w sesji przeglądarki.

## Testy i kontrola jakości

```bash
cd web && npm test && npm run lint && npx tsc --noEmit
cd .. && .venv/bin/python -m pytest -q
```

## Wdrożenie

Projekt Vercel jest powiązany z katalogiem `web/` (`web/.vercel`). Wdrożenie produkcyjne: `cd web && vercel deploy --prod`.
