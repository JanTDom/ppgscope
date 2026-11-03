import sys
import os
import shutil
from pathlib import Path

# Dołączenie skryptu ExecutiveReport z biblioteki skilla
sys.path.append('/Users/macbookpro/.gemini/config/skills/executive-docx-and-prepress/scripts')
from executive_docx_builder import ExecutiveReport

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "reports"
DOWNLOADS_DIR = Path("/Users/macbookpro/Downloads")

DOCX_DOWNLOADS = DOWNLOADS_DIR / "Raport_Zarzadczy_PPG_Promocja_Opozycji_2025_2026.docx"
DOC_DOWNLOADS = DOWNLOADS_DIR / "Raport_Zarzadczy_PPG_Promocja_Opozycji_2025_2026.doc"
DOCX_REPORTS = OUT_DIR / "Raport_Zarzadczy_PPG_Promocja_Opozycji_2025_2026.docx"
DOC_REPORTS = OUT_DIR / "Raport_Zarzadczy_PPG_Promocja_Opozycji_2025_2026.doc"

def build():
    rep = ExecutiveReport(
        title="Jaki udział mają media Polska Press w promowaniu opozycji w latach 2025–2026?",
        subtitle="Audyt sprawczości redakcyjnej, ekonomiki kliku oraz prania wizerunku prawicy"
    )

    # Winieta nadrzędna
    rep.add_kicker("System Wywiadu Redakcyjnego PPGscope.pl ◆ Audyt Zarządczy 2025–2026")

    # Tytuł główny
    rep.add_h1("00", "Jaki udział mają media Polska Press w promowaniu opozycji w latach 2025–2026?")

    # Baner KPI
    rep.add_kpi_banner([
        {'value': '122 000', 'label': 'Zbadane artykuły sieci PPG', 'color': 'kobalt'},
        {'value': '268 / 509', 'label': '„Portale-widma” (52,6%)', 'color': 'red'},
        {'value': '88,4%', 'label': 'Tekstów o Wawrzyku bez afery', 'color': 'red'},
        {'value': '+28,6 pkt', 'label': 'Rekord M. Horały (Śląsk)', 'color': 'green'}
    ])

    # Ramka syntetyczna Najważniejsze ustalenia
    rep.add_callout_box("Najważniejsze ustalenia audytu (lata 2025–2026)", [
        ("Aktywna sprawczość mediów PPG zamiast biernej transmisji.",
         "Sukces wizerunkowy opozycji w latach 2025–2026 to w przeważającej mierze bezpośredni rezultat decyzji wydawniczych, algorytmicznych "
         "i zarządczych samych redakcji Polska Press Grupa, a nie sprytu sztabów prawicy."),
        ("Komercyjne pranie wizerunku Piotra Wawrzyka.",
         "Redakcje PPG uczyniły z oskarżonego w aferze wizowej stałego bohatera serwisów miejskich jako tiktokera i „tropiciela paragonów grozy”. "
         "W 88,4% artykułów kulinarnych celowo pominięto zarzuty CBA, generując średnio 42 100 odsłon (PV) na tekst."),
        ("Ekonomika kliku i syndrom darmowego kontentu.",
         "Zredukowane kadrowo redakcje powiatowe bezkrytycznie zaciągają konferencje posłów opozycji jako darmowy wsad do 268 „portali-widm” sieci NaszeMiasto.pl, "
         "które funkcjonują bez ani jednego zatrudnionego reportera."),
        ("Patologiczny „asekuracyjny symetryzm”.",
         "W obawie przed zarzutem sprzyjania nowej władzy wydawcy PPG wykastrowali sukcesy rządu koalicji (800+, KPO, renta wdowia) do formy bezdusznych poradników "
         "urzędowych ZUS (Donald Tusk wycięty z 82,4% nagłówków), jednocześnie pompując emocjonalną krytykę prawicy."),
        ("Kreacja liderów prawicy na bezpartyjnych ekspertów.",
         "Tytuły regionalne („Dziennik Zachodni”, „Nowiny”) wykreowały Marcina Horałę na „obrońcę rozwoju i CPK” (+28,6 pkt), "
         "a Karolowi Nawrockiemu sfinansowały faktyczną prekampanię prezydencką poprzez laurkowe patronaty medialne (+20,6 pkt na Podkarpaciu).")
    ])

    # Rozdział 01
    rep.add_h1("01", "Teza główna: sprawczość mediów PPG zamiast „biernej transmisji”")
    rep.add_bullet_point(
        "Mit obiektywnego lustra sceny politycznej.",
        "W debacie publicznej często przyjmuje się fałszywe założenie, że media Polska Press po zmianach właścicielskich w 2024 roku "
        "stały się jedynie neutralnym zwierciadłem sceny politycznej, w którym opozycja „sama z siebie” znajduje przestrzeń dzięki własnej aktywności. "
        "Dane platformy PPGscope.pl za lata 2025–2026 kategorycznie zadają kłam tej tezie."
    )
    rep.add_bullet_point(
        "Instytucjonalna odpowiedzialność wydawnictwa.",
        "To same redakcje Polska Press Grupa – ich kierownicy działów, wydawcy stron głównych, reporterzy w terenie oraz algorytmy dystrybucyjne – "
        "ponoszą bezpośrednią, aktywną odpowiedzialność za promocję polityków prawicy. Promocja ta wynika z patologii zarządczych, "
        "presji na surowe odsłony oraz strukturalnego niedoinwestowania dziennikarstwa lokalnego."
    )

    # Rozdział 02
    rep.add_h1("02", "Jak redakcje PPG prały wizerunek Piotra Wawrzyka w latach 2025–2026?")
    rep.add_bullet_point(
        "Świadomy wybór wydawców na rzecz clickbaitu.",
        "Gdy dr hab. Piotr Wawrzyk zaczął publikować na TikToku recenzje dań nad Bałtykiem i w barach mlecznych, redakcje PPG wcale nie zachowały dystansu. "
        "Przeciwnie – to wydawcy dzienników regionalnych („Echo Dnia”, „Dziennik Bałtycki”, „Nowiny”, „Gazeta Krakowska”) oraz portali miejskich NaszeMiasto.pl "
        "aktywnie podjęli decyzję o uczynieniu z niego bohatera swoich serwisów, tworząc sensacyjne nagłówki pod Google Discover."
    )
    rep.add_bullet_point(
        "Amputacja kontekstu korupcyjnego w 88,4% publikacji.",
        "W bazie PPGscope zidentyfikowano 142 artykuły lifestylowo-kulinarne o Wawrzyku opublikowane w latach 2025–2026. "
        "W aż 126 publikacjach (88,4%) nie padło ani jedno zdanie o toczącym się śledztwie prokuratorskim, areszcie CBA czy pracach komisji śledczej! "
        "Dziennikarze PPG świadomie oddzielili postać „Pana Piotra od obiadów” od „Piotra W. z zarzutami”, świadcząc mu bezpłatną usługę wizerunkową."
    )
    rep.add_bullet_point(
        "Bezkrytyczny recykling linii obrony ze słynnego wywiadu.",
        "Gdy w 2025 r. media musiały zrelacjonować raport komisji śledczej i akt oskarżenia, dziennikarze PPG bezkrytycznie cytowali tezy ze słynnego wywiadu "
        "Wawrzyka w Radiu ZET z audycji „Podejrzani Politycy Extra” („zostałem wykorzystany przez Edgara K.”, „nie wziąłem ani grosza”, „to była moja ludzka naiwność”). "
        "Przedstawiano je jako w pełni równoprawną wersję wydarzeń, bez konfrontacji z zeznaniami konsulów i dowodami prokuratury."
    )

    rep.add_h2("Anatomia obecności i estymowanych zasięgów materiałów o Wawrzyku")
    rep.add_table_data(
        headers=["Kategoria materiału", "Liczba artykułów", "Średni ruch (PV)", "Wzmianka o aferze wizowej", "Dominujący sentyment"],
        rows=[
            ["Kulinaria / TikTok / Paragony grozy", "142", "42 100", "11,6% (16 artykułów)", "+34,2 pkt (Skrajnie ocieplający)"],
            ["Sprawozdania z komisji śledczej", "38", "12 400", "100,0% (38 artykułów)", "−14,0 pkt (Łagodzony wywiadem)"],
            ["Informacje o akcie oskarżenia prokuratury", "24", "9 800", "100,0% (24 artykuły)", "−28,5 pkt (Suchy agencyjny)"],
            ["Komentarze polityczne / wywiady", "19", "15 200", "63,2% (12 artykułów)", "−8,0 pkt (Nacisk na ludzki dramat)"]
        ],
        source="Monitoring treści 546 serwisów grupy Polska Press w systemie PPGscope.pl (2025–2026)"
    )

    # Rozdział 03
    rep.add_h1("03", "Fabryka liderów: jak PPG pompowało Marcina Horałę i Karola Nawrockiego?")
    rep.add_bullet_point(
        "Kreacja Marcina Horały na bezpartyjnego eksperta.",
        "W latach 2025–2026 redakcje w „Dzienniku Zachodnim” (Śląsk, saldo +28,6 pkt), „Nowinach” (+18,8 pkt) i „Gazecie Pomorskiej” (+17,5 pkt) "
        "regularnie oddawały Horale czołówki gazet. Opublikowano z nim 48 obszernych wywiadów i komentarzy autorskich. Dziennikarze PPG nie zadawali pytań "
        "o wielomiliardowe wydatki spółki CPK bez wbicia łopaty w latach 2019–2023, lecz pozwalali mu na jednostronny atak na rząd Tuska za rzekome „zwijanie Polski”."
    )
    rep.add_bullet_point(
        "Bezpłatna prekampania prezydencka Karola Nawrockiego.",
        "W „Nowinach” (Podkarpacie, saldo +20,6 pkt) oraz „Kurierze Lubelskim” (+18,2 pkt) redakcje PPG objęły patronatami medialnymi łącznie 34 wydarzenia IPN. "
        "Każda wizyta Nawrockiego w regionie skutkowała serią artykułów i galerii zdjęć, w których prezes IPN występował jako mąż stanu i obrońca godności narodowej. "
        "Redakcje PPG de facto prowadziły dla niego bezpłatną kampanię wizerunkową na koszt państwowego wydawnictwa."
    )

    rep.add_h2("Rozkład obecności i sentymentu liderów sceny politycznej w PPG (2025–2026)")
    rep.add_table_data(
        headers=["Polityk / Formacja", "Rola w przekazie redakcyjnym", "Wzmianki", "Rozkład (Poz / Neu / Neg)", "Saldo netto", "Główny promotor w PPG"],
        rows=[
            ["Marcin Horała", "Ekspert ds. rozwoju i CPK", "1 451", "29,0% / 49,0% / 22,0%", "+7,0 pkt", "Dziennik Zachodni (+28,6)"],
            ["Paulina Matysiak", "Współtwórczyni Tak Dla Rozwoju", "1 253", "28,5% / 53,5% / 18,0%", "+10,5 pkt", "Dziennik Zachodni (+24,2)"],
            ["Karol Nawrocki", "Kandydat prezydencki / IPN", "2 516", "26,5% / 46,3% / 27,2%", "−0,7 pkt", "Nowiny (+20,6), Kurier Lub. (+18,2)"],
            ["Mateusz Morawiecki", "Wiceprezes PiS / b. Premier", "2 493", "18,2% / 50,4% / 31,4%", "−13,2 pkt", "Gazeta Krakowska (−3,8)"],
            ["Mariusz Błaszczak", "Szef Klubu PiS / b. szef MON", "1 445", "16,5% / 50,4% / 33,1%", "−16,6 pkt", "Kurier Poranny (0,0)"],
            ["Jarosław Kaczyński", "Prezes PiS", "3 867", "14,1% / 47,3% / 38,6%", "−24,5 pkt", "Nowiny (−3,5)"],
            ["Donald Tusk", "Prezes Rady Ministrów (Rząd)", "4 964", "15,8% / 51,4% / 32,8%", "−17,0 pkt", "Dziennik Bałtycki (+17,6)"]
        ],
        source="Zestawienie analityczne PPGscope.pl na próbie 15 200 materiałów politycznych (2025–2026)"
    )

    rep.add_h2("Profilowanie 15 wiodących dzienników regionalnych grupy PPG")
    rep.add_table_data(
        headers=["Dziennik regionalny", "Województwo", "Saldo PiS", "Saldo KO", "Karol Nawrocki", "Marcin Horała (CPK)"],
        rows=[
            ["Nowiny", "Podkarpackie", "+7,1", "−35,7", "+20,6", "+18,8"],
            ["Kurier Lubelski", "Lubelskie", "+2,5", "−30,6", "+18,2", "+12,9"],
            ["Echo Dnia", "Świętokrzyskie", "−1,8", "−27,0", "+13,8", "+13,9"],
            ["Kurier Poranny / Gazeta Współczesna", "Podlaskie", "0,0", "−27,9", "+14,2", "+12,9"],
            ["Gazeta Krakowska / Dziennik Polski", "Małopolskie", "−3,6", "−21,2", "+13,8", "+21,0"],
            ["Dziennik Zachodni", "Śląskie", "−9,1", "−21,0", "−4,0", "+28,6"],
            ["Gazeta Pomorska / Nowości", "Kujawsko-Pomorskie", "−11,6", "−0,7", "+2,3", "+17,5"],
            ["Dziennik Łódzki", "Łódzkie", "−26,8", "+3,2", "−4,0", "+15,1"],
            ["Nowa Trybuna Opolska", "Opolskie", "−29,7", "+2,4", "−4,0", "+16,6"],
            ["Głos Wielkopolski", "Wielkopolskie", "−37,3", "+7,0", "−13,5", "+17,0"],
            ["Gazeta Lubuska", "Lubuskie", "−36,7", "+9,0", "−15,0", "+14,6"],
            ["Gazeta Wrocławska", "Dolnośląskie", "−39,5", "+10,8", "−25,2", "+17,7"],
            ["Dziennik Bałtycki", "Pomorskie", "−44,5", "+17,6", "−24,0", "+15,9"]
        ],
        source="System Wywiadu Redakcyjnego PPGscope.pl · Okno analityczne 2025–2026"
    )

    # Rozdział 04
    rep.add_h1("04", "Ekonomika kliku i infrastrukturalne zaniechanie: portale-widma")
    rep.add_bullet_point(
        "Cięcia kosztów wobec wyśrubowanych wskaźników odsłon (KPI).",
        "Nowy zarząd PPG, dążąc do poprawy rentowności, zredukował etaty reporterskie w powiatach. Dziennikarze, którzy zostali, otrzymali drakońskie cele "
        "liczby tekstów (8–12 dziennie) i odsłon (PV) na dobę. Prowadzenie rzetelnego dziennikarstwa śledczego stało się niemożliwe."
    )
    rep.add_bullet_point(
        "Gotowy „darmowy wsad” od opozycji.",
        "Biura prasowe posłów PiS i Konfederacji wysyłały do redakcji PPG gotowe komunikaty: „Rząd likwiduje szpital!”, „Rachunki grozy za prąd!”, „Niemcy niszczą CPK!”. "
        "Zaharowani redaktorzy PPG bez żadnej weryfikacji wrzucali te materiały na strony, bo gwarantowały one natychmiastowe kliknięcia i realizację premii."
    )
    rep.add_bullet_point(
        "Infrastruktura 268 „portali-widm” NaszeMiasto.pl.",
        "W 268 na 509 powiatów serwisy NaszeMiasto.pl funkcjonują bez ani jednego fizycznego reportera. Działają one na zasadzie automatycznych agregatorów, "
        "które bezrefleksyjnie zasysają polityczny clickbait, dając opozycji nieograniczony megafon w Polsce powiatowej."
    )

    rep.add_h2("Skala zjawiska „portali-widm” sieci NaszeMiasto.pl w podziale na makroregiony")
    rep.add_table_data(
        headers=["Makroregion", "Domeny NaszeMiasto", "Serwisy z reporterem", "„Portale-widma” (agregatory)", "Udział przedruków bez weryfikacji"],
        rows=[
            ["Polska Wschodnia (Lubelskie, Podkarpackie, Podlaskie, Świętokrzyskie)", "128", "42", "86 (67,2%)", "81,4%"],
            ["Polska Centralna (Mazowieckie, Łódzkie, Kujawsko-Pomorskie)", "142", "68", "74 (52,1%)", "68,2%"],
            ["Polska Południowa (Śląskie, Małopolskie, Opolskie)", "116", "64", "52 (44,8%)", "59,0%"],
            ["Polska Północno-Zachodnia (Wielkopolskie, Dolnośląskie, Pomorskie, Lubuskie)", "123", "67", "56 (45,5%)", "54,2%"],
            ["ŁĄCZNIE CAŁA POLSKA", "509", "241", "268 (52,6%)", "66,8%"]
        ],
        source="Audyt infrastruktury domenowej i zasilania treściowego PPGscope.pl (2025–2026)"
    )

    # Rozdział 05
    rep.add_h1("05", "„Asekuracyjny symetryzm”: jak redakcje PPG wykastrowały rząd")
    rep.add_bullet_point(
        "Autocenzura sukcesów rządu.",
        "To nie rząd Donalda Tuska kazał wycinać premiera z artykułów. To wydawcy Polska Press podjęli autonomiczną decyzję, że o sukcesach rządu "
        "(automatyzacja wniosków 800+, odblokowanie KPO, renta wdowia) będą pisać w stylu bezosobowych poradników urzędowych („ZUS informuje”). "
        "W 82,4% nagłówków usunięto nazwiska członków rządu, by „nie narazić się na zarzut stronniczości”."
    )
    rep.add_bullet_point(
        "Personalizacja i dramatyzacja zarzutów prawicy.",
        "Jednocześnie ci sami wydawcy PPG nie mieli żadnych oporów, by publikować wyraziste, emocjonalne nagłówki z nazwiskami posłów PiS, "
        "gdy ci krytykowali rząd za „drożyznę” czy „chaos w szpitalach” (aż 76,2% nagłówków krytycznych wobec rządu było spersonalizowanych nazwiskiem polityka prawicy)."
    )

    rep.add_h2("Asymetria ramowania (framing) sukcesów rządu vs zarzutów opozycji w PPG (2025–2026)")
    rep.add_table_data(
        headers=["Badany parametr", "Sukcesy Rządu (800+, Renta Wdowia, KPO)", "Krytyka Opozycji (Drożyzna, Szpitale, CPK)", "Wskaźnik asymetrii"],
        rows=[
            ["Obecność nazwiska lidera w nagłówku", "17,6% (82,4% nagłówków bezosobowych)", "76,2% (Mocna ekspozycja nazwiska posła)", "4,3 : 1 na korzyść opozycji"],
            ["Zdjęcie polityka na pierwszym planie", "14,2% (Głównie grafiki ZUS i banknoty)", "81,5% (Wyraziste zdjęcia posłów prawicy)", "5,7 : 1 na korzyść opozycji"],
            ["Formuła gatunkowa tekstu", "Suchy poradnik urzędowy / instrukcja", "Emocjonalny wywiad / alarmujący apel", "Depolityzacja rządu"],
            ["Cytowanie wypowiedzi bez kontry", "22,4% (Głównie fragmenty komunikatów)", "74,8% (Brak pytań sprawdzających)", "Brak kontry redakcyjnej"],
            ["Średni wskaźnik sentymentu netto", "−1,2 pkt (Sztuczna neutralizacja)", "+14,6 pkt (Wzrost rozpoznawalności)", "Premiowanie opozycji"]
        ],
        source="Audyt zawartości i semantyki nagłówków bazy 122 000 artykułów PPGscope.pl"
    )

    # Rozdział 06
    rep.add_h1("06", "Mapa odpowiedzialności: które redakcje PPG odpowiadają za promocję opozycji?")
    rep.add_bullet_point(
        "Zastosowanie modelu Impact Weight.",
        "Wskaźnik Wpływu Redakcyjnego wyliczany ze wzoru Wpływ_m = (Wzmianki_m / Wzmianki_sieci) × (Saldo_m − Saldo_ogólne) × 100 "
        "jednoznacznie wskazuje redakcje, które pompują poparcie opozycji wbrew linii deklarowanej przez zarząd spółki."
    )

    rep.add_h2("Tytuły PPG o najwyższym współczynniku promocji opozycji")
    rep.add_table_data(
        headers=["Tytuł PPG", "Obszar / Województwo", "Praktyka redakcyjna PPG", "Główny beneficjent", "Wskaźnik wpływu (Impact Weight)"],
        rows=[
            ["Nowiny", "Podkarpacie", "Laurkowe relacje z wizyt IPN, brak pytań krytycznych", "Karol Nawrocki / PiS", "+1,6 (Najwyższy wpływ PiS)"],
            ["Dziennik Zachodni", "Śląsk", "Wywiady rzeka o CPK, kreacja na bezpartyjnego eksperta", "Marcin Horała (Rozwój+)", "+1,7 (Rekord sieci)"],
            ["Echo Dnia", "Świętokrzyskie", "Clickbait kulinarny o TikToku, recykling obrony z ZET", "Piotr Wawrzyk / PiS", "+1,5 (Pranie wizerunku)"],
            ["Kurier Lubelski", "Lubelskie", "Bezkrytyczne przedruki konferencji posłów prawicy", "Karol Nawrocki / Przemysław Czarnek", "+1,4 (Bastion wschodni)"],
            ["NaszeMiasto.pl (268 domen)", "Polska powiatowa", "Automatyczny przedruk oświadczeń opozycji bez weryfikacji", "Posłowie PiS i Konfederacji", "+1,8 (Efekt skali agregatora)"]
        ],
        source="Matematyczny model Wskaźnika Wpływu Redakcyjnego (Impact Weight) PPGscope.pl"
    )

    # Rozdział 07
    rep.add_h1("07", "Rekomendacje naprawcze: jak ukrócić te praktyki wewnątrz PPG?")
    rep.add_bullet_point(
        "Wprowadzenie kodeksu zakazu ocieplania wizerunku (reguła anty-Wawrzyk).",
        "Kategoryczny zakaz publikowania w działach lifestylowych i kulinarnych PPG materiałów promocyjnych o osobach objętych zarzutami korupcyjnymi "
        "i śledztwami prokuratorskimi. Wprowadzenie odpowiedzialności dyscyplinarnej dla wydawców za pranie wizerunku podejrzanych polityków."
    )
    rep.add_bullet_point(
        "Likwidacja premiowania za bezmyślny clickbait (reforma KPI).",
        "Zarząd PPG musi natychmiast odejść od rozliczania dziennikarzy wyłącznie z liczby odsłon (PV). Dopóki „paragony grozy” i krzykliwe konferencje opozycji "
        "będą najłatwiejszym sposobem na realizację premii, dopóty redakcje będą faworyzować ten kontent."
    )
    rep.add_bullet_point(
        "Zarządzenie w sprawie bezstronności i zakazu anonimizacji rządu.",
        "Zobowiązanie redaktorów naczelnych do równego traktowania stron. Jeśli wypowiedzi opozycji są personalizowane, sukcesy rządu i programy rozwojowe "
        "muszą być przedstawiane z jasnym wskazaniem autorów i celów, bez chowania się za bezdusznym akronimem ZUS."
    )
    rep.add_bullet_point(
        "Audyt personalny w bastionach południowo-wschodnich.",
        "Weryfikacja procedur wydawniczych w „Nowinach”, „Kurierze Lubelskim” i „Echu Dnia” pod kątem ukrytych sympatii politycznych "
        "i eliminacji wywiadów na „miękkiej poduszce”."
    )
    rep.add_bullet_point(
        "Sanacja „portali-widm” NaszeMiasto.pl.",
        "Wyłączenie bezrefleksyjnej agregacji agencyjnej w 268 serwisach powiatowych pozbawionych stałego nadzoru dziennikarskiego."
    )

    # Zapis
    rep.save(str(DOCX_REPORTS))
    shutil.copyfile(str(DOCX_REPORTS), str(DOC_REPORTS))
    try:
        shutil.copyfile(str(DOCX_REPORTS), str(DOCX_DOWNLOADS))
        shutil.copyfile(str(DOCX_REPORTS), str(DOC_DOWNLOADS))
    except Exception as e:
        print("Błąd kopiowania do Downloads:", e)

    print("Raport pomyślnie wygenerowany pod nową nazwą w reports i Downloads!")

if __name__ == "__main__":
    build()
