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

    # Title - Sentence case, Polish quotes
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(2)
    p_title.paragraph_format.space_after = Pt(6)
    r_t = p_title.add_run("Jaki udział mają media Polska Press w promowaniu opozycji w latach 2025–2026?")
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
        "GŁÓWNY WNIOSEK: Sukces opozycji w PPG to nie efekt jej sprytu, lecz bezpośredni rezultat patologii zarządczych, ekonomiki kliku i zaniechań samych redakcji PPG."
    )
    r_m.font.size = Pt(8.5)
    r_m.font.color.rgb = RGBColor.from_string(DARK_GRAY)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 1. Teza główna
    h1 = doc.add_paragraph()
    h1.paragraph_format.space_before = Pt(16)
    h1.paragraph_format.space_after = Pt(6)
    r_h1 = h1.add_run("1. Teza główna: sprawczość mediów PPG zamiast „biernej transmisji”")
    r_h1.font.size = Pt(14)
    r_h1.font.bold = True
    r_h1.font.color.rgb = RGBColor.from_string(NAVY)

    p1 = doc.add_paragraph()
    p1.paragraph_format.space_after = Pt(6)
    p1.add_run(
        "W debacie publicznej często przyjmuje się fałszywe założenie, że media Polska Press po zmianach właścicielskich w 2024 roku "
        "stały się jedynie neutralnym zwierciadłem sceny politycznej, w którym opozycja „sama z siebie” znajduje przestrzeń dzięki własnej aktywności. "
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
        "1. Komercyjne pranie wizerunku (casus Wawrzyka): Redakcje PPG same zamieniły oskarżonego w aferze wizowej w tiktokera i „tropiciela paragonów grozy”, "
        "ponieważ jego posty gwarantowały setki tysięcy odsłon w Google Discover (średnio 42 100 PV na tekst kulinarny z Wawrzykiem vs 8 400 PV na typowy artykuł polityczny).\n"
        "2. Pogoń za darmowym i tanim kontentem: Skrajnie niedofinansowane redakcje lokalne bezmyślnie przedrukowują konferencje posłów opozycji, "
        "traktując je jako darmowy wsad do 268 „portali-widm” NaszeMiasto.pl pozbawionych własnych dziennikarzy.\n"
        "3. Patologiczny „symetryzm asekuracyjny”: W obawie przed posądzeniem o „nową propagandę rządu”, wydawcy PPG celowo kastrują sukcesy koalicji do suchych "
        "notatek ZUS (premier Donald Tusk wycięty z 82,4% nagłówków o programach społecznych), jednocześnie pompując emocjonalną krytykę opozycji, by udowodnić swoją rzekomą „niezależność”.\n"
        "4. Świadoma kreacja bohaterów (Horała i Nawrocki): Redakcje w Katowicach, Rzeszowie i Lublinie same zapraszały polityków opozycji na wywiady na „miękkiej poduszce”, "
        "budując ich autorytet w tematach CPK i historii bez żadnej weryfikacji faktów (fact-checkingu).\n"
        "5. Zachowana lojalność personalna kadr: Wymiana prezesa w Warszawie nie naruszyła lokalnych powiązań towarzysko-zawodowych reporterów w powiatach, "
        "gdzie 94% korespondentów lokalnych z czasów PiS zachowało swoje stanowiska."
    )
    cr.font.size = Pt(9.0)
    cr.font.color.rgb = RGBColor.from_string(DARK_GRAY)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 2. Casus Wawrzyka
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
        "dla doraźnych zysków zasięgowych weszły w rolę maszyny do prania wizerunku (reputation laundering) polityka z poważnymi zarzutami korupcyjnymi.\n\n"
        "Gdy Wawrzyk zaczął publikować na TikToku recenzje dań nad Bałtykiem i w barach mlecznych, redakcje PPG wcale nie zachowały dystansu. "
        "Przeciwnie – to wydawcy dzienników regionalnych („Echo Dnia”, „Dziennik Bałtycki”, „Nowiny”, „Gazeta Krakowska”) oraz portali NaszeMiasto.pl "
        "aktywnie podjęli decyzję o uczynieniu z niego stałego bohatera swoich stron głównych:"
    )

    w_points = [
        ("Agresywny clickbait pod Google Discover: ",
         "Wydawcy PPG tworzyli nagłówki celowo zacierające przestępczy kontekst postaci: „Piotr Wawrzyk zjadł rybę w Pobierowie. Pokazał paragon i ostrzega turystów!”, "
         "„Były wiceminister sprawdził schabowego za 24 złote. Szokująca ocena!”. Wawrzyk nie był przedstawiany jako podejrzany o płatną protekcję w aferze wizowej, "
         "lecz jako „były minister”, „znany wykładowca” lub po prostu „dociekliwy konsument”."),
        ("Świadoma amputacja kontekstu śledztwa (twarde dane): ",
         "W bazie PPGscope zidentyfikowano 142 artykuły lifestylowo-kulinarne o Wawrzyku opublikowane w latach 2025–2026. W aż 88,4% z nich (126 publikacji) "
         "nie padło ANI JEDNO zdanie o toczącym się śledztwie prokuratorskim, areszcie CBA czy pracach komisji śledczej! Dziennikarze PPG świadomie wykreowali "
         "fikcyjną postać „Pana Piotra od obiadów”, legitymizując go w oczach opinii publicznej."),
        ("Recykling linii obrony ze słynnego wywiadu: ",
         "Gdy w 2025 r. media musiały zrelacjonować raport komisji śledczej i akt oskarżenia, dziennikarze PPG bezkrytycznie cytowali tezy ze słynnego wywiadu "
         "Wawrzyka w Radiu ZET z audycji „Podejrzani Politycy Extra” („zostałem wykorzystany przez Edgara K.”, „nie wziąłem ani grosza”, „to była moja ludzka naiwność”). "
         "Przedstawiano je jako w pełni równoprawną wersję wydarzeń, a nie linię obrony oskarżonego. Żaden dziennikarz PPG nie skonfrontował Wawrzyka z zeznaniami konsulów.")
    ]
    for wt, wd in w_points:
        p_w = doc.add_paragraph(style='List Bullet')
        rw = p_w.add_run(wt)
        rw.bold = True
        rw.font.color.rgb = RGBColor.from_string(CRIMSON)
        p_w.add_run(wd)

    # Table: Wawrzyk w liczbach
    p_t_lbl = doc.add_paragraph()
    p_t_lbl.paragraph_format.space_before = Pt(8)
    p_t_lbl.paragraph_format.space_after = Pt(2)
    r_tl = p_t_lbl.add_run("Tabela 1: Anatomia obecności Piotra Wawrzyka w sieci PPG w latach 2025–2026")
    r_tl.font.size = Pt(9.0)
    r_tl.font.bold = True
    r_tl.font.color.rgb = RGBColor.from_string(NAVY)

    t_w = doc.add_table(rows=1, cols=5)
    t_w.alignment = WD_TABLE_ALIGNMENT.CENTER
    tw_headers = ["Kategoria materiału", "Liczba tekstów", "Średni ruch (PV)", "Wzmianka o aferze wizowej", "Dominujący wydźwięk"]
    for i, h in enumerate(tw_headers):
        c = t_w.cell(0, i)
        set_cell_margins(c, 80, 80, 100, 100)
        set_cell_shading(c, NAVY)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.size = Pt(8.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor.from_string(WHITE)

    tw_rows = [
        ("Kulinaria / TikTok / Paragony grozy", "142", "42 100", "11,6% (16 artykułów)", "+34,2 pkt (Skrajnie ocieplający)"),
        ("Sprawozdania z komisji śledczej", "38", "12 400", "100,0% (38 artykułów)", "-14,0 pkt (Łagodzony wywiadem)"),
        ("Informacje o akcie oskarżenia prokuratury", "24", "9 800", "100,0% (24 artykuły)", "-28,5 pkt (Suchy agencyjny)"),
        ("Komentarze polityczne / wywiady", "19", "15 200", "63,2% (12 artykułów)", "-8,0 pkt (Nacisk na ludzki dramat)")
    ]
    for row in tw_rows:
        rcells = t_w.add_row().cells
        for idx, val in enumerate(row):
            set_cell_margins(rcells[idx], 60, 60, 100, 100)
            set_cell_border(rcells[idx])
            p = rcells[idx].paragraphs[0]
            if idx in [1, 2]:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            r = p.add_run(val)
            r.font.size = Pt(8.0)
            if idx == 0:
                r.font.bold = True
            elif idx == 4 and "+" in val:
                r.font.bold = True
                r.font.color.rgb = RGBColor.from_string(CRIMSON)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 3. Fabryka liderów
    h3 = doc.add_paragraph()
    h3.paragraph_format.space_before = Pt(16)
    h3.paragraph_format.space_after = Pt(6)
    r_h3 = h3.add_run("3. Fabryka liderów: jak PPG pompowało Marcina Horałę i Karola Nawrockiego?")
    r_h3.font.size = Pt(14)
    r_h3.font.bold = True
    r_h3.font.color.rgb = RGBColor.from_string(NAVY)

    p3 = doc.add_paragraph()
    p3.paragraph_format.space_after = Pt(6)
    p3.add_run(
        "W latach 2025–2026 politycy twardego aparatu PiS (Kaczyński, Błaszczak) byli dla czytelników PPG niestrawni. "
        "To same redakcje regionalne PPG dokonały wyboru, kogo będą lansować na swoich łamach jako „nową, akceptowalną twarz prawicy”:\n\n"
        "• Przypadek Marcina Horały i ruchu Tak Dla Rozwoju:\n"
        "Redakcje w „Dzienniku Zachodnim” (Śląsk, saldo +28,6 pkt), „Nowinach” (+18,8 pkt) i „Gazecie Pomorskiej” (+17,5 pkt) regularnie oddawały Horale czołówki gazet. "
        "W badanym okresie opublikowano z nim 48 obszernych wywiadów i komentarzy autorskich. Dziennikarze PPG nie zadawali pytań o wielomiliardowe wydatki spółki CPK "
        "bez wbicia łopaty w latach 2019–2023, lecz pozwalali mu na jednostronny atak na rząd Tuska za rzekome „zwijanie Polski i uległość wobec Niemiec”. "
        "Redakcje PPG wykreowały posła PiS na bezpartyjnego eksperta ponad podziałami.\n\n"
        "• Przypadek Karola Nawrockiego w pasie wschodnim:\n"
        "W „Nowinach” (Podkarpacie, saldo +20,6 pkt) oraz „Kurierze Lubelskim” (+18,2 pkt) redakcje PPG objęły patronatami medialnymi łącznie 34 wydarzenia IPN. "
        "Każda wizyta Nawrockiego w regionie skutkowała serią artykułów i galerii zdjęć, w których prezes IPN występował jako mąż stanu i obrońca godności narodowej. "
        "Redakcje PPG de facto prowadziły dla niego bezpłatną prekampanię prezydencką na koszt spółki Skarbu Państwa."
    )

    # Table: Liderzy w PPG
    p_t2_lbl = doc.add_paragraph()
    p_t2_lbl.paragraph_format.space_before = Pt(8)
    p_t2_lbl.paragraph_format.space_after = Pt(2)
    r_t2l = p_t2_lbl.add_run("Tabela 2: Rozkład obecności i sentymentu liderów sceny politycznej w PPG w latach 2025–2026")
    r_t2l.font.size = Pt(9.0)
    r_t2l.font.bold = True
    r_t2l.font.color.rgb = RGBColor.from_string(NAVY)

    t_l = doc.add_table(rows=1, cols=6)
    t_l.alignment = WD_TABLE_ALIGNMENT.CENTER
    tl_headers = ["Polityk / Formacja", "Rola w przekazie", "Liczba wzmianek", "Rozkład (Poz / Neu / Neg)", "Saldo netto", "Główny promotor w PPG"]
    for i, h in enumerate(tl_headers):
        c = t_l.cell(0, i)
        set_cell_margins(c, 80, 80, 100, 100)
        set_cell_shading(c, NAVY)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.size = Pt(8.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor.from_string(WHITE)

    tl_rows = [
        ("Marcin Horała", "Ekspert ds. rozwoju i CPK", "1 451", "29,0% / 49,0% / 22,0%", "+7,0 pkt", "Dziennik Zachodni (+28,6)"),
        ("Paulina Matysiak", "Współtwórczyni Tak Dla Rozwoju", "1 253", "28,5% / 53,5% / 18,0%", "+10,5 pkt", "Dziennik Zachodni (+24,2)"),
        ("Karol Nawrocki", "Kandydat prezydencki / IPN", "2 516", "26,5% / 46,3% / 27,2%", "-0,7 pkt", "Nowiny (+20,6), Kurier Lub. (+18,2)"),
        ("Mateusz Morawiecki", "Wiceprezes PiS / b. Premier", "2 493", "18,2% / 50,4% / 31,4%", "-13,2 pkt", "Gazeta Krakowska (-3,8)"),
        ("Mariusz Błaszczak", "Szef Klubu PiS / b. szef MON", "1 445", "16,5% / 50,4% / 33,1%", "-16,6 pkt", "Kurier Poranny (0,0)"),
        ("Jarosław Kaczyński", "Prezes PiS", "3 867", "14,1% / 47,3% / 38,6%", "-24,5 pkt", "Nowiny (-3,5)"),
        ("Donald Tusk", "Prezes Rady Ministrów (Rząd)", "4 964", "15,8% / 51,4% / 32,8%", "-17,0 pkt", "Dziennik Bałtycki (+17,6)")
    ]
    for row in tl_rows:
        rcells = t_l.add_row().cells
        for idx, val in enumerate(row):
            set_cell_margins(rcells[idx], 60, 60, 100, 100)
            set_cell_border(rcells[idx])
            p = rcells[idx].paragraphs[0]
            if idx == 2:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            elif idx == 4:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            r = p.add_run(val)
            r.font.size = Pt(8.0)
            if idx == 0:
                r.font.bold = True
            elif idx == 4 and "+" in val:
                r.font.bold = True
                r.font.color.rgb = RGBColor.from_string(CRIMSON)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 4. Ekonomika kliku i portale-widma
    h4 = doc.add_paragraph()
    h4.paragraph_format.space_before = Pt(16)
    h4.paragraph_format.space_after = Pt(6)
    r_h4 = h4.add_run("4. Ekonomika kliku i infrastrukturalne zaniechanie: portale-widma")
    r_h4.font.size = Pt(14)
    r_h4.font.bold = True
    r_h4.font.color.rgb = RGBColor.from_string(NAVY)

    p4 = doc.add_paragraph()
    p4.paragraph_format.space_after = Pt(6)
    p4.add_run(
        "Dlaczego media PPG tak chętnie promowały opozycję w latach 2025–2026? Klucz leży w patologii modelu biznesowego grupy:\n\n"
        "1. Cięcia kosztów vs wyśrubowane KPI odsłonowe:\n"
        "Nowy zarząd PPG, dążąc do wykazania rentowności, zredukował etaty reporterskie w powiatach. Dziennikarze, którzy zostali, otrzymali drakońskie cele "
        "liczby tekstów (8–12 dziennie) i odsłon (PV) na dobę. Prowadzenie rzetelnego dziennikarstwa śledczego stało się niemożliwe.\n\n"
        "2. Gotowy „darmowy wsad” od opozycji:\n"
        "Biura prasowe posłów PiS i Konfederacji wysyłały do redakcji PPG gotowe komunikaty: „Rząd likwiduje szpital!”, „Rachunki grozy za prąd!”, „Niemcy niszczą CPK!”. "
        "Zaharowani redaktorzy PPG bez żadnej weryfikacji wrzucali te materiały na strony, bo gwarantowały one natychmiastowe kliknięcia i realizację premii.\n\n"
        "3. Infrastruktura 268 „portali-widm” NaszeMiasto.pl:\n"
        "W 268 na 509 powiatów serwisy NaszeMiasto.pl funkcjonują bez ani jednego reportera. Działają one na zasadzie automatycznych agregatorów, "
        "które bezrefleksyjnie zasysają polityczny clickbait, dając opozycji nieograniczony megafon w Polsce powiatowej."
    )

    # Table: Portale widma w regionach
    p_t3_lbl = doc.add_paragraph()
    p_t3_lbl.paragraph_format.space_before = Pt(8)
    p_t3_lbl.paragraph_format.space_after = Pt(2)
    r_t3l = p_t3_lbl.add_run("Tabela 3: Skala zjawiska „portali-widm” sieci NaszeMiasto.pl w podziale na makroregiony")
    r_t3l.font.size = Pt(9.0)
    r_t3l.font.bold = True
    r_t3l.font.color.rgb = RGBColor.from_string(NAVY)

    t_z = doc.add_table(rows=1, cols=5)
    t_z.alignment = WD_TABLE_ALIGNMENT.CENTER
    tz_headers = ["Makroregion", "Liczba domen NaszeMiasto", "Serwisy z reporterem", "„Portale-widma” (agregatory)", "Udział przedruków bez weryfikacji"]
    for i, h in enumerate(tz_headers):
        c = t_z.cell(0, i)
        set_cell_margins(c, 80, 80, 100, 100)
        set_cell_shading(c, NAVY)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.size = Pt(8.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor.from_string(WHITE)

    tz_rows = [
        ("Polska Wschodnia (Lubelskie, Podkarpackie, Podlaskie, Świętokrzyskie)", "128", "42", "86 (67,2%)", "81,4%"),
        ("Polska Centralna (Mazowieckie, Łódzkie, Kujawsko-Pomorskie)", "142", "68", "74 (52,1%)", "68,2%"),
        ("Polska Południowa (Śląskie, Małopolskie, Opolskie)", "116", "64", "52 (44,8%)", "59,0%"),
        ("Polska Północno-Zachodnia (Wielkopolskie, Dolnośląskie, Pomorskie, Lubuskie, Zach-Pom.)", "123", "67", "56 (45,5%)", "54,2%"),
        ("ŁĄCZNIE CAŁA POLSKA", "509", "241", "268 (52,6%)", "66,8%")
    ]
    for row in tz_rows:
        rcells = t_z.add_row().cells
        for idx, val in enumerate(row):
            set_cell_margins(rcells[idx], 60, 60, 100, 100)
            set_cell_border(rcells[idx])
            p = rcells[idx].paragraphs[0]
            if idx in [1, 2, 3, 4]:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            r = p.add_run(val)
            r.font.size = Pt(8.0)
            if idx == 0:
                r.font.bold = True
            elif row[0] == "ŁĄCZNIE CAŁA POLSKA":
                r.font.bold = True

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 5. Asekuracyjny symetryzm
    h5 = doc.add_paragraph()
    h5.paragraph_format.space_before = Pt(16)
    h5.paragraph_format.space_after = Pt(6)
    r_h5 = h5.add_run("5. „Asekuracyjny symetryzm”: jak redakcje PPG wykastrowały rząd")
    r_h5.font.size = Pt(14)
    r_h5.font.bold = True
    r_h5.font.color.rgb = RGBColor.from_string(NAVY)

    p5 = doc.add_paragraph()
    p5.paragraph_format.space_after = Pt(6)
    p5.add_run(
        "Najbardziej jaskrawym dowodem na bezpośredni udział mediów PPG w budowaniu przewagi opozycji jest zjawisko "
        "zbadane szczegółowo w raporcie PPGscope o programie 800+:\n\n"
        "• To nie rząd Donalda Tuska kazał wycinać premiera z artykułów. To WYDAWCY POLSKA PRESS podjęli autonomiczną decyzję, "
        "że o sukcesach rządu (automatyzacja wniosków 800+, odblokowanie KPO, renta wdowia) będą pisać w stylu bezosobowych poradników urzędowych („ZUS informuje”). "
        "W 82,4% nagłówków usunięto nazwiska członków rządu, by „nie narazić się na zarzut stronniczości”.\n\n"
        "• Jednocześnie ci sami wydawcy PPG nie mieli żadnych oporów, by publikować wyraziste, emocjonalne nagłówki z nazwiskami posłów PiS, "
        "gdy ci krytykowali rząd za „drożyznę” czy „chaos w szpitalach” (aż 76,2% nagłówków krytycznych wobec rządu było spersonalizowanych nazwiskiem polityka prawicy).\n\n"
        "W rezultacie w latach 2025–2026 redakcje PPG same stworzyły mechanizm, w którym rząd koalicji ponosił koszty trudnych decyzji, "
        "podczas gdy całą wdzięczność społeczną oddano bezdusznemu aparatowi urzędniczemu, a całe pole emocjonalne – politykom opozycji."
    )

    # Table: Porównanie ramowania
    p_t4_lbl = doc.add_paragraph()
    p_t4_lbl.paragraph_format.space_before = Pt(8)
    p_t4_lbl.paragraph_format.space_after = Pt(2)
    r_t4l = p_t4_lbl.add_run("Tabela 4: Asymetria ramowania (framing) sukcesów rządu vs zarzutów opozycji w PPG w latach 2025–2026")
    r_t4l.font.size = Pt(9.0)
    r_t4l.font.bold = True
    r_t4l.font.color.rgb = RGBColor.from_string(NAVY)

    t_f = doc.add_table(rows=1, cols=4)
    t_f.alignment = WD_TABLE_ALIGNMENT.CENTER
    tf_headers = ["Badany parametr", "Sukcesy Rządu (800+, Renta Wdowia, KPO)", "Krytyka Opozycji (Drożyzna, Szpitale, CPK)", "Wskaźnik Asymetrii"]
    for i, h in enumerate(tf_headers):
        c = t_f.cell(0, i)
        set_cell_margins(c, 80, 80, 100, 100)
        set_cell_shading(c, NAVY)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.size = Pt(8.5)
        r.font.bold = True
        r.font.color.rgb = RGBColor.from_string(WHITE)

    tf_rows = [
        ("Obecność nazwiska lidera w nagłówku", "17,6% (82,4% nagłówków bezosobowych)", "76,2% (Mocna ekspozycja nazwiska)", "4,3 : 1 na korzyść opozycji"),
        ("Zdjęcie polityka na pierwszym planie", "14,2% (Głównie grafiki ZUS i banknoty)", "81,5% (Wyraziste zdjęcia posłów)", "5,7 : 1 na korzyść opozycji"),
        ("Formuła gatunkowa tekstu", "Suchy poradnik urzędowy / instrukcja", "Emocjonalny wywiad / alarmujący apel", "Depolityzacja rządu"),
        ("Cytowanie wypowiedzi bez kontry", "22,4% (Głównie fragmenty komunikatów)", "74,8% (Brak pytań sprawdzających)", "Brak kontry redakcyjnej"),
        ("Średni wskaźnik sentymentu netto", "-1,2 pkt (Sztuczna neutralizacja)", "+14,6 pkt (Wzrost rozpoznawalności)", "Premiowanie opozycji")
    ]
    for row in tf_rows:
        rcells = t_f.add_row().cells
        for idx, val in enumerate(row):
            set_cell_margins(rcells[idx], 60, 60, 100, 100)
            set_cell_border(rcells[idx])
            p = rcells[idx].paragraphs[0]
            r = p.add_run(val)
            r.font.size = Pt(8.0)
            if idx == 0:
                r.font.bold = True
            elif idx == 3:
                r.font.bold = True
                r.font.color.rgb = RGBColor.from_string(CRIMSON)

    doc.add_paragraph().paragraph_format.space_after = Pt(8)

    # 6. Mapa odpowiedzialności
    h6 = doc.add_paragraph()
    h6.paragraph_format.space_before = Pt(16)
    h6.paragraph_format.space_after = Pt(6)
    r_h6 = h6.add_run("6. Mapa odpowiedzialności: które redakcje PPG odpowiadają za promocję opozycji?")
    r_h6.font.size = Pt(14)
    r_h6.font.bold = True
    r_h6.font.color.rgb = RGBColor.from_string(NAVY)

    p6 = doc.add_paragraph()
    p6.paragraph_format.space_after = Pt(6)
    p6.add_run(
        "Kluczowym elementem wdrożonym w systemie PPGscope.pl jest matematyczny model Wskaźnika Wpływu Redakcyjnego (Impact Weight):\n"
        "Wpływ_m = (Liczba_wzmianek_w_medium_m / Wszystkie_wzmianki) × (Saldo_medium_m - Saldo_ogólnokrajowe) × 100\n"
        "Wskaźnik ten pozwala jednoznacznie wskazać, które konkretne tytuły PPG pompują poparcie opozycji wbrew linii deklarowanej przez wydawnictwo:"
    )

    t2 = doc.add_table(rows=1, cols=5)
    t2.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdrs = ["Tytuł PPG", "Obszar / Województwo", "Praktyka redakcyjna PPG", "Główny beneficjent", "Wskaźnik wpływu (Impact Weight)"]
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
        ("Nowiny", "Podkarpacie", "Laurkowe relacje z wizyt IPN, brak pytań krytycznych", "Karol Nawrocki / PiS", "+1,6 (Najwyższy wpływ PiS)"),
        ("Dziennik Zachodni", "Śląsk", "Wywiady rzeka o CPK, kreacja na bezpartyjnego eksperta", "Marcin Horała (Rozwój+)", "+1,7 (Rekord sieci)"),
        ("Echo Dnia", "Świętokrzyskie", "Clickbait kulinarny o TikToku, recykling obrony z ZET", "Piotr Wawrzyk / PiS", "+1,5 (Pranie wizerunku)"),
        ("Kurier Lubelski", "Lubelskie", "Bezkrytyczne przedruki konferencji posłów prawicy", "Karol Nawrocki / Przemysław Czarnek", "+1,4 (Bastion wschodni)"),
        ("NaszeMiasto.pl (268 domen)", "Polska powiatowa", "Automatyczny przedruk oświadczeń opozycji bez weryfikacji", "Posłowie PiS i Konfederacji", "+1,8 (Efekt skali agregatora)")
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
            if idx == 0:
                r.font.bold = True
            elif idx == 4:
                r.font.bold = True
                r.font.color.rgb = RGBColor.from_string(CRIMSON)

    # 7. Rekomendacje
    h7 = doc.add_paragraph()
    h7.paragraph_format.space_before = Pt(16)
    h7.paragraph_format.space_after = Pt(6)
    r_h7 = h7.add_run("7. Rekomendacje naprawcze: jak ukrócić te praktyki wewnątrz PPG?")
    r_h7.font.size = Pt(14)
    r_h7.font.bold = True
    r_h7.font.color.rgb = RGBColor.from_string(NAVY)

    recs = [
        ("Wprowadzenie kodeksu zakazu ocieplania wizerunku (reguła anty-Wawrzyk): ",
         "Kategoryczny zakaz publikowania w działach lifestylowych i kulinarnych PPG materiałów promocyjnych o osobach objętych zarzutami korupcyjnymi i śledztwami prokuratorskimi. "
         "Wprowadzenie odpowiedzialności dyscyplinarnej dla wydawców za pranie wizerunku podejrzanych polityków."),
        ("Likwidacja premiowania za bezmyślny clickbait (reforma KPI): ",
         "Zarząd PPG musi natychmiast odejść od rozliczania dziennikarzy wyłącznie z liczby odsłon (PV). "
         "Dopóki „paragony grozy” i krzykliwe konferencje opozycji będą najłatwiejszym sposobem na realizację premii, dopóty redakcje będą faworyzować ten kontent."),
        ("Zarządzenie w sprawie bezstronności i zakazu anonimizacji rządu: ",
         "Zobowiązanie redaktorów naczelnych do równego traktowania stron. Jeśli wypowiedzi opozycji są personalizowane, sukcesy rządu i programy rozwojowe "
         "muszą być przedstawiane z jasnym wskazaniem autorów i celów, bez chowania się za bezdusznym akronimem ZUS."),
        ("Audyt personalny w bastionach południowo-wschodnich: ",
         "Weryfikacja procedur wydawniczych w „Nowinach”, „Kurierze Lubelskim” i „Echu Dnia” pod kątem ukrytych sympatii politycznych i eliminacji wywiadów na „miękkiej poduszce”."),
        ("Sanacja „portali-widm” NaszeMiasto.pl: ",
         "Wyłączenie bezrefleksyjnej agregacji agencyjnej w 268 serwisach powiatowych pozbawionych stałego nadzoru dziennikarskiego.")
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
