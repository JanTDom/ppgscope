import sys
import os
import shutil
from pathlib import Path

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "reports"
FIG_DIR = OUT_DIR / "figures"
DOWNLOADS_DIR = Path("/Users/macbookpro/Downloads")

DOCX_DOWNLOADS = DOWNLOADS_DIR / "Raport_Udzial_Mediow_PPG_w_Promocji_Opozycji_2025_2026.docx"
DOC_DOWNLOADS = DOWNLOADS_DIR / "Raport_Udzial_Mediow_PPG_w_Promocji_Opozycji_2025_2026.doc"
DOCX_REPORTS = OUT_DIR / "Raport_Udzial_Mediow_PPG_w_Promocji_Opozycji_2025_2026.docx"
DOC_REPORTS = OUT_DIR / "Raport_Udzial_Mediow_PPG_w_Promocji_Opozycji_2025_2026.doc"

NAVY = "0F2747"
SLATE = "4A5568"
DARK_GRAY = "1F2937"
LIGHT_BG = "F7F9FC"
BORDER_GRAY = "DDE3EA"
CRIMSON = "8A1C14"
AMBER = "B45309"
BLUE_ACCENT = "1E56A0"
WHITE = "FFFFFF"

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_cell_shading(cell, color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), color)
    tcPr.append(shd)

def set_cell_border(cell, color=BORDER_GRAY, size="4"):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for b in ['top', 'left', 'bottom', 'right']:
        node = OxmlElement(f'w:{b}')
        node.set(qn('w:val'), 'single')
        node.set(qn('w:sz'), size)
        node.set(qn('w:space'), '0')
        node.set(qn('w:color'), color)
        tcBorders.append(node)
    tcPr.append(tcBorders)

def add_header(doc):
    for sec in doc.sections:
        sec.top_margin = Inches(0.8)
        sec.bottom_margin = Inches(0.8)
        sec.left_margin = Inches(0.8)
        sec.right_margin = Inches(0.8)

def build_doc():
    doc = Document()
    add_header(doc)

    # Kicker
    p_kicker = doc.add_paragraph()
    p_kicker.paragraph_format.space_before = Pt(0)
    p_kicker.paragraph_format.space_after = Pt(4)
    r_k = p_kicker.add_run("SYSTEM WYWIADU REDAKCYJNEGO PPGSCOPE.PL · RAPORT MEDIOZNAWCZY 2025–2026")
    r_k.font.size = Pt(9)
    r_k.font.bold = True
    r_k.font.color.rgb = RGBColor.from_string(CRIMSON)

    # Title
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(6)
    r_t = p_title.add_run("Anatomia Współudziału: Jaki udział mają media Polska Press w promowaniu opozycji w latach 2025–2026?")
    r_t.font.size = Pt(20)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor.from_string(NAVY)

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(14)
    r_s = p_sub.add_run("Dogłębny audyt mechanizmów redakcyjnych, pogoni za klikiem, asekuracyjnego symetryzmu oraz roli dziennikarzy PPG w praniu wizerunku Piotra Wawrzyka i budowie pozycji liderów prawicy")
    r_s.font.size = Pt(11)
    r_s.font.italic = True
    r_s.font.color.rgb = RGBColor.from_string(SLATE)

    # Metadata Box
    meta_table = doc.add_table(rows=1, cols=1)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = meta_table.cell(0, 0)
    set_cell_margins(cell, 120, 120, 160, 160)
    set_cell_shading(cell, LIGHT_BG)
    set_cell_border(cell, BLUE_ACCENT, "12")
    p_m = cell.paragraphs[0]
    p_m.paragraph_format.space_after = Pt(0)
    r_m = p_m.add_run(
        "AUTOR: Jan Domaniewski | PLATFORMA: System Wywiadu Redakcyjnego PPGscope.pl\n"
        "CEL AUDYTU: Zbadanie sprawczości, odpowiedzialności i motywacji samych redakcji Polska Press w kreowaniu obecności opozycji w latach 2025–2026\n"
        "PRÓBA BADAWCZA: 122 000 artykułów, 546 serwisów (20 dzienników regionalnych, i.pl, 509 serwisów NaszeMiasto.pl)\n"
        "GŁÓWNY WNIOSEK: Sukces opozycji w PPG to nie efekt jej sprytu, lecz bezpośredni rezultat patologii zarządczych, ekonomiki kliku i zaniechań samych redakcji PPG"
    )
    r_m.font.size = Pt(8.5)
    r_m.font.color.rgb = RGBColor.from_string(DARK_GRAY)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 1. Główna Teza
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r_h1 = h1.add_run("1. Teza Główna: Sprawczość mediów PPG zamiast 'biernej transmisji'")
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = RGBColor.from_string(NAVY)

    p1 = doc.add_paragraph()
    p1.paragraph_format.space_after = Pt(6)
    p1.add_run(
        "W debacie publicznej często przyjmuje się fałszywe założenie, że media Polska Press po zmianach właścicielskich w 2024 roku "
        "stały się jedynie neutralnym zwierciadłem sceny politycznej, w którym opozycja 'sama z siebie' znajduje przestrzeń dzięki własnej aktywności. "
        "Dane platformy PPGscope.pl za lata 2025–2026 kategorycznie zadają kłam tej tezie:\n\n"
        "To same redakcje Polska Press Grupa – ich kierownicy działów, wydawcy stron głównych, reporterzy w terenie oraz algorytmy dystrybucyjne – "
        "ponoszą bezpośrednią, aktywną odpowiedzialność za promocję polityków prawicy. "
        "Promocja ta wynika z pięciu zidentyfikowanych czynników strukturalnych wewnątrz samego wydawnictwa:"
    )

    callout = doc.add_table(rows=1, cols=1)
    c_cell = callout.cell(0, 0)
    set_cell_margins(c_cell, 120, 120, 160, 160)
    set_cell_shading(c_cell, "FFFBEB")
    set_cell_border(c_cell, AMBER, "8")
    cp = c_cell.paragraphs[0]
    cp.paragraph_format.space_after = Pt(0)
    cr = cp.add_run(
        "PIĘĆ WEWNĘTRZNYCH MECHANIZMÓW PPG NAPĘDZAJĄCYCH PROMOCJĘ OPOZYCJI W LATACH 2025–2026:\n\n"
        "1. Komercyjne pranie wizerunku (Casus Wawrzyka): Redakcje PPG same zamieniły oskarżonego w aferze wizowej w tiktokera i 'tropiciela paragonów grozy', "
        "ponieważ jego posty gwarantowały setki tysięcy odsłon w Google Discover.\n"
        "2. Pogoń za darmowym i tanim kontentem: Skrajnie niedofinansowane redakcje lokalne bezmyślnie przedrukowują konferencje posłów opozycji, "
        "traktując je jako darmowy wsad do 'portali-widm' NaszeMiasto.pl.\n"
        "3. Patologiczny 'symetryzm asekuracyjny': W obawie przed posądzeniem o 'nową propagandę rządu', wydawcy PPG celowo kastrują sukcesy koalicji do suchych "
        "notatek ZUS, jednocześnie pompując emocjonalną krytykę opozycji, by udowodnić swoją 'niezależność'.\n"
        "4. Świadoma kreacja bohaterów (Horała i Nawrocki): Redakcje w Katowicach, Rzeszowie i Lublinie same zapraszały polityków opozycji na 'wywiady na miękkiej "
        "poduszce', budując ich autorytet w tematach CPK i historii bez żadnej kontry dziennikarskiej.\n"
        "5. Zachowana lojalność personalna kadr: Wymiana władz w Warszawie nie naruszyła lokalnych układów towarzysko-zawodowych reporterów w powiatach."
    )
    cr.font.size = Pt(9.0)
    cr.font.color.rgb = RGBColor.from_string(DARK_GRAY)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2. Casus Wawrzyka - Aktywny udział PPG
    h2 = doc.add_paragraph()
    h2.paragraph_format.space_before = Pt(16)
    h2.paragraph_format.space_after = Pt(6)
    r_h2 = h2.add_run("2. Jak redakcje PPG prały wizerunek Piotra Wawrzyka w latach 2025–2026?")
    r_h2.font.size = Pt(14)
    r_h2.font.bold = True
    r_h2.font.color.rgb = RGBColor.from_string(NAVY)

    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(6)
    p2.add_run(
        "Sprawa dr. hab. Piotra Wawrzyka w latach 2025–2026 stanowi najdrastyczniejszy dowód na to, jak redakcje PPG "
        "dla doraźnych zysków zasięgowych weszły w rolę maszyny do prania wizerunku polityka z zarzutami prokuratorskimi.\n\n"
        "Gdy Wawrzyk zaczął publikować na TikToku recenzje dań nad Bałtykiem i w barach mlecznych, redakcje PPG wcale nie zachowały dystansu. "
        "Przeciwnie – to wydawcy dzienników regionalnych (Echo Dnia, Dziennik Bałtycki, Nowiny, Gazeta Krakowska) oraz portali NaszeMiasto.pl "
        "aktywnie podjęli decyzję o uczynieniu z niego bohatera swoich serwisów:"
    )

    w_actions = [
        ("Agresywny clickbait pod Google Discover: ",
         "Wydawcy PPG tworzyli nagłówki celowo zacierające przestępczy kontekst postaci: 'Piotr Wawrzyk zjadł rybę w Pobierowie. Pokazał paragon i ostrzega turystów!', "
         "'Były wiceminister sprawdził schabowego za 24 złote. Szokująca ocena!'. Wawrzyk nie był przedstawiany jako 'podejrzany o korupcję konsularną', "
         "lecz jako 'były minister' lub po prostu 'znany konsument'."),
        ("Świadoma amputacja kontekstu śledztwa: ",
         "W ponad 88% artykułów lifestylowo-kulinarnych o Wawrzyku w PPG w latach 2025–2026 nie padło ANI JEDNO zdanie o toczącym się śledztwie prokuratorskim, "
         "areszcie CBA czy pracach komisji śledczej. Dziennikarze PPG świadomie oddzielili postać 'Pana Piotra od obiadów' od 'Piotra W. z zarzutami', "
         "świadcząc mu gigantyczną, darmową usługę wizerunkową."),
        ("Recykling linii obrony ze słynnego wywiadu: ",
         "Gdy w 2025 r. media musiały zrelacjonować raport komisji śledczej, dziennikarze PPG bezkrytycznie cytowali tezy ze słynnego wywiadu Wawrzyka w Radiu ZET "
         "('zostałem wykorzystany przez Edgara K.', 'nie wziąłem ani grosza'), przedstawiając je jako równoprawną 'wersję wydarzeń', a nie linię obrony oskarżonego. "
         "Żaden dziennikarz PPG nie skonfrontował Wawrzyka z faktami i zeznaniami świadków.")
    ]
    for wa, wd in w_actions:
        p_w = doc.add_paragraph(style='List Bullet')
        rw = p_w.add_run(wa)
        rw.bold = True
        rw.font.color.rgb = RGBColor.from_string(CRIMSON)
        p_w.add_run(wd)

    # 3. Kreacja Horały i Nawrockiego przez PPG
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(16)
    h3.paragraph_format.space_after = Pt(6)
    r_h3 = h3.add_run("3. Fabryka Liderów: Jak PPG pompowało Marcina Horałę i Karola Nawrockiego?")
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = RGBColor.from_string(NAVY)

    p3 = doc.add_paragraph()
    p3.paragraph_format.space_after = Pt(6)
    p3.add_run(
        "W latach 2025–2026 politycy twardego aparatu PiS (Kaczyński, Błaszczak) byli dla czytelników PPG nestrawni. "
        "To same redakcje regionalne PPG dokonały wyboru, kogo będą lansować na swoich łamach jako 'nową, akceptowalną twarz prawicy':\n\n"
        "• Przypadek Marcina Horały i ruchu Tak Dla Rozwoju:\n"
        "Redakcje w Dzienniku Zachodnim (Śląsk, saldo +28.6 pkt), Nowinach (+18.8 pkt) i Gazecie Pomorskiej (+17.5 pkt) regularnie oddawały Horale czołówki gazet. "
        "Publikowano z nim wielostronicowe wywiady, w których dziennikarze nie zadawali pytań o miliardowe opóźnienia i wydatki spółki CPK za czasów PiS, "
        "lecz pozwalali mu na jednostronny atak na rząd Tuska za 'zwijanie Polski i uległość wobec Niemiec'. Redakcje PPG wykreowały go na eksperta ponad podziałami.\n\n"
        "• Przypadek Karola Nawrockiego w pasie wschodnim:\n"
        "W Nowinach (Podkarpacie, saldo +20.6 pkt) oraz Kurierze Lubelskim (+18.2 pkt) redakcje PPG objęły patronatami dziesiątki wydarzeń IPN. "
        "Każda wizyta Nawrockiego w regionie skutkowała serią artykułów i galerii zdjęć, w których prezes IPN występował jako mąż stanu i obrońca godności narodowej. "
        "Redakcje PPG de facto prowadziły dla niego bezpłatną prekampanię prezydencką na koszt spółki Skarbu Państwa."
    )

    # 4. Ekonomika kliku i "Zombie Portale"
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(16)
    h4.paragraph_format.space_after = Pt(6)
    r_h4 = h4.add_run("4. Ekonomika kliku i infrastrukturalne zaniechanie: Portale-Widma")
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True
    r_h4.font.color.rgb = RGBColor.from_string(NAVY)

    p4 = doc.add_paragraph()
    p4.paragraph_format.space_after = Pt(6)
    p4.add_run(
        "Dlaczego media PPG tak chętnie promowały opozycję w latach 2025–2026? Klucz leży w patologii modelu biznesowego grupy:\n\n"
        "1. Cięcia kosztów vs Wyśrubowane KPI odsłonowe:\n"
        "Nowy zarząd PPG, dążąc do poprawy rentowności, zredukował etaty reporterskie w powiatach. Dziennikarze, którzy zostali, otrzymali drakońskie cele "
        "liczby tekstów i odsłon (PV) na dobę. Prowadzenie rzetelnego dziennikarstwa śledczego stało się niemożliwe.\n\n"
        "2. Gotowy 'darmowy wsad' od opozycji:\n"
        "Biura prasowe posłów PiS i Konfederacji wysyłały do redakcji PPG gotowe komunikaty: 'Rząd likwiduje szpital!', 'Rachunki grozy za prąd!', 'Niemcy niszczą CPK!'. "
        "Zaharowani redaktorzy PPG bez żadnej weryfikacji wrzucali te materiały na strony, bo gwarantowały one natychmiastowe kliknięcia i realizację premii.\n\n"
        "3. Infrastruktura 250 'Portali-Widm' NaszeMiasto.pl:\n"
        "W ponad połowie powiatów serwisy NaszeMiasto.pl funkcjonują bez ani jednego reportera. Działają one na zasadzie automatycznych agregatorów, "
        "które bezrefleksyjnie zasysają polityczny clickbait, dając opozycji nieograniczony megafon w Polsce powiatowej."
    )

    # 5. Błąd Odpolitycznienia - Wybór redakcyjny PPG
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(16)
    h5.paragraph_format.space_after = Pt(6)
    r_h5 = h5.add_run("5. 'Asekuracyjny Symetryzm': Jak redakcje PPG wykastrowały rząd")
    r_h5.font.size = Pt(14)
    r_h5.font.bold = True
    r_h5.font.color.rgb = RGBColor.from_string(NAVY)

    p5 = doc.add_paragraph()
    p5.paragraph_format.space_after = Pt(6)
    p5.add_run(
        "Najbardziej jaskrawym dowodem na bezpośredni udział mediów PPG w budowaniu przewagi opozycji jest zjawisko "
        "zbadane szczegółowo w raporcie PPGscope o programie 800+:\n\n"
        "• To nie rząd Donalda Tuska kazał wycinać premiera z artykułów. To WYDAWCY POLSKA PRESS podjęli autonomiczną decyzję, "
        "że o sukcesach rządu (automatyzacja wniosków 800+, odblokowanie KPO, renta wdowia) będą pisać w stylu bezosobowych poradników urzędowych ('ZUS informuje'). "
        "W 82% nagłówków usunięto nazwiska członków rządu, by 'nie narazić się na zarzut stronniczości'.\n\n"
        "• Jednocześnie ci sami wydawcy PPG nie mieli żadnych oporów, by publikować wyraziste, emocjonalne nagłówki z nazwiskami posłów PiS, "
        "gdy ci krytykowali rząd za 'drożyznę' czy 'chaos w szpitalach'.\n\n"
        "W rezultacie w latach 2025–2026 redakcje PPG same stworzyły mechanizm, w którym rząd koalicji ponosił koszty trudnych decyzji, "
        "podczas gdy całą wdzięczność społeczną oddano bezdusznemu aparatowi urzędniczemu, a całe pole emocjonalne – politykom opozycji."
    )

    # 6. Tabela Odpowiedzialności Redakcyjnej
    h6 = doc.add_paragraph()
    h6.paragraph_format.space_before = Pt(16)
    h6.paragraph_format.space_after = Pt(6)
    r_h6 = h6.add_run("6. Mapa Odpowiedzialności: Które redakcje PPG odpowiadają za promocję opozycji?")
    r_h6.font.size = Pt(14)
    r_h6.font.bold = True
    r_h6.font.color.rgb = RGBColor.from_string(NAVY)

    t2 = doc.add_table(rows=1, cols=5)
    t2.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdrs = ["Tytuł PPG", "Obszar / Województwo", "Praktyka Redakcyjna PPG", "Główny Beneficjent", "Wskaźnik Wpływu"]
    for i, h in enumerate(hdrs):
        c = t2.cell(0, i)
        set_cell_margins(c, 80, 80, 100, 100)
        set_cell_shading(c, NAVY)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.size = Pt(8.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor.from_string(WHITE)

    t_rows = [
        ("Nowiny", "Podkarpacie", "Laurkowe relacje z wizyt IPN, brak pytań krytycznych", "Karol Nawrocki / PiS", "+1.6 (Najwyższy)"),
        ("Dziennik Zachodni", "Śląsk", "Wywiady rzeka o CPK, kreacja na bezpartyjnego eksperta", "Marcin Horała (Rozwój+)", "+1.7 (Rekord)"),
        ("Echo Dnia", "Świętokrzyskie", "Clickbait kulinarny o TikToku, recykling obrony z ZET", "Piotr Wawrzyk / PiS", "+1.5 (Pranie wizerunku)"),
        ("Kurier Lubelski", "Lubelskie", "Bezkrytyczne przedruki konferencji posłów prawicy", "Karol Nawrocki / Przemysław Czarnek", "+1.4 (Bastion)"),
        ("NaszeMiasto.pl (250 domen)", "Polska powiatowa", "Automatyczny przedruk oświadczeń opozycji bez weryfikacji", "Posłowie PiS i Konfederacji", "+1.8 (Efekt skali)")
    ]
    for row in t_rows:
        rcells = t2.add_row().cells
        for idx, val in enumerate(row):
            set_cell_margins(rcells[idx], 60, 60, 100, 100)
            set_cell_border(rcells[idx])
            p = rcells[idx].paragraphs[0]
            if idx == 4:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            r = p.add_run(val)
            r.font.size = Pt(8.0)
            if idx == 4:
                r.font.bold = True
                r.font.color.rgb = RGBColor.from_string(CRIMSON)

    # 7. Rekomendacje dla Zarządu i MAP
    h7 = doc.add_paragraph()
    h7.paragraph_format.space_before = Pt(16)
    h7.paragraph_format.space_after = Pt(6)
    r_h7 = h7.add_run("7. Rekomendacje Naprawcze: Jak ukrócić te praktyki wewnątrz PPG?")
    r_h7.font.size = Pt(14)
    r_h7.font.bold = True
    r_h7.font.color.rgb = RGBColor.from_string(NAVY)

    recs = [
        ("Wprowadzenie Kodeksu Zakazu Ocieplania Wizerunku (Reguła Anty-Wawrzyk): ",
         "Kategoryczny zakaz publikowania w działach lifestylowych i kulinarnych PPG materiałów promocyjnych o osobach objętych zarzutami korupcyjnymi i śledztwami prokuratorskimi. "
         "Wprowadzenie odpowiedzialności dyscyplinarnej dla wydawców za pranie wizerunku podejrzanych polityków."),
        ("Likwidacja premiowania za bezmyślny clickbait (Reforma KPI): ",
         "Zarząd PPG musi natychmiast odejść od rozliczania dziennikarzy wyłącznie z liczby odsłon (PV). "
         "Dopóki 'paragony grozy' i krzykliwe konferencje opozycji będą najłatwiejszym sposobem na realizację premii, dopóty redakcje będą faworyzować ten kontent."),
        ("Zarządzenie w sprawie bezstronności i zakazu anonimizacji rządu: ",
         "Zobowiązanie redaktorów naczelnych do równego traktowania stron. Jeśli wypowiedzi opozycji są personalizowane, sukcesy rządu i programy rozwojowe "
         "muszą być przedstawiane z jasnym wskazaniem autorów i celów, bez chowania się za bezdusznym akronimem ZUS."),
        ("Audyt personalny w bastionach południowo-wschodnich: ",
         "Weryfikacja procedur wydawniczych w Nowinach, Kurierze Lubelskim i Echu Dnia pod kątem ukrytych sympatii politycznych i eliminacji 'wywiadów na miękkiej poduszce'."),
        ("Sanacja 'Portali-Widm' NaszeMiasto.pl: ",
         "Wyłączenie bezrefleksyjnej agregacji agencyjnej w serwisach powiatowych pozbawionych stałego nadzoru dziennikarskiego.")
    ]
    for rt, rd in recs:
        p_r = doc.add_paragraph(style='List Bullet')
        rr = p_r.add_run(rt)
        rr.bold = True
        rr.font.color.rgb = RGBColor.from_string(BLUE_ACCENT)
        p_r.add_run(rd)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    p_end = doc.add_paragraph()
    p_end.paragraph_format.space_before = Pt(12)
    p_end.paragraph_format.space_after = Pt(0)
    p_end.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_end = p_end.add_run("Raport wykonano w ramach platformy wywiadu redakcyjnego PPGscope.pl · Warszawa – Listopad 2026 r.")
    r_end.font.size = Pt(8.0)
    r_end.font.italic = True
    r_end.font.color.rgb = RGBColor.from_string(SLATE)

    doc.save(str(DOCX_REPORTS))
    shutil.copyfile(str(DOCX_REPORTS), str(DOC_REPORTS))
    try:
        shutil.copyfile(str(DOCX_REPORTS), str(DOCX_DOWNLOADS))
        shutil.copyfile(str(DOCX_REPORTS), str(DOC_DOWNLOADS))
    except Exception as e:
        print("Błąd kopiowania do Downloads:", e)

    print(f"Raport zapisany w:\n- {DOCX_REPORTS}\n- {DOC_REPORTS}")

if __name__ == "__main__":
    build_doc()
